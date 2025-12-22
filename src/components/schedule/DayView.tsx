import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

type GoogleCalendarEvent = Tables<'google_calendar_events'>;

interface DayViewProps {
  selectedDate: Date;
  sessions: Session[];
  googleEvents?: GoogleCalendarEvent[];
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

export function DayView({ selectedDate, sessions, googleEvents = [], onSessionClick, onDropSession }: DayViewProps) {
  const daySessions = sessions.filter((s) => 
    isSameDay(parseISO(s.scheduled_at), selectedDate)
  );

  const dayGoogleEvents = googleEvents.filter((e) => 
    isSameDay(parseISO(e.start_time), selectedDate)
  );

  const getSessionsForHour = (hour: number) => {
    return daySessions.filter((s) => {
      const sessionDate = new Date(s.scheduled_at);
      return sessionDate.getHours() === hour;
    });
  };

  const getGoogleEventsForHour = (hour: number) => {
    return dayGoogleEvents.filter((e) => {
      const eventDate = new Date(e.start_time);
      return eventDate.getHours() === hour;
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

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('sessionId');
    if (sessionId && onDropSession) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hour, 0, 0, 0);
      onDropSession(sessionId, newDate);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground">
        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
      </h3>
      
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {HOURS.map((hour) => {
          const hourSessions = getSessionsForHour(hour);
          const hourGoogleEvents = getGoogleEventsForHour(hour);
          const hasItems = hourSessions.length > 0 || hourGoogleEvents.length > 0;
          
          return (
            <div 
              key={hour} 
              className="flex border-b border-border last:border-b-0 min-h-16"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, hour)}
            >
              {/* Time column */}
              <div className="w-16 flex-shrink-0 border-r border-border bg-muted/30 p-2 text-sm text-muted-foreground font-medium">
                {String(hour).padStart(2, '0')}:00
              </div>
              
              {/* Sessions and events column */}
              <div className="flex-1 relative p-1">
                {!hasItems ? (
                  <div className="h-full w-full" />
                ) : (
                  <div className="space-y-1">
                    {/* Sessions */}
                    {hourSessions.map((session) => (
                      <div
                        key={session.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, session)}
                        onClick={() => onSessionClick?.(session)}
                        className={cn(
                          'p-2 rounded cursor-pointer transition-all border-l-4',
                          'hover:opacity-80 hover:shadow-md',
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
                    
                    {/* Google Calendar Events */}
                    {hourGoogleEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-2 rounded border-l-4 bg-accent/50 text-accent-foreground border-l-accent"
                      >
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 opacity-75" />
                          <span className="font-medium text-sm truncate">
                            {event.title}
                          </span>
                        </div>
                        <div className="text-xs opacity-75">
                          {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                          <span className="ml-2 text-[10px]">(Google Calendar)</span>
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
