import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar, Users, Briefcase, Plane, Clock, Plus } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

type GoogleCalendarEvent = Tables<'google_calendar_events'>;

interface WeekViewProps {
  currentDate: Date;
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

export function WeekView({ currentDate, sessions, googleEvents = [], onSessionClick, onDropSession, onEmptySlotClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDayAndHour = (day: Date, hour: number) => {
    return sessions.filter((s) => {
      const sessionDate = parseISO(s.scheduled_at);
      return isSameDay(sessionDate, day) && sessionDate.getHours() === hour;
    });
  };

  const getGoogleEventsForDayAndHour = (day: Date, hour: number) => {
    return googleEvents.filter((e) => {
      const eventDate = parseISO(e.start_time);
      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
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

  const getEventStyle = (event: GoogleCalendarEvent) => {
    const eventType = (event.event_type as string) || 'default';
    return eventTypeStyles[eventType] || eventTypeStyles.default;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px] h-[600px] overflow-y-auto relative">
        {/* Header with days - Sticky Top */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-20 bg-card border-b border-border shadow-sm">
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
        <div>
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
                const hourGoogleEvents = getGoogleEventsForDayAndHour(day, hour);

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      'min-h-16 p-1 border-r border-border last:border-r-0 relative group transition-colors',
                      isSameDay(day, new Date()) && 'bg-primary/5',
                      'hover:bg-muted/50'
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, hour)}
                  >
                    {/* Empty Slot Click Trigger */}
                    <div
                      className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer pointer-events-none group-hover:pointer-events-auto"
                      onClick={() => {
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, 0, 0, 0);
                        onEmptySlotClick?.(slotDate);
                      }}
                    >
                      <div className="bg-primary/10 text-primary rounded-full p-1 shadow-sm">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Sessions - z-10 to stay above the click trigger */}
                    <div className="relative z-10 space-y-1">
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
                            'p-1.5 rounded text-xs cursor-pointer transition-all border-l-4 shadow-sm',
                            'hover:opacity-90 hover:shadow-md',
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

                      {/* Google Calendar Events */}
                      {hourGoogleEvents.map((event) => {
                        const style = getEventStyle(event);
                        const IconComponent = style.icon;

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              'p-1.5 rounded text-xs border-l-4 shadow-sm text-foreground',
                              style.bg,
                              style.border
                            )}
                          >
                            <div className="flex items-center gap-1">
                              <IconComponent className="h-2.5 w-2.5 opacity-75 flex-shrink-0" />
                              <span className="font-medium truncate text-[11px]">
                                {event.title}
                              </span>
                            </div>
                            <div className="text-[10px] opacity-75">
                              {format(new Date(event.start_time), 'HH:mm')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
