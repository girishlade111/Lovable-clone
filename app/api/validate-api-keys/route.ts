import { NextResponse } from 'next/server';
import { getValidationSummary, getAvailableProviders } from '@/lib/api-validation';

export async function GET() {
  try {
    const summary = getValidationSummary();
    const providers = getAvailableProviders();
    
    return NextResponse.json({
      success: true,
      summary,
      providers: providers.map(p => ({
        name: p.name,
        isValid: p.isValid,
        models: p.models,
        hasKey: !!p.apiKey
      }))
    });
  } catch (error) {
    console.error('[validate-api-keys] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate API keys'
    }, { status: 500 });
  }
}