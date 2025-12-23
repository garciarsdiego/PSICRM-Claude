/**
 * Error handling utilities
 * Provides structured error handling and user-friendly error messages
 */

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Map of Supabase error codes to user-friendly messages
 */
const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'invalid_credentials': 'Email ou senha incorretos',
  'email_not_confirmed': 'Por favor, confirme seu email antes de entrar',
  'user_already_exists': 'Este email já está cadastrado',
  'weak_password': 'A senha é muito fraca. Use pelo menos 8 caracteres',
  'invalid_email': 'Email inválido',

  // Database errors
  '23505': 'Este registro já existe', // unique_violation
  '23503': 'Este registro está sendo usado em outro lugar', // foreign_key_violation
  '42501': 'Você não tem permissão para realizar esta ação', // insufficient_privilege
  '42P01': 'Recurso não encontrado', // undefined_table

  // Network errors
  'PGRST301': 'Erro de conexão com o servidor',
  'FetchError': 'Erro de conexão. Verifique sua internet',
};

/**
 * Convert any error to a user-friendly message
 */
export function handleError(error: unknown): string {
  // Handle ApiError
  if (error instanceof ApiError) {
    return error.message;
  }

  // Handle Error with code
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    if (SUPABASE_ERROR_MESSAGES[code]) {
      return SUPABASE_ERROR_MESSAGES[code];
    }
  }

  // Handle Error with message
  if (error instanceof Error) {
    // Check for specific Supabase error patterns
    if (error.message.includes('duplicate key')) {
      return 'Este registro já existe';
    }
    if (error.message.includes('violates foreign key')) {
      return 'Este registro está sendo usado em outro lugar';
    }
    if (error.message.includes('Invalid login credentials')) {
      return 'Email ou senha incorretos';
    }
    if (error.message.includes('already registered')) {
      return 'Este email já está cadastrado';
    }
    if (error.message.includes('JWT expired')) {
      return 'Sua sessão expirou. Por favor, faça login novamente';
    }
    if (error.message.includes('Failed to fetch')) {
      return 'Erro de conexão. Verifique sua internet';
    }

    // Return original message if not too technical
    if (error.message.length < 100 && !error.message.includes('Error')) {
      return error.message;
    }
  }

  // Default message
  return 'Ocorreu um erro inesperado. Tente novamente';
}

/**
 * Log error for monitoring (can be extended to send to Sentry, etc.)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error, context);
  }

  // TODO: Send to error monitoring service
  // Example: Sentry.captureException(error, { extra: context });
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed') ||
      error.message.includes('NetworkError') ||
      error.name === 'FetchError'
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    if ('code' in error) {
      const code = (error as { code: string }).code;
      return ['invalid_credentials', 'JWT expired', 'PGRST401'].includes(code);
    }
    if (error instanceof Error) {
      return (
        error.message.includes('JWT expired') ||
        error.message.includes('Invalid token') ||
        error.message.includes('unauthorized')
      );
    }
  }
  return false;
}
