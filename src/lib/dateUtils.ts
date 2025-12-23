/**
 * Date utility functions
 * Shared date manipulation and formatting utilities
 */
import { addWeeks, endOfMonth, isAfter, startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RECURRENCE_OPTIONS } from './constants';

/**
 * Generate recurring dates based on recurrence type
 * @param startDate - The initial date
 * @param recurrenceType - Type of recurrence (none, weekly, biweekly, monthly)
 * @returns Array of dates based on recurrence pattern
 */
export function generateRecurringDates(
  startDate: Date,
  recurrenceType: string
): Date[] {
  const dates: Date[] = [startDate];
  const monthEnd = endOfMonth(startDate);

  if (recurrenceType === RECURRENCE_OPTIONS.NONE) {
    return dates;
  }

  let nextDate = startDate;

  while (true) {
    if (recurrenceType === RECURRENCE_OPTIONS.WEEKLY) {
      nextDate = addWeeks(nextDate, 1);
    } else if (recurrenceType === RECURRENCE_OPTIONS.BIWEEKLY) {
      nextDate = addWeeks(nextDate, 2);
    } else if (recurrenceType === RECURRENCE_OPTIONS.MONTHLY) {
      // For monthly, just one session this month
      break;
    }

    if (isAfter(nextDate, monthEnd)) {
      break;
    }
    dates.push(nextDate);
  }

  return dates;
}

/**
 * Get month boundaries for the last N months
 * @param monthsBack - Number of months to go back
 * @returns Array of { start, end, label } for each month
 */
export function getLastMonthsBoundaries(monthsBack: number = 6) {
  const months = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    months.push({
      start: startOfMonth(date),
      end: endOfMonth(date),
      label: format(date, 'MMM', { locale: ptBR }),
      month: format(date, 'yyyy-MM'),
    });
  }

  return months;
}

/**
 * Format currency in Brazilian Real
 * @param value - Numeric value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format date in Brazilian format
 * @param date - Date to format
 * @param formatStr - Format string (default: dd/MM/yyyy)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr, { locale: ptBR });
}

/**
 * Format time in Brazilian format
 * @param date - Date to format
 * @returns Formatted time string (HH:mm)
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm', { locale: ptBR });
}
