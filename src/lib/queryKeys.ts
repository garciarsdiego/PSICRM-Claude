/**
 * Centralized query key factory for React Query
 * Ensures consistent cache keys across the application
 */
export const queryKeys = {
  // Patients
  patients: {
    all: (userId: string) => ['patients', userId] as const,
    active: (userId: string) => ['patients', userId, 'active'] as const,
    detail: (userId: string, patientId: string) => ['patients', userId, patientId] as const,
  },

  // Sessions
  sessions: {
    all: (userId: string) => ['sessions', userId] as const,
    byDate: (userId: string, date: string) => ['sessions', userId, date] as const,
    byMonth: (userId: string, month: string) => ['sessions', userId, 'month', month] as const,
  },

  // Messages
  messages: {
    all: (userId: string) => ['messages', userId] as const,
    conversation: (userId: string, patientId: string) => ['messages', userId, patientId] as const,
  },

  // Expenses
  expenses: {
    all: (userId: string) => ['expenses', userId] as const,
    byMonth: (userId: string, month: string) => ['expenses', userId, 'month', month] as const,
  },

  // Medical Records
  records: {
    all: (userId: string) => ['medical-records', userId] as const,
    byPatient: (userId: string, patientId: string) => ['medical-records', userId, patientId] as const,
  },

  // Attachments
  attachments: {
    byPatient: (patientId: string) => ['attachments', patientId] as const,
  },

  // Google Calendar
  googleCalendar: {
    token: (userId: string) => ['google-calendar-token', userId] as const,
    events: (userId: string) => ['google-calendar-events', userId] as const,
  },

  // Profile
  profile: {
    current: (userId: string) => ['profile', userId] as const,
  },

  // Dashboard
  dashboard: {
    stats: (userId: string) => ['dashboard', userId, 'stats'] as const,
    revenue: (userId: string) => ['dashboard', userId, 'revenue'] as const,
  },

  // Email Settings
  emailSettings: {
    byProfessional: (userId: string) => ['email-settings', userId] as const,
  },
} as const;
