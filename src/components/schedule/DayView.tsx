import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar, Users, Briefcase, Plane, Clock, Plus } from 'lucide-react';
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
  onEmptySlotClick?: (date: Date) => void;
}

const sessionStatusColors: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary border-l-primary',
  completed: 'bg-success/20 text-success border-l-success',
  cancelled: 'bg-muted text-muted-foreground border-l-muted-foreground',
  no_show: 'bg-destructive/20 text-destructive border-l-destructive',
};

// Colors for Google Calendar event types
const eventTypeStyles: Record<string, { bg: string; border: string; icon: typeof Calendar }> = {
  default: { bg: 'bg-accent/50', border: 'border-l-accent', icon: Calendar },
  meeting: { bg: 'bg-chart-5/20', border: 'border-l-chart-5', icon: Users },
  personal: { bg: 'bg-chart-3/20', border: 'border-l-chart-3', icon: Clock },
  focus: { bg: 'bg-chart-2/20', border: 'border-l-chart-2', icon: Briefcase },
  travel: { bg: 'bg-chart-4/20', border: 'border-l-chart-4', icon: Plane },
};

// Hours from 08:00 to 22:00
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

export function DayView({ selectedDate, sessions, googleEvents = [], onSessionClick, onDropSession, onEmptySlotClick }: DayViewProps) {
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

  const getEventStyle = (event: GoogleCalendarEvent) => {
    const eventType = (event.event_type as string) || 'default';
    return eventTypeStyles[eventType] || eventTypeStyles.default;
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
              className="flex border-b border-border last:border-b-0 min-h-16 group transition-colors hover:bg-muted/50 relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, hour)}
            >
              {/* Time column */}
              <div className="w-16 flex-shrink-0 border-r border-border bg-muted/30 p-2 text-sm text-muted-foreground font-medium">
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Sessions and events column */}
              <div className="flex-1 relative p-1">
                {/* Empty Slot Click Trigger */}
                <div
                  className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer pointer-events-none group-hover:pointer-events-auto"
                  onClick={() => {
                    const slotDate = new Date(selectedDate);
                    slotDate.setHours(hour, 0, 0, 0);
                    onEmptySlotClick?.(slotDate);
                  }}
                >
                  <div className="bg-primary/10 text-primary rounded-full p-1 shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>

                {!hasItems ? (
                  <div className="h-full w-full" />
                ) : (
                  <div className="space-y-1 relative z-10">
                    {/* Sessions */}
                    {hourSessions.map((session) => (
                      <div
                        key={session.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, session)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSessionClick?.(session);
                        }}
                        className={cn(
                          'p-2 rounded cursor-pointer transition-all border-l-4 shadow-sm',
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
                    {hourGoogleEvents.map((event) => {
                      const style = getEventStyle(event);
                      const IconComponent = style.icon;

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'p-2 rounded border-l-4 shadow-sm text-foreground',
                            style.bg,
                            style.border
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <IconComponent className="h-3 w-3 opacity-75" />
                            <span className="font-medium text-sm truncate">
                              {event.title}
                            </span>
                          </div>
                          <div className="text-xs opacity-75">
                            {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                            <span className="ml-2 text-[10px]">(Google)</span>
                          </div>
                        </div>
                      );
                    })}
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
