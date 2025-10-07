import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint for debugging scraping issues
 * Usage: POST /api/scrape-test with { \"url\": \"https://example.com\" }
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required for testing'
      }, { status: 400 });
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      inputUrl: url,
      testResults: {} as any
    };

    // Step 1: Check environment variables
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    diagnostics.testResults.apiKeyConfigured = {
      status: !!FIRECRAWL_API_KEY,
      message: FIRECRAWL_API_KEY ? 'API key is configured' : 'FIRECRAWL_API_KEY not found in environment'
    };

    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Cannot test without Firecrawl API key',
        diagnostics
      }, { status: 500 });
    }

    // Step 2: Validate URL format
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\\/\\//i)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
      diagnostics.testResults.urlValidation = {
        status: true,
        normalizedUrl,
        message: 'URL format is valid'
      };
    } catch (error) {
      diagnostics.testResults.urlValidation = {
        status: false,
        message: 'Invalid URL format',
        error: error instanceof Error ? error.message : 'Unknown URL error'
      };
      
      return NextResponse.json({
        success: false,
        error: 'Invalid URL format',
        diagnostics
      }, { status: 400 });
    }

    // Step 3: Test Firecrawl API connectivity
    const startTime = Date.now();
    
    try {
      const testResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: normalizedUrl,
          formats: ['markdown'],
          timeout: 15000,
          waitFor: 1000
        })
      });
      
      const responseTime = Date.now() - startTime;
      const responseData = await testResponse.json();
      
      diagnostics.testResults.firecrawlApi = {
        status: testResponse.ok,
        statusCode: testResponse.status,
        responseTime: `${responseTime}ms`,
        success: responseData.success,
        hasData: !!responseData.data,
        contentLength: responseData.data?.markdown?.length || 0,
        cached: responseData.data?.cached || false
      };
      
      if (!testResponse.ok) {
        diagnostics.testResults.firecrawlApi.error = responseData.error || 'API request failed';
        
        return NextResponse.json({
          success: false,
          error: `Firecrawl API error: ${responseData.error || testResponse.status}`,
          diagnostics
        }, { status: testResponse.status });
      }
      
      if (!responseData.success) {
        diagnostics.testResults.firecrawlApi.error = 'Firecrawl returned success: false';
        
        return NextResponse.json({
          success: false,
          error: 'Firecrawl service reported failure',
          diagnostics
        }, { status: 400 });
      }
      
      if (!responseData.data || !responseData.data.markdown) {
        diagnostics.testResults.firecrawlApi.warning = 'No content returned from scraping';
      }
      
    } catch (error) {
      diagnostics.testResults.firecrawlApi = {
        status: false,
        error: error instanceof Error ? error.message : 'Network error',
        message: 'Failed to connect to Firecrawl API'
      };
      
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Firecrawl API',
        diagnostics
      }, { status: 500 });
    }

    // Step 4: Return successful test results
    return NextResponse.json({
      success: true,
      message: 'All scraping tests passed successfully',
      diagnostics,
      recommendations: [
        'Scraping functionality is working correctly',
        'If you still experience issues, check the specific URL you are trying to scrape',
        'Some websites may have anti-scraping protection or heavy JavaScript that affects content extraction'
      ]
    });
    
  } catch (error) {
    console.error('[scrape-test] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during testing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}"