/**
 * Application-wide constants
 * Centralizes magic numbers, status colors, and default values
 */

// Session status
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const SESSION_STATUS_LABELS: Record<string, string> = {
  [SESSION_STATUS.SCHEDULED]: 'Agendada',
  [SESSION_STATUS.COMPLETED]: 'Realizada',
  [SESSION_STATUS.CANCELLED]: 'Cancelada',
  [SESSION_STATUS.NO_SHOW]: 'Faltou',
};

export const SESSION_STATUS_COLORS: Record<string, string> = {
  [SESSION_STATUS.SCHEDULED]: 'bg-primary/20 text-primary border-primary',
  [SESSION_STATUS.COMPLETED]: 'bg-success/20 text-success border-success',
  [SESSION_STATUS.CANCELLED]: 'bg-muted text-muted-foreground border-muted',
  [SESSION_STATUS.NO_SHOW]: 'bg-destructive/20 text-destructive border-destructive',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  [PAYMENT_STATUS.PENDING]: 'Pendente',
  [PAYMENT_STATUS.PAID]: 'Pago',
  [PAYMENT_STATUS.OVERDUE]: 'Atrasado',
  [PAYMENT_STATUS.CANCELLED]: 'Cancelado',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  [PAYMENT_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [PAYMENT_STATUS.PAID]: 'bg-green-100 text-green-800 border-green-300',
  [PAYMENT_STATUS.OVERDUE]: 'bg-red-100 text-red-800 border-red-300',
  [PAYMENT_STATUS.CANCELLED]: 'bg-gray-100 text-gray-600 border-gray-300',
};

// Expense categories
export const EXPENSE_CATEGORIES = {
  RENT: 'rent',
  UTILITIES: 'utilities',
  SUPPLIES: 'supplies',
  SOFTWARE: 'software',
  MARKETING: 'marketing',
  EDUCATION: 'education',
  OTHER: 'other',
} as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  [EXPENSE_CATEGORIES.RENT]: 'Aluguel',
  [EXPENSE_CATEGORIES.UTILITIES]: 'Utilidades',
  [EXPENSE_CATEGORIES.SUPPLIES]: 'Suprimentos',
  [EXPENSE_CATEGORIES.SOFTWARE]: 'Software',
  [EXPENSE_CATEGORIES.MARKETING]: 'Marketing',
  [EXPENSE_CATEGORIES.EDUCATION]: 'Educação',
  [EXPENSE_CATEGORIES.OTHER]: 'Outros',
};

// Default values
export const DEFAULTS = {
  SESSION_DURATION: 50,
  SESSION_PRICE: 0,
  SEARCH_RESULTS_LIMIT: 5,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  WORKING_HOURS: {
    START: '08:00',
    END: '18:00',
  },
  MIN_PASSWORD_LENGTH: 8,
  REVENUE_MONTHS_TO_SHOW: 6,
} as const;

// Recurrence options
export const RECURRENCE_OPTIONS = {
  NONE: 'none',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
} as const;

export const RECURRENCE_LABELS: Record<string, string> = {
  [RECURRENCE_OPTIONS.NONE]: 'Não repetir',
  [RECURRENCE_OPTIONS.WEEKLY]: 'Semanal',
  [RECURRENCE_OPTIONS.BIWEEKLY]: 'Quinzenal',
  [RECURRENCE_OPTIONS.MONTHLY]: 'Mensal',
};
