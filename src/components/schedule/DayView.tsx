import { format, isSameDay, parseISO, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

interface DayViewProps {
  selectedDate: Date;
  sessions: Session[];
  onSessionClick?: (session: Session) => void;
}

const sessionStatusColors: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary border-l-primary',
  completed: 'bg-success/20 text-success border-l-success',
  cancelled: 'bg-muted text-muted-foreground border-l-muted-foreground',
  no_show: 'bg-destructive/20 text-destructive border-l-destructive',
};

// Hours from 08:00 to 22:00
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

export function DayView({ selectedDate, sessions, onSessionClick }: DayViewProps) {
  const daySessions = sessions.filter((s) => 
    isSameDay(parseISO(s.scheduled_at), selectedDate)
  );

  const getSessionsForHour = (hour: number) => {
    return daySessions.filter((s) => {
      const sessionDate = new Date(s.scheduled_at);
      return sessionDate.getHours() === hour;
    });
  };

  const getSessionPosition = (session: Session) => {
    const sessionDate = new Date(session.scheduled_at);
    const minutes = sessionDate.getMinutes();
    return (minutes / 60) * 100;
  };

  const getSessionHeight = (session: Session) => {
    const duration = session.duration || 50;
    return (duration / 60) * 100;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground">
        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
      </h3>
      
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {HOURS.map((hour) => {
          const hourSessions = getSessionsForHour(hour);
          
          return (
            <div 
              key={hour} 
              className="flex border-b border-border last:border-b-0 min-h-16"
            >
              {/* Time column */}
              <div className="w-16 flex-shrink-0 border-r border-border bg-muted/30 p-2 text-sm text-muted-foreground font-medium">
                {String(hour).padStart(2, '0')}:00
              </div>
              
              {/* Sessions column */}
              <div className="flex-1 relative p-1">
                {hourSessions.length === 0 ? (
                  <div className="h-full w-full" />
                ) : (
                  <div className="space-y-1">
                    {hourSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => onSessionClick?.(session)}
                        className={cn(
                          'p-2 rounded cursor-pointer transition-colors border-l-4',
                          'hover:opacity-80',
                          sessionStatusColors[session.status || 'scheduled']
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {session.patients?.full_name}
                          </span>
                          <span className="text-xs opacity-75">
                            {session.duration}min
                          </span>
                        </div>
                        <div className="text-xs opacity-75">
                          {format(new Date(session.scheduled_at), 'HH:mm')}
                        </div>
                      </div>
                    ))}
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
