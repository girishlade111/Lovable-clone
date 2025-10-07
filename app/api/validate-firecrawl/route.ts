import { NextResponse } from 'next/server';

/**
 * Endpoint to validate Firecrawl API key and service availability
 */
export async function GET() {
  try {
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    
    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'FIRECRAWL_API_KEY not configured',
        details: 'Please add FIRECRAWL_API_KEY to your environment variables'
      }, { status: 500 });
    }
    
    // Test the API key with a simple request
    const testResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://example.com',
        formats: ['markdown'],
        timeout: 10000
      })
    });
    
    const isValid = testResponse.ok;
    const status = testResponse.status;
    
    if (!isValid) {
      const errorText = await testResponse.text();
      let errorMessage = 'Invalid API key or service unavailable';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = `API error (${status}): ${errorText.substring(0, 100)}`;
      }
      
      return NextResponse.json({
        success: false,
        isValid: false,
        status,
        error: errorMessage
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      isValid: true,
      status,
      message: 'Firecrawl API key is valid and service is available'
    });
    
  } catch (error) {
    console.error('[validate-firecrawl] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to validate Firecrawl service',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}