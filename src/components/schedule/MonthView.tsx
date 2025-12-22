import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

interface MonthViewProps {
  currentDate: Date;
  sessions: Session[];
  onDayClick?: (date: Date) => void;
  selectedDate?: Date;
}

const sessionStatusColors: Record<string, string> = {
  scheduled: 'bg-primary',
  completed: 'bg-success',
  cancelled: 'bg-muted-foreground',
  no_show: 'bg-destructive',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function MonthView({ currentDate, sessions, onDayClick, selectedDate }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Generate all days for the calendar grid
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getSessionsForDay = (date: Date) => {
    return sessions.filter((s) => isSameDay(parseISO(s.scheduled_at), date));
  };

  return (
    <div className="space-y-2">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayItem) => {
          const daySessions = getSessionsForDay(dayItem);
          const isCurrentMonth = isSameMonth(dayItem, currentDate);
          const isToday = isSameDay(dayItem, new Date());
          const isSelected = selectedDate && isSameDay(dayItem, selectedDate);

          return (
            <div
              key={dayItem.toISOString()}
              onClick={() => onDayClick?.(dayItem)}
              className={cn(
                'min-h-24 p-2 border rounded-lg cursor-pointer transition-colors',
                'hover:border-primary/50',
                !isCurrentMonth && 'bg-muted/30 opacity-50',
                isCurrentMonth && 'bg-card',
                isToday && 'border-primary bg-primary/5',
                isSelected && 'ring-2 ring-primary'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  !isCurrentMonth && 'text-muted-foreground',
                  isToday && 'text-primary'
                )}
              >
                {format(dayItem, 'd')}
              </div>

              {/* Session indicators */}
              <div className="space-y-1">
                {daySessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'text-xs px-1 py-0.5 rounded truncate text-card',
                      sessionStatusColors[session.status || 'scheduled']
                    )}
                    title={`${session.patients?.full_name} - ${format(
                      new Date(session.scheduled_at),
                      'HH:mm'
                    )}`}
                  >
                    {format(new Date(session.scheduled_at), 'HH:mm')} {session.patients?.full_name?.split(' ')[0]}
                  </div>
                ))}
                {daySessions.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{daySessions.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
