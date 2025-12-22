import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isSameDay, setHours, setMinutes, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Availability = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type BlockedSlot = {
  blocked_date: string;
  start_time: string;
  end_time: string;
};

interface TimeSlotPickerProps {
  onSelect: (date: Date) => void;
  selectedDate?: Date | null;
}

function generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    slots.push(timeStr);
    
    currentMin += duration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }
  
  return slots;
}

export function TimeSlotPicker({ onSelect, selectedDate: externalSelectedDate }: TimeSlotPickerProps) {
  const { profile } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const selectedDate = externalSelectedDate ?? internalSelectedDate;

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch professional availability
  const { data: availability = [] } = useQuery({
    queryKey: ['professional-availability', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('professional_availability')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('professional_id', profile.user_id)
        .eq('is_active', true);
      if (error) throw error;
      return data as Availability[];
    },
    enabled: !!profile?.user_id,
  });

  // Get scheduling settings from profile
  const allowParallelSessions = (profile as any)?.allow_parallel_sessions ?? false;
  const bufferBetweenSessions = (profile as any)?.buffer_between_sessions ?? 0;

  // Fetch blocked slots
  const { data: blockedSlots = [] } = useQuery({
    queryKey: ['blocked-slots', profile?.user_id, weekStart],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 7), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('blocked_slots')
        .select('blocked_date, start_time, end_time')
        .eq('professional_id', profile.user_id)
        .gte('blocked_date', startDate)
        .lt('blocked_date', endDate);
      
      if (error) throw error;
      return data as BlockedSlot[];
    },
    enabled: !!profile?.user_id,
  });

  // Fetch existing sessions
  const { data: existingSessions = [] } = useQuery({
    queryKey: ['booked-sessions-picker', profile?.user_id, weekStart],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const startDate = weekStart.toISOString();
      const endDate = addDays(weekStart, 7).toISOString();
      
      const { data, error } = await supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('professional_id', profile.user_id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', startDate)
        .lt('scheduled_at', endDate);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const isDayAvailable = (date: Date) => {
    const dayOfWeek = getDay(date);
    return availability.some((a) => a.day_of_week === dayOfWeek && a.is_active);
  };

  const getTimeSlotsForDay = (date: Date): string[] => {
    const dayOfWeek = getDay(date);
    const dayAvailability = availability.find((a) => a.day_of_week === dayOfWeek);
    
    if (!dayAvailability) return [];
    
    const duration = profile?.session_duration || 50;
    return generateTimeSlots(
      dayAvailability.start_time.slice(0, 5),
      dayAvailability.end_time.slice(0, 5),
      duration
    );
  };

  const isSlotBlocked = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const [slotHour, slotMin] = time.split(':').map(Number);
    const slotMinutes = slotHour * 60 + slotMin;
    
    return blockedSlots.some((block) => {
      if (block.blocked_date !== dateStr) return false;
      
      const [blockStartH, blockStartM] = block.start_time.slice(0, 5).split(':').map(Number);
      const [blockEndH, blockEndM] = block.end_time.slice(0, 5).split(':').map(Number);
      const blockStart = blockStartH * 60 + blockStartM;
      const blockEnd = blockEndH * 60 + blockEndM;
      
      return slotMinutes >= blockStart && slotMinutes < blockEnd;
    });
  };

  const isSlotBooked = (date: Date, time: string) => {
    // If parallel sessions allowed, slot is never "booked"
    if (allowParallelSessions) return false;
    
    const [slotHour, slotMin] = time.split(':').map(Number);
    const slotStartMinutes = slotHour * 60 + slotMin;
    const sessionDuration = profile?.session_duration || 50;
    const slotEndMinutes = slotStartMinutes + sessionDuration;
    
    return existingSessions.some((session) => {
      if (!isSameDay(new Date(session.scheduled_at), date)) return false;
      
      const sessionStart = new Date(session.scheduled_at);
      const sessionStartMinutes = sessionStart.getHours() * 60 + sessionStart.getMinutes();
      const sessionEndMinutes = sessionStartMinutes + sessionDuration + bufferBetweenSessions;
      
      // Check if there's any overlap considering buffer
      return (slotStartMinutes < sessionEndMinutes && slotEndMinutes > sessionStartMinutes);
    });
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isPastSlot = (date: Date, time: string) => {
    if (!isSameDay(date, new Date())) return false;
    const [hours] = time.split(':').map(Number);
    return hours <= new Date().getHours();
  };

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    setSelectedTime(time);
    
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = setMinutes(setHours(selectedDate, hours), minutes);
    onSelect(scheduledDate);
  };

  const timeSlots = selectedDate ? getTimeSlotsForDay(selectedDate) : [];

  if (availability.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm">Configure seus horários de atendimento primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {format(weekStart, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const isDisabled = isPastDate(day) || !isDayAvailable(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isAvailable = isDayAvailable(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                if (!isDisabled) {
                  setInternalSelectedDate(day);
                  setSelectedTime(null);
                }
              }}
              disabled={isDisabled}
              className={cn(
                'flex flex-col items-center p-2 rounded-lg border transition-colors text-center',
                isDisabled && 'opacity-50 cursor-not-allowed',
                !isAvailable && !isPastDate(day) && 'bg-muted/50',
                isSelected && 'border-primary bg-primary/10',
                isToday && !isSelected && 'border-primary/50',
                !isDisabled && !isSelected && 'hover:bg-accent cursor-pointer'
              )}
            >
              <span className="text-[10px] text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className={cn('text-sm font-semibold', isSelected && 'text-primary')}>
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {selectedDate ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          {timeSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
              {timeSlots.map((time) => {
                const booked = isSlotBooked(selectedDate, time);
                const blocked = isSlotBlocked(selectedDate, time);
                const past = isPastSlot(selectedDate, time);
                const isDisabled = booked || blocked || past;
                const isSelected = selectedTime === time;

                return (
                  <button
                    key={time}
                    onClick={() => !isDisabled && handleTimeSelect(time)}
                    disabled={isDisabled}
                    className={cn(
                      'flex items-center justify-center gap-1 py-2 px-3 rounded-lg border text-sm transition-colors',
                      isDisabled && 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground',
                      isSelected && 'border-primary bg-primary text-primary-foreground',
                      !isDisabled && !isSelected && 'hover:bg-accent cursor-pointer'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    <span>{time}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Nenhum horário disponível
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center text-muted-foreground text-sm">
          Selecione uma data acima
        </div>
      )}
    </div>
  );
}
