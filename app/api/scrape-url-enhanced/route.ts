import { NextRequest, NextResponse } from 'next/server';

// Function to sanitize smart quotes and other problematic characters
function sanitizeQuotes(text: string): string {
  return text
    // Replace smart single quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    // Replace smart double quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Replace other quote-like characters
    .replace(/[\u00AB\u00BB]/g, '"') // Guillemets
    .replace(/[\u2039\u203A]/g, "'") // Single guillemets
    // Replace other problematic characters
    .replace(/[\u2013\u2014]/g, '-') // En dash and em dash
    .replace(/[\u2026]/g, '...') // Ellipsis
    .replace(/[\u00A0]/g, ' '); // Non-breaking space
}

// Function to clean common user input mistakes in URLs
function cleanUrlInput(input: string): string {
  let cleaned = input.trim();
  
  // Remove common prefixes that users might type
  cleaned = cleaned.replace(/^(clone\s+|copy\s+|visit\s+|go\s+to\s+|open\s+)/i, '');
  
  // Extract URLs from quotes - handle both single and double quotes
  const quotedUrlMatch = cleaned.match(/['"]([^'"]+)['"]/);
  if (quotedUrlMatch) {
    cleaned = quotedUrlMatch[1];
  }
  
  // Remove surrounding whitespace again after extraction
  cleaned = cleaned.trim();
  
  // Remove trailing slashes and common suffixes
  cleaned = cleaned.replace(/\/$/, '');
  
  // Handle "www." prefix normalization
  if (cleaned.startsWith('www.') && !cleaned.includes('://')) {
    // Keep www. prefix for now, will be handled by protocol addition
  }
  
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json();
    console.log('[scrape-url-enhanced] Full request body:', JSON.stringify(reqBody));
    
    const { url } = reqBody;
    
    // More comprehensive URL validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'URL is required and must be a non-empty string',
        debug: {
          receivedUrl: url,
          urlType: typeof url,
          trimmedLength: typeof url === 'string' ? url.trim().length : 0,
          fullBody: reqBody
        }
      }, { status: 400 });
    }

    // Clean and normalize URL with improved handling
    let normalizedUrl = url.trim();
    
    // Log the input for debugging
    console.log('[scrape-url-enhanced] Input URL:', JSON.stringify(url));
    console.log('[scrape-url-enhanced] Trimmed URL:', JSON.stringify(normalizedUrl));
    
    // Clean common user input mistakes
    normalizedUrl = cleanUrlInput(normalizedUrl);
    console.log('[scrape-url-enhanced] Cleaned URL:', JSON.stringify(normalizedUrl));
    
    // Basic validation - check if it's not empty after cleaning
    if (!normalizedUrl || normalizedUrl.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'URL cannot be empty or too short',
        debug: {
          originalInput: url,
          cleanedUrl: normalizedUrl,
          issue: 'URL is empty or too short after cleaning'
        }
      }, { status: 400 });
    }
    
    // Add protocol if missing
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    console.log('[scrape-url-enhanced] Normalized URL:', JSON.stringify(normalizedUrl));

    // Improved URL validation with better error handling
    try {
      const parsedUrl = new URL(normalizedUrl);
      
      // Additional validation - check if it has a valid hostname
      if (!parsedUrl.hostname || parsedUrl.hostname.length < 3) {
        throw new Error('Invalid hostname');
      }
      
      // Check if hostname contains at least one dot (for domain validation)
      if (!parsedUrl.hostname.includes('.') && parsedUrl.hostname !== 'localhost') {
        throw new Error('Invalid domain format');
      }
      
      console.log('[scrape-url-enhanced] URL validation passed:', {
        hostname: parsedUrl.hostname,
        protocol: parsedUrl.protocol,
        href: parsedUrl.href
      });
      
    } catch (error) {
      console.error('[scrape-url-enhanced] URL validation failed:', {
        input: url,
        cleaned: normalizedUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Provide helpful suggestions based on the input
      let suggestion = '';
      if (url.includes('clone') || url.includes('copy')) {
        suggestion = ' (Hint: Just enter the website URL, like "bharatui.com" without extra text)';
      } else if (url.includes("'") || url.includes('"')) {
        suggestion = ' (Hint: Enter the URL without quotes)';
      }
      
      return NextResponse.json({
        success: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown validation error'}${suggestion}`,
        debug: {
          input: url,
          cleaned: normalizedUrl,
          normalized: normalizedUrl,
          validation_error: error instanceof Error ? error.message : 'Unknown error',
          suggestion: suggestion.trim()
        }
      }, { status: 400 });
    }
    
    console.log('[scrape-url-enhanced] Scraping with Firecrawl:', normalizedUrl);
    
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    if (!FIRECRAWL_API_KEY) {
      console.error('[scrape-url-enhanced] FIRECRAWL_API_KEY is not set');
      return NextResponse.json({
        success: false,
        error: 'Firecrawl API key is not configured. Please add FIRECRAWL_API_KEY to your environment variables.'
      }, { status: 500 });
    }
    
    // Make request to Firecrawl API with maxAge for 500% faster scraping
    const firecrawlBody = {
      url: normalizedUrl,
      formats: ['markdown', 'html'],
      waitFor: 3000,
      timeout: 30000,
      blockAds: true,
      maxAge: 3600000, // Use cached data if less than 1 hour old (500% faster!)
      actions: [
        {
          type: 'wait',
          milliseconds: 2000
        }
      ]
    };
    
    console.log('[scrape-url-enhanced] Request body:', JSON.stringify(firecrawlBody, null, 2));
    
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(firecrawlBody)
    });
    
    console.log('[scrape-url-enhanced] Firecrawl response status:', firecrawlResponse.status);
    
    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('[scrape-url-enhanced] Firecrawl API error:', errorText);
      
      // Try to parse error response for better error messages
      let errorMessage = 'Firecrawl API error';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = `Firecrawl API error (${firecrawlResponse.status}): ${errorText}`;
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: firecrawlResponse.status });
    }
    
    const data = await firecrawlResponse.json();
    console.log('[scrape-url-enhanced] Firecrawl response data:', JSON.stringify({
      success: data.success,
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : [],
      contentLength: data.data?.markdown?.length || 0
    }));
    
    if (!data.success) {
      console.error('[scrape-url-enhanced] Firecrawl returned success:false', data);
      return NextResponse.json({
        success: false,
        error: data.error || 'Firecrawl returned success: false'
      }, { status: 400 });
    }
    
    if (!data.data) {
      console.error('[scrape-url-enhanced] No data in Firecrawl response', data);
      return NextResponse.json({
        success: false,
        error: 'No content data returned from Firecrawl'
      }, { status: 400 });
    }
    
    const { markdown, html, metadata } = data.data;
    
    // Sanitize the markdown content
    const sanitizedMarkdown = sanitizeQuotes(markdown || '');
    
    // Extract structured data from the response
    const title = metadata?.title || '';
    const description = metadata?.description || '';
    
    // Format content for AI
    const formattedContent = `
Title: ${sanitizeQuotes(title)}
Description: ${sanitizeQuotes(description)}
URL: ${url}

Main Content:
${sanitizedMarkdown}
    `.trim();
    
    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      content: formattedContent,
      structured: {
        title: sanitizeQuotes(title),
        description: sanitizeQuotes(description),
        content: sanitizedMarkdown,
        url: normalizedUrl
      },
      metadata: {
        scraper: 'lade-coder-enhanced',
        timestamp: new Date().toISOString(),
        contentLength: formattedContent.length,
        cached: data.data.cached || false, // Indicates if data came from cache
        ...metadata
      },
      message: 'URL scraped successfully with Firecrawl (with caching for 500% faster performance)'
    });
    
  } catch (error) {
    console.error('[scrape-url-enhanced] Unexpected error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to scrape website';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : undefined
    }, { status: 500 });
  }
}