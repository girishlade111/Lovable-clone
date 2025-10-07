// API Key Validation Utilities
// This file contains utilities for validating API keys and provider availability

export interface ProviderConfig {
  name: string;
  apiKey: string | undefined;
  isValid: boolean;
  models: string[];
}

/**
 * Validates if an API key is properly configured (not undefined or placeholder)
 */
export function isValidApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false;
  
  // Check for common placeholder patterns
  const placeholders = [
    'your_',
    'sk-',
    'api_key',
    'api_key_here',
    'replace_me',
    'placeholder'
  ];
  
  // Valid key should be at least 20 characters and not contain placeholders
  if (apiKey.length < 20) return false;
  
  // Check if it's a placeholder value
  const lowerKey = apiKey.toLowerCase();
  return !placeholders.some(placeholder => lowerKey.includes(placeholder));
}

/**
 * Get available AI providers based on valid API keys
 */
export function getAvailableProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [
    {
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      isValid: isValidApiKey(process.env.GROQ_API_KEY),
      models: ['moonshotai/kimi-k2-instruct']
    },
    {
      name: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      isValid: isValidApiKey(process.env.ANTHROPIC_API_KEY),
      models: ['anthropic/claude-sonnet-4-20250514']
    },
    {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      isValid: isValidApiKey(process.env.OPENAI_API_KEY),
      models: ['openai/gpt-5']
    },
    {
      name: 'google',
      apiKey: process.env.GEMINI_API_KEY,
      isValid: isValidApiKey(process.env.GEMINI_API_KEY),
      models: ['google/gemini-2.5-pro']
    }
  ];
  
  return providers;
}

/**
 * Get all available models from providers with valid API keys
 */
export function getAvailableModels(): string[] {
  const providers = getAvailableProviders();
  const availableModels: string[] = [];
  
  providers.forEach(provider => {
    if (provider.isValid) {
      availableModels.push(...provider.models);
    }
  });
  
  return availableModels;
}

/**
 * Get the first available model (fallback for default)
 */
export function getDefaultModel(): string | null {
  const availableModels = getAvailableModels();
  return availableModels.length > 0 ? availableModels[0] : null;
}

/**
 * Check if a specific model is available
 */
export function isModelAvailable(model: string): boolean {
  const availableModels = getAvailableModels();
  return availableModels.includes(model);
}

/**
 * Get provider name from model string
 */
export function getProviderFromModel(model: string): string {
  if (model.startsWith('anthropic/')) return 'anthropic';
  if (model.startsWith('openai/')) return 'openai';
  if (model.startsWith('google/')) return 'google';
  return 'groq'; // Default to groq for models like 'moonshotai/kimi-k2-instruct'
}

/**
 * Validate that the required provider for a model has a valid API key
 */
export function validateModelProvider(model: string): { isValid: boolean; error?: string } {
  const provider = getProviderFromModel(model);
  const providers = getAvailableProviders();
  const providerConfig = providers.find(p => p.name === provider);
  
  if (!providerConfig) {
    return { isValid: false, error: `Unknown provider for model: ${model}` };
  }
  
  if (!providerConfig.isValid) {
    return { 
      isValid: false, 
      error: `API key for ${provider} is not configured. Please add a valid ${provider.toUpperCase()}_API_KEY to your .env file.` 
    };
  }
  
  return { isValid: true };
}

/**
 * Get validation summary for debugging
 */
export function getValidationSummary(): {
  availableProviders: string[];
  availableModels: string[];
  defaultModel: string | null;
  errors: string[];
} {
  const providers = getAvailableProviders();
  const availableProviders = providers.filter(p => p.isValid).map(p => p.name);
  const availableModels = getAvailableModels();
  const defaultModel = getDefaultModel();
  
  const errors: string[] = [];
  providers.forEach(provider => {
    if (!provider.isValid) {
      errors.push(`${provider.name.toUpperCase()}_API_KEY is not properly configured`);
    }
  });
  
  if (availableProviders.length === 0) {
    errors.push('No AI providers are properly configured. Please add at least one valid API key.');
  }
  
  return {
    availableProviders,
    availableModels,
    defaultModel,
    errors
  };
}