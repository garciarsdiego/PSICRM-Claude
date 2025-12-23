import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    format,
    addDays,
    startOfWeek,
    isSameDay,
    setHours,
    setMinutes,
    getDay,
    addMonths,
    startOfMonth,
    endOfMonth,
    endOfWeek,
    isSameMonth,
    subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    Loader2,
    User,
    MapPin,
    Phone,
    Mail,
    ArrowRight,
    ArrowLeft,
    Video
} from 'lucide-react';
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

// Helper function to generate time slots (reused logic)
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

export default function PublicBooking() {
    const { professionalId } = useParams<{ professionalId: string }>();
    const { toast } = useToast();

    // State
    const [step, setStep] = useState<'calendar' | 'details' | 'confirmation'>('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        notes: ''
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const generateCalendarDays = () => {
        const days = [];
        let day = startDate;
        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    };

    const calendarDays = generateCalendarDays();
    const weekDaysHeader = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    // --- Queries ---

    // 1. Fetch Professional Profile
    const { data: professional, isLoading: loadingProfile } = useQuery({
        queryKey: ['public-professional', professionalId],
        queryFn: async () => {
            if (!professionalId) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', professionalId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!professionalId,
    });

    // 2. Fetch Availability Rules
    const { data: availability = [] } = useQuery({
        queryKey: ['public-availability', professionalId],
        queryFn: async () => {
            if (!professionalId) return [];
            const { data, error } = await supabase
                .from('professional_availability')
                .select('day_of_week, start_time, end_time, is_active')
                .eq('professional_id', professionalId)
                .eq('is_active', true);
            if (error) throw error;
            return data as Availability[];
        },
        enabled: !!professionalId,
    });

    // 3. Fetch Blocked Slots (Manual Blocks)
    const { data: blockedSlots = [] } = useQuery({
        queryKey: ['public-blocked-slots', professionalId, currentMonth], // Depend on currentMonth
        queryFn: async () => {
            if (!professionalId) return [];
            const start = format(startDate, 'yyyy-MM-dd');
            const end = format(endDate, 'yyyy-MM-dd');

            const { data, error } = await supabase
                .from('blocked_slots')
                .select('blocked_date, start_time, end_time')
                .eq('professional_id', professionalId)
                .gte('blocked_date', start)
                .lt('blocked_date', end);

            if (error) throw error;
            return data as BlockedSlot[];
        },
        enabled: !!professionalId,
    });

    // 4. Fetch Existing Sessions (Conflicts)
    const { data: existingSessions = [] } = useQuery({
        queryKey: ['public-booked-sessions', professionalId, currentMonth],
        queryFn: async () => {
            if (!professionalId) return [];
            const start = startDate.toISOString();
            const end = endDate.toISOString();

            const { data, error } = await supabase
                .from('sessions')
                .select('scheduled_at')
                .eq('professional_id', professionalId)
                .neq('status', 'cancelled')
                .gte('scheduled_at', start)
                .lt('scheduled_at', end);

            if (error) throw error;
            return data;
        },
        enabled: !!professionalId,
    });

    // --- Logic ---

    const allowParallelSessions = professional?.allow_parallel_sessions ?? false;
    const bufferBetweenSessions = professional?.buffer_between_sessions ?? 0;
    const sessionDuration = professional?.session_duration || 50;
    const sessionPrice = professional?.session_price || 0;

    const isDayAvailable = (date: Date) => {
        const dayOfWeek = getDay(date);
        // Only consider day of week availability for now. 
        // We could also check here if the ENTIRE day is blocked manually, 
        // but typically manual blocks are for specific times or time ranges.
        return availability.some((a) => a.day_of_week === dayOfWeek && a.is_active);
    };

    const getTimeSlotsForDay = (date: Date): string[] => {
        const dayOfWeek = getDay(date);
        const dayAvailability = availability.find((a) => a.day_of_week === dayOfWeek);

        if (!dayAvailability) return [];

        // Slot interval = session duration + buffer
        const slotInterval = sessionDuration + bufferBetweenSessions;

        return generateTimeSlots(
            dayAvailability.start_time.slice(0, 5),
            dayAvailability.end_time.slice(0, 5),
            slotInterval
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
        if (allowParallelSessions) return false;

        const [slotHour, slotMin] = time.split(':').map(Number);
        const slotStartMinutes = slotHour * 60 + slotMin;
        const slotEndMinutes = slotStartMinutes + sessionDuration;

        return existingSessions.some((session) => {
            if (!isSameDay(new Date(session.scheduled_at), date)) return false;

            const sessionStart = new Date(session.scheduled_at);
            const sessionStartMinutes = sessionStart.getHours() * 60 + sessionStart.getMinutes();
            const sessionEndMinutes = sessionStartMinutes + sessionDuration + bufferBetweenSessions;

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
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        return (hours < now.getHours()) || (hours === now.getHours() && minutes <= now.getMinutes());
    };

    const timeSlots = selectedDate ? getTimeSlotsForDay(selectedDate) : [];

    // --- Mutation ---

    const handleBooking = useMutation({
        mutationFn: async () => {
            if (!professionalId || !selectedDate || !selectedTime) throw new Error('Dados incompletos');

            const [hours, minutes] = selectedTime.split(':').map(Number);
            const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);

            const { data: newPatient, error: patientError } = await supabase
                .from('patients')
                .insert({
                    professional_id: professionalId,
                    full_name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    is_active: true,
                })
                .select()
                .single();

            if (patientError) {
                throw new Error('Erro ao cadastrar paciente: ' + patientError.message);
            }

            const { error: sessionError } = await supabase
                .from('sessions')
                .insert({
                    professional_id: professionalId,
                    patient_id: newPatient.id,
                    scheduled_at: scheduledAt.toISOString(),
                    duration: sessionDuration,
                    price: sessionPrice,
                    status: 'scheduled',
                    payment_status: 'pending',
                    title: `Sessão Inicial - ${formData.fullName}`,
                    notes: `Agendamento Público\nNotas: ${formData.notes}`
                });

            if (sessionError) throw new Error('Erro ao criar sessão: ' + sessionError.message);

            return true;
        },
        onSuccess: () => {
            setStep('confirmation');
            toast({ title: 'Agendamento confirmado com sucesso!' });
        },
        onError: (err) => {
            toast({ title: 'Erro ao agendar', description: err.message, variant: 'destructive' });
        }
    });

    if (loadingProfile) {
        return (
            <PublicLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </PublicLayout>
        );
    }

    if (!professional) {
        return (
            <PublicLayout>
                <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                    <h1 className="text-2xl font-bold">Profissional não encontrado</h1>
                    <p className="text-muted-foreground">O link que você acessou parece estar incorreto.</p>
                </div>
            </PublicLayout>
        );
    }

    return (
        <PublicLayout>
            <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
                <div className="w-full max-w-6xl">

                    {/* Header Section - Full Width */}
                    <div className="mb-8 text-center sm:text-left">
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-3">
                            Agendar Sessão
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Dê o primeiro passo para o seu bem-estar. Escolha o melhor horário.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1fr_350px] items-start">
                        {/* Left Column: Booking Flow */}
                        <div className="space-y-6">

                            {/* Step 1: Calendar & Time */}
                            {step === 'calendar' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid gap-6 md:grid-cols-2">

                                        {/* Calendar Card */}
                                        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm ring-1 ring-border/50">
                                            <CardHeader className="pb-4">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                                                        <Calendar className="w-5 h-5 text-primary" />
                                                        Escolha a Data
                                                    </CardTitle>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                                            disabled={isPastDate(endOfMonth(subMonths(currentMonth, 1)))}
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <CardDescription className="text-base font-medium text-foreground">
                                                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-7 gap-1 mb-2">
                                                    {weekDaysHeader.map((day, i) => (
                                                        <div key={`header-${i}`} className="text-center text-xs font-medium text-muted-foreground uppercase h-8 flex items-center justify-center">
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {calendarDays.map((day) => {
                                                        const isDisabled = isPastDate(day) || !isDayAvailable(day);
                                                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                                                        const isToday = isSameDay(day, new Date());
                                                        const isCurrentMonth = isSameMonth(day, currentMonth);

                                                        return (
                                                            <button
                                                                key={day.toISOString()}
                                                                onClick={() => !isDisabled && setSelectedDate(day)}
                                                                disabled={isDisabled}
                                                                className={cn(
                                                                    'aspect-square flex flex-col items-center justify-center rounded-lg border transition-all duration-200 relative',
                                                                    !isCurrentMonth && 'opacity-0 pointer-events-none', // Hide days outside current month visually
                                                                    isDisabled && isCurrentMonth && 'opacity-30 cursor-not-allowed border-transparent',
                                                                    !isDisabled && !isSelected && isCurrentMonth && 'hover:bg-primary/10 hover:border-primary/30 cursor-pointer bg-card',
                                                                    isSelected && 'border-primary bg-primary text-primary-foreground shadow-md scale-105 z-10',
                                                                    isToday && !isSelected && isCurrentMonth && 'border-primary/50 bg-primary/5 font-semibold text-primary',
                                                                )}
                                                            >
                                                                <span className={cn('text-sm font-medium', isSelected && 'font-bold')}>
                                                                    {format(day, 'd')}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Time Slots Card */}
                                        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm ring-1 ring-border/50 h-full flex flex-col">
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-lg font-medium flex items-center gap-2">
                                                    <Clock className="w-5 h-5 text-primary" />
                                                    Horários
                                                </CardTitle>
                                                <CardDescription>
                                                    {selectedDate
                                                        ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                                                        : 'Selecione um dia ao lado'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1 min-h-[300px]">
                                                {selectedDate ? (
                                                    timeSlots.length > 0 ? (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
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
                                                                            'py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-200',
                                                                            isDisabled && 'opacity-30 cursor-not-allowed bg-muted border-transparent',
                                                                            !isDisabled && !isSelected && 'hover:border-primary/50 hover:bg-primary/5 bg-background',
                                                                            isSelected && 'border-primary bg-primary text-primary-foreground shadow-md'
                                                                        )}
                                                                    >
                                                                        {time}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-8">
                                                            <Clock className="w-10 h-10 mb-3 opacity-20" />
                                                            <p>Sem horários livres</p>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-8">
                                                        <Calendar className="w-10 h-10 mb-3 opacity-20" />
                                                        <p>Escolha uma data primeiro</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            size="lg"
                                            onClick={() => setStep('details')}
                                            disabled={!selectedDate || !selectedTime}
                                            className="w-full sm:w-auto px-8 text-lg h-12 shadow-xl shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/30"
                                        >
                                            Continuar
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Details */}
                            {step === 'details' && (
                                <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-md animate-in slide-in-from-right-8 duration-500">
                                    <CardHeader>
                                        <CardTitle className="text-2xl">Seus Dados</CardTitle>
                                        <CardDescription>Para confirmarmos seu agendamento, precisamos de algumas informações.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="fullname" className="text-base">Nome Completo</Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="fullname"
                                                        className="pl-9 h-11"
                                                        placeholder="Digite seu nome"
                                                        value={formData.fullName}
                                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="text-base">Celular / WhatsApp</Label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="phone"
                                                        className="pl-9 h-11"
                                                        placeholder="(00) 00000-0000"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-base">E-mail</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    className="pl-9 h-11"
                                                    placeholder="seu@email.com"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="notes" className="text-base">Observações (Opcional)</Label>
                                            <Input
                                                id="notes"
                                                className="h-11"
                                                placeholder="Alguma preferência ou dúvida?"
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-between pt-6 border-t bg-muted/20">
                                        <Button variant="ghost" onClick={() => setStep('calendar')} className="hover:bg-background">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Voltar
                                        </Button>
                                        <Button
                                            size="lg"
                                            onClick={() => handleBooking.mutate()}
                                            disabled={!formData.fullName || !formData.email || !formData.phone || handleBooking.isPending}
                                            className="px-8 shadow-lg shadow-primary/20"
                                        >
                                            {handleBooking.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Confirmando...
                                                </>
                                            ) : 'Confirmar Agendamento'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Step 3: Confirmation */}
                            {step === 'confirmation' && (
                                <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-500">
                                    <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-500/5">
                                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-center mb-2">Agendamento Confirmado!</h2>
                                    <p className="text-muted-foreground text-center max-w-md mb-8">
                                        Sua sessão com {professional.full_name} está agendada. Enviamos os detalhes para o seu e-mail.
                                    </p>

                                    <Card className="w-full max-w-sm border-2 border-primary/10 bg-card/50">
                                        <CardContent className="pt-6 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="text-primary h-5 w-5" />
                                                <span className="font-medium">{format(selectedDate!, "d 'de' MMMM", { locale: ptBR })}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Clock className="text-primary h-5 w-5" />
                                                <span className="font-medium">{selectedTime}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Video className="text-primary h-5 w-5" />
                                                <span className="font-medium">Link do Google Meet enviado</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Button className="mt-8" variant="outline" onClick={() => window.location.reload()}>
                                        Fazer novo agendamento
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Profile Summary */}
                        <div className="hidden lg:block space-y-6">
                            <Card className="sticky top-6 border-0 shadow-lg bg-card/80 backdrop-blur-md overflow-hidden ring-1 ring-border/50">
                                <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
                                <div className="px-6 -mt-10 text-center">
                                    <div className="w-20 h-20 rounded-full border-4 border-background mx-auto overflow-hidden bg-muted shadow-xl">
                                        {professional.avatar_url ? (
                                            <img src={professional.avatar_url} alt={professional.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                                <User className="h-8 w-8" />
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="mt-2 text-lg font-bold">{professional.full_name}</h2>
                                    <p className="text-xs text-primary font-medium mb-1">{professional.specialty || 'Psicólogo'}</p>
                                    {professional.crp && <p className="text-[10px] text-muted-foreground">CRP: {professional.crp}</p>}
                                </div>

                                <CardContent className="pt-4 space-y-4">
                                    {professional.bio && (
                                        <div className="text-xs text-muted-foreground text-center italic leading-relaxed line-clamp-3">
                                            "{professional.bio}"
                                        </div>
                                    )}

                                    <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <Clock className="h-3 w-3" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Duração</p>
                                                <p className="text-muted-foreground">{sessionDuration} min</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <CheckCircle2 className="h-3 w-3" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Sessão Inicial</p>
                                                <p className="text-muted-foreground">Avaliação</p>
                                            </div>
                                        </div>

                                        {professional.address && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                    <MapPin className="h-3 w-3" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Localização</p>
                                                    <p className="text-muted-foreground truncate max-w-[150px]">
                                                        {professional.city}, {professional.state}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedDate && selectedTime && (
                                        <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mb-0.5">Resumo</p>
                                            <p className="text-base font-bold">
                                                {format(selectedDate, "d 'de' MMM", { locale: ptBR })}
                                            </p>
                                            <p className="text-lg opacity-90">{selectedTime}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
