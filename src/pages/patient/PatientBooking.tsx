import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isSameDay, setHours, setMinutes, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientLayout } from '@/components/patient/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'>;

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

export default function PatientBooking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch patient record
  const { data: patientRecord } = useQuery({
    queryKey: ['patient-record', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch professional profile
  const { data: professionalProfile } = useQuery({
    queryKey: ['professional-profile', patientRecord?.professional_id],
    queryFn: async () => {
      if (!patientRecord?.professional_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('session_duration, session_price, allow_parallel_sessions, buffer_between_sessions')
        .eq('user_id', patientRecord.professional_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!patientRecord?.professional_id,
  });

  const allowParallelSessions = (professionalProfile as any)?.allow_parallel_sessions ?? false;
  const bufferBetweenSessions = (professionalProfile as any)?.buffer_between_sessions ?? 0;

  // Fetch professional availability
  const { data: availability = [] } = useQuery({
    queryKey: ['professional-availability', patientRecord?.professional_id],
    queryFn: async () => {
      if (!patientRecord?.professional_id) return [];
      const { data, error } = await supabase
        .from('professional_availability')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('professional_id', patientRecord.professional_id)
        .eq('is_active', true);
      if (error) throw error;
      return data as Availability[];
    },
    enabled: !!patientRecord?.professional_id,
  });

  // Fetch blocked slots
  const { data: blockedSlots = [] } = useQuery({
    queryKey: ['blocked-slots', patientRecord?.professional_id, weekStart],
    queryFn: async () => {
      if (!patientRecord?.professional_id) return [];
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 7), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('blocked_slots')
        .select('blocked_date, start_time, end_time')
        .eq('professional_id', patientRecord.professional_id)
        .gte('blocked_date', startDate)
        .lt('blocked_date', endDate);
      
      if (error) throw error;
      return data as BlockedSlot[];
    },
    enabled: !!patientRecord?.professional_id,
  });

  // Fetch existing sessions to check availability
  const { data: existingSessions = [] } = useQuery({
    queryKey: ['booked-sessions', patientRecord?.professional_id, weekStart],
    queryFn: async () => {
      if (!patientRecord?.professional_id) return [];
      const startDate = weekStart.toISOString();
      const endDate = addDays(weekStart, 7).toISOString();
      
      const { data, error } = await supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('professional_id', patientRecord.professional_id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', startDate)
        .lt('scheduled_at', endDate);
      
      if (error) throw error;
      return data as Pick<Session, 'scheduled_at'>[];
    },
    enabled: !!patientRecord?.professional_id,
  });

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!patientRecord || !selectedDate || !selectedTime) {
        throw new Error('Dados incompletos');
      }

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);
      
      const sessionPrice = patientRecord.session_price || professionalProfile?.session_price || 0;

      const { error } = await supabase.from('sessions').insert({
        professional_id: patientRecord.professional_id,
        patient_id: patientRecord.id,
        scheduled_at: scheduledAt.toISOString(),
        duration: professionalProfile?.session_duration || 50,
        price: sessionPrice,
        status: 'scheduled',
        payment_status: 'pending',
        title: `Sessão - ${patientRecord.full_name}`,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booked-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['patient-upcoming-sessions'] });
      setSelectedDate(null);
      setSelectedTime(null);
      toast({ title: 'Sessão agendada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao agendar sessão', variant: 'destructive' });
    },
  });

  const isDayAvailable = (date: Date) => {
    const dayOfWeek = getDay(date);
    return availability.some((a) => a.day_of_week === dayOfWeek && a.is_active);
  };

  const getTimeSlotsForDay = (date: Date): string[] => {
    const dayOfWeek = getDay(date);
    const dayAvailability = availability.find((a) => a.day_of_week === dayOfWeek);
    
    if (!dayAvailability) return [];
    
    const duration = professionalProfile?.session_duration || 50;
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
    const sessionDuration = professionalProfile?.session_duration || 50;
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

  const timeSlots = selectedDate ? getTimeSlotsForDay(selectedDate) : [];

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agendar Sessão</h1>
          <p className="text-muted-foreground">
            Escolha um horário disponível para sua próxima sessão
          </p>
        </div>

        {!patientRecord?.professional_id ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Você precisa estar vinculado a um profissional para agendar sessões.</p>
            </CardContent>
          </Card>
        ) : availability.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>O profissional ainda não configurou seus horários de atendimento.</p>
              <p className="text-sm mt-2">Por favor, entre em contato para agendar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Selecione uma data
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {format(weekStart, "MMMM 'de' yyyy", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const isDisabled = isPastDate(day) || !isDayAvailable(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isAvailable = isDayAvailable(day);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => !isDisabled && setSelectedDate(day)}
                        disabled={isDisabled}
                        className={cn(
                          'flex flex-col items-center p-3 rounded-lg border transition-colors',
                          isDisabled && 'opacity-50 cursor-not-allowed',
                          !isAvailable && !isPastDate(day) && 'bg-muted/50',
                          isSelected && 'border-primary bg-primary/10',
                          isToday && !isSelected && 'border-primary/50',
                          !isDisabled && !isSelected && 'hover:bg-accent cursor-pointer'
                        )}
                      >
                        <span className="text-xs text-muted-foreground">
                          {format(day, 'EEE', { locale: ptBR })}
                        </span>
                        <span className={cn('text-lg font-semibold', isSelected && 'text-primary')}>
                          {format(day, 'd')}
                        </span>
                        {!isAvailable && !isPastDate(day) && (
                          <span className="text-[10px] text-muted-foreground">Fechado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horários Disponíveis
                </CardTitle>
                <CardDescription>
                  {selectedDate
                    ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : 'Selecione uma data primeiro'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  timeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {timeSlots.map((time) => {
                        const booked = isSlotBooked(selectedDate, time);
                        const blocked = isSlotBlocked(selectedDate, time);
                        const past = isPastSlot(selectedDate, time);
                        const isDisabled = booked || blocked || past;
                        const isSelected = selectedTime === time;

                        return (
                          <button
                            key={time}
                            onClick={() => !isDisabled && setSelectedTime(time)}
                            disabled={isDisabled}
                            className={cn(
                              'flex items-center justify-center gap-2 p-4 rounded-lg border transition-colors',
                              isDisabled && 'opacity-50 cursor-not-allowed bg-muted',
                              isSelected && 'border-primary bg-primary text-primary-foreground',
                              !isDisabled && !isSelected && 'hover:bg-accent cursor-pointer'
                            )}
                          >
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{time}</span>
                            {(booked || blocked) && (
                              <span className="text-xs">(Indisponível)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>Nenhum horário disponível nesta data</p>
                    </div>
                  )
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Selecione uma data para ver os horários disponíveis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Confirmation */}
        {selectedDate && selectedTime && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Confirmar Agendamento</p>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} às{' '}
                    {selectedTime}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => createBooking.mutate()}
                disabled={createBooking.isPending}
              >
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar Sessão
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PatientLayout>
  );
}
