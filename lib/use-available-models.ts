import { useState, useEffect } from 'react';
import { getAvailableModels, getDefaultModel, isModelAvailable } from './api-validation';

export interface ModelConfig {
  availableModels: string[];
  defaultModel: string;
  isLoading: boolean;
}

/**
 * Hook to get available models with proper client-side validation
 * Prevents hydration mismatches by running validation only on client
 */
export function useAvailableModels(): ModelConfig {
  const [config, setConfig] = useState<ModelConfig>({
    availableModels: [
      'openai/gpt-5',
      'moonshotai/kimi-k2-instruct',
      'anthropic/claude-sonnet-4-20250514', 
      'google/gemini-2.5-pro'
    ],
    defaultModel: 'moonshotai/kimi-k2-instruct',
    isLoading: true
  });

  useEffect(() => {
    // Only run validation on client side to prevent hydration issues
    async function validateModels() {
      try {
        // Fetch validation from our API endpoint
        const response = await fetch('/api/validate-api-keys');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.summary) {
            setConfig({
              availableModels: data.summary.availableModels.length > 0 
                ? data.summary.availableModels 
                : ['moonshotai/kimi-k2-instruct'], // Fallback
              defaultModel: data.summary.defaultModel || 'moonshotai/kimi-k2-instruct',
              isLoading: false
            });
            return;
          }
        }
        
        // Fallback if API call fails
        setConfig(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        console.error('[useAvailableModels] Validation failed:', error);
        // Keep static config on error
        setConfig(prev => ({ ...prev, isLoading: false }));
      }
    }

    validateModels();
  }, []);

  return config;
}

/**
 * Hook to validate if a specific model is available
 */
export function useModelValidation(model: string) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validateModel() {
      try {
        const response = await fetch('/api/validate-api-keys');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.summary) {
            const available = data.summary.availableModels.includes(model);
            setIsValid(available);
            if (!available) {
              setError(`Model ${model} is not available. Please check your API key configuration.`);
            }
          }
        }
      } catch (error) {
        console.error('[useModelValidation] Validation failed:', error);
        setError('Failed to validate model availability');
      }
    }

    if (model) {
      validateModel();
    }
  }, [model]);

  return { isValid, error };
}