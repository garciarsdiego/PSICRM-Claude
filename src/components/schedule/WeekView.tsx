import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

interface WeekViewProps {
  currentDate: Date;
  sessions: Session[];
  onSessionClick?: (session: Session) => void;
  onDropSession?: (sessionId: string, newDate: Date) => void;
}

const sessionStatusColors: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary border-l-primary',
  completed: 'bg-success/20 text-success border-l-success',
  cancelled: 'bg-muted text-muted-foreground border-l-muted-foreground',
  no_show: 'bg-destructive/20 text-destructive border-l-destructive',
};

// Hours from 08:00 to 22:00
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

export function WeekView({ currentDate, sessions, onSessionClick, onDropSession }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDayAndHour = (day: Date, hour: number) => {
    return sessions.filter((s) => {
      const sessionDate = parseISO(s.scheduled_at);
      return isSameDay(sessionDate, day) && sessionDate.getHours() === hour;
    });
  };

  const handleDragStart = (e: React.DragEvent, session: Session) => {
    e.dataTransfer.setData('sessionId', session.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('sessionId');
    if (sessionId && onDropSession) {
      const newDate = new Date(day);
      newDate.setHours(hour, 0, 0, 0);
      onDropSession(sessionId, newDate);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="p-2 bg-muted/30 border-r border-border" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'p-2 text-center border-r border-border last:border-r-0',
                isSameDay(day, new Date()) && 'bg-primary/10'
              )}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  isSameDay(day, new Date()) && 'text-primary'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border last:border-b-0"
            >
              {/* Time column */}
              <div className="p-2 text-xs text-muted-foreground font-medium border-r border-border bg-muted/30 flex items-start justify-center">
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const hourSessions = getSessionsForDayAndHour(day, hour);
                
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      'min-h-16 p-1 border-r border-border last:border-r-0 relative',
                      isSameDay(day, new Date()) && 'bg-primary/5'
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, hour)}
                  >
                    {hourSessions.map((session) => (
                      <div
                        key={session.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, session)}
                        onClick={() => onSessionClick?.(session)}
                        className={cn(
                          'p-1.5 rounded text-xs cursor-pointer transition-all border-l-4',
                          'hover:opacity-80 hover:shadow-md',
                          sessionStatusColors[session.status || 'scheduled']
                        )}
                      >
                        <div className="font-medium truncate">
                          {session.patients?.full_name?.split(' ')[0]}
                        </div>
                        <div className="text-[10px] opacity-75">
                          {format(new Date(session.scheduled_at), 'HH:mm')} - {session.duration}min
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
