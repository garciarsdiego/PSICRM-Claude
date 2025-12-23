import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, addWeeks, endOfMonth, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Plus,
  Clock,
  User,
  Settings2,
  Video,
  Loader2,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { AvailabilitySettings } from '@/components/schedule/AvailabilitySettings';
import { BlockedSlots } from '@/components/schedule/BlockedSlots';
import { GoogleCalendarIntegration } from '@/components/schedule/GoogleCalendarIntegration';
import { CalendarHeader, CalendarViewType } from '@/components/schedule/CalendarHeader';
import { DayView } from '@/components/schedule/DayView';
import { WeekView } from '@/components/schedule/WeekView';
import { MonthView } from '@/components/schedule/MonthView';
import { SessionDetailModal } from '@/components/schedule/SessionDetailModal';
import { TimeSlotPicker } from '@/components/schedule/TimeSlotPicker';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

type Patient = Tables<'patients'>;

type GoogleCalendarEvent = Tables<'google_calendar_events'>;

const sessionStatusColors: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary border-primary',
  completed: 'bg-success/20 text-success border-success',
  cancelled: 'bg-muted text-muted-foreground border-muted',
  no_show: 'bg-destructive/20 text-destructive border-destructive',
};

const sessionStatusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
};

export default function Schedule() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('day');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);
  const [newSession, setNewSession] = useState({
    patient_id: '',
    scheduled_at: '',
    duration: 50,
    price: '',
    notes: '',
    recurrence_type: 'none' as 'none' | 'weekly' | 'biweekly' | 'monthly',
    sync_google_calendar: true,
  });

  // Fetch Google Calendar token to check if connected
  const { data: googleToken } = useQuery({
    queryKey: ['google-calendar-token', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isGoogleConnected = !!googleToken;

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    // Check if we have a code and user is loaded
    if (code && state && user?.id) {
      // Verify state matches user id for security
      if (user.id !== state) {
        window.history.replaceState({}, '', '/schedule');
        return;
      }

      // Exchange code for tokens
      const exchangeCode = async () => {
        try {
          const { error } = await supabase.functions.invoke('google-calendar-auth', {
            body: {
              action: 'exchange_code',
              code,
              redirect_uri: `${window.location.origin}/schedule`,
            },
          });

          if (error) {
            throw error;
          }

          toast({ title: 'Google Calendar conectado com sucesso!' });
          queryClient.invalidateQueries({ queryKey: ['google-calendar-token'] });
          
          // Clean URL
          window.history.replaceState({}, '', '/schedule');
        } catch {
          toast({ 
            title: 'Erro ao conectar Google Calendar', 
            description: 'Verifique as configurações no Google Cloud Console.',
            variant: 'destructive' 
          });
          window.history.replaceState({}, '', '/schedule');
        }
      };

      exchangeCode();
    }
  }, [user?.id, toast, queryClient]);


  // Fetch sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*, patients(full_name)')
        .eq('professional_id', profile.user_id)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!profile?.id,
  });

  // Fetch Google Calendar events
  const { data: googleEvents = [] } = useQuery({
    queryKey: ['google-calendar-events', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('google_calendar_events')
        .select('*')
        .eq('professional_id', profile.user_id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch patients for the dropdown
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('professional_id', profile.user_id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!profile?.id,
  });

  // Generate recurring dates for the current month
  const generateRecurringDates = (startDate: Date, recurrenceType: string): Date[] => {
    const dates: Date[] = [startDate];
    const monthEnd = endOfMonth(startDate);
    
    if (recurrenceType === 'none') return dates;
    
    let nextDate = startDate;
    
    while (true) {
      if (recurrenceType === 'weekly') {
        nextDate = addWeeks(nextDate, 1);
      } else if (recurrenceType === 'biweekly') {
        nextDate = addWeeks(nextDate, 2);
      } else if (recurrenceType === 'monthly') {
        // For monthly, just one session this month
        break;
      }
      
      if (isAfter(nextDate, monthEnd)) break;
      dates.push(nextDate);
    }
    
    return dates;
  };

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (session: typeof newSession) => {
      if (!profile?.user_id) throw new Error('Usuário não autenticado');
      
      const selectedPatient = patients.find(p => p.id === session.patient_id);
      const price = session.price || selectedPatient?.session_price || profile.session_price || 0;
      const scheduledDate = new Date(session.scheduled_at);
      
      // Generate all dates based on recurrence
      const recurringDates = generateRecurringDates(scheduledDate, session.recurrence_type);
      
      // Create sessions for all dates
      const sessionsToInsert = recurringDates.map((date, index) => ({
        professional_id: profile.user_id,
        patient_id: session.patient_id,
        scheduled_at: date.toISOString(),
        duration: session.duration,
        price: Number(price),
        notes: session.notes || null,
        is_recurring: session.recurrence_type !== 'none',
        recurrence_rule: session.recurrence_type !== 'none' ? session.recurrence_type : null,
        title: `Sessão - ${selectedPatient?.full_name || 'Paciente'}`,
      }));
      
      const { error } = await supabase.from('sessions').insert(sessionsToInsert);
      if (error) throw error;
      
      // Sync with Google Calendar if enabled and connected
      let meetLinksCreated = 0;
      if (session.sync_google_calendar && isGoogleConnected) {
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('google-calendar-sync', {
            body: { action: 'sync' },
          });
          
          if (!syncError && syncResult?.synced) {
            meetLinksCreated = syncResult.synced;
          }
        } catch (syncErr) {
          console.error('Error syncing with Google Calendar:', syncErr);
        }
      }
      
      return { count: recurringDates.length, meetLinksCreated };
    },
    onSuccess: ({ count, meetLinksCreated }) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsDialogOpen(false);
      setNewSession({
        patient_id: '',
        scheduled_at: '',
        duration: 50,
        price: '',
        notes: '',
        recurrence_type: 'none',
        sync_google_calendar: true,
      });
      
      let message = count > 1 
        ? `${count} sessões agendadas com sucesso!` 
        : 'Sessão agendada com sucesso!';
      
      if (meetLinksCreated > 0) {
        message += ` Link do Meet criado automaticamente.`;
      }
      
      toast({ title: message });
    },
    onError: () => {
      toast({ title: 'Erro ao agendar sessão', variant: 'destructive' });
    },
  });

  // Update session status mutation
  const updateSessionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ status: status as Session['status'] })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  // Update session mutation (for editing)
  const updateSession = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Session> }) => {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Sessão atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar sessão', variant: 'destructive' });
    },
  });

  // Reschedule session mutation (for drag & drop)
  const rescheduleSession = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: Date }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ scheduled_at: newDate.toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Sessão reagendada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao reagendar sessão', variant: 'destructive' });
    },
  });

  // Delete session mutation
  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setDeleteSessionId(null);
      toast({ title: 'Sessão excluída!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir sessão', variant: 'destructive' });
    },
  });

  // Session to delete state
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setIsDetailModalOpen(true);
  };

  const handleDropSession = (sessionId: string, newDate: Date) => {
    rescheduleSession.mutate({ id: sessionId, newDate });
  };

  const handleUpdateSession = (id: string, updates: Partial<Session>) => {
    updateSession.mutate({ id, updates });
  };

  const handleStatusChange = (id: string, status: string) => {
    updateSessionStatus.mutate({ id, status });
  };


  // Filter out cancelled sessions from calendar views
  const visibleSessions = sessions.filter(s => s.status !== 'cancelled');

  const futureSessions = visibleSessions.filter(
    (s) => new Date(s.scheduled_at) >= new Date() && s.status === 'scheduled'
  );

  const pastSessions = sessions.filter(
    (s) => new Date(s.scheduled_at) < new Date() || s.status !== 'scheduled'
  );

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6 p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gerencie suas sessões e compromissos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nova Sessão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Sessão</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Paciente</Label>
                  <Select
                    value={newSession.patient_id}
                    onValueChange={(value) =>
                      setNewSession({ ...newSession, patient_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Time Slot Picker */}
                <div>
                  <Label className="mb-2 block">Horário Disponível</Label>
                  <TimeSlotPicker
                    onSelect={(date) => {
                      setNewSession({ ...newSession, scheduled_at: date.toISOString() });
                    }}
                  />
                  {newSession.scheduled_at && (
                    <p className="text-sm text-primary mt-2">
                      Selecionado: {format(new Date(newSession.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duração (min)</Label>
                    <Input
                      type="number"
                      value={newSession.duration}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          duration: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newSession.price}
                      onChange={(e) =>
                        setNewSession({ ...newSession, price: e.target.value })
                      }
                      placeholder="Valor padrão"
                    />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={newSession.notes}
                    onChange={(e) =>
                      setNewSession({ ...newSession, notes: e.target.value })
                    }
                    placeholder="Notas sobre a sessão..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Recorrência</Label>
                  <Select
                    value={newSession.recurrence_type}
                    onValueChange={(value: 'none' | 'weekly' | 'biweekly' | 'monthly') =>
                      setNewSession({ ...newSession, recurrence_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a recorrência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não recorrente</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                  {newSession.recurrence_type !== 'none' && newSession.scheduled_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Serão criadas sessões até o final do mês de {format(new Date(newSession.scheduled_at), 'MMMM', { locale: ptBR })}
                    </p>
                  )}
                </div>
                
                {/* Google Calendar Sync */}
                {isGoogleConnected && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Sincronizar com Google</p>
                        <p className="text-xs text-muted-foreground">
                          Criar evento e link do Meet automaticamente
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={newSession.sync_google_calendar}
                      onCheckedChange={(checked) =>
                        setNewSession({ ...newSession, sync_google_calendar: checked })
                      }
                    />
                  </div>
                )}
                
                <Button
                  className="w-full"
                  onClick={() => createSession.mutate(newSession)}
                  disabled={!newSession.patient_id || !newSession.scheduled_at || createSession.isPending}
                >
                  {createSession.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    'Agendar Sessão'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 md:flex md:w-auto">
            <TabsTrigger value="calendar" className="text-xs md:text-sm">Calendário</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs md:text-sm">Próximas ({futureSessions.length})</TabsTrigger>
            <TabsTrigger value="past" className="text-xs md:text-sm">Anteriores</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 text-xs md:text-sm">
              <Settings2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CalendarHeader
                  currentDate={currentDate}
                  onDateChange={(date) => {
                    setCurrentDate(date);
                    setSelectedDate(date);
                  }}
                  viewType={viewType}
                  onViewTypeChange={setViewType}
                  showGoogleEvents={showGoogleEvents}
                  onShowGoogleEventsChange={setShowGoogleEvents}
                />
              </CardHeader>
              <CardContent>
                {viewType === 'day' && (
                  <DayView
                    selectedDate={selectedDate}
                    sessions={visibleSessions}
                    googleEvents={showGoogleEvents ? googleEvents : []}
                    onSessionClick={handleSessionClick}
                    onDropSession={handleDropSession}
                  />
                )}
                {viewType === 'week' && (
                  <WeekView
                    currentDate={currentDate}
                    sessions={visibleSessions}
                    googleEvents={showGoogleEvents ? googleEvents : []}
                    onSessionClick={handleSessionClick}
                    onDropSession={handleDropSession}
                  />
                )}
                {viewType === 'month' && (
                  <MonthView
                    currentDate={currentDate}
                    sessions={visibleSessions}
                    googleEvents={showGoogleEvents ? googleEvents : []}
                    selectedDate={selectedDate}
                    onDayClick={(date) => {
                      setSelectedDate(date);
                      setViewType('day');
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Sessions Tab */}
          <TabsContent value="upcoming" className="space-y-4">
            {loadingSessions ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : futureSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma sessão agendada
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {futureSessions.map((session) => (
                  <Card key={session.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{session.patients?.full_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(session.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                            <Clock className="h-4 w-4 ml-2" />
                            {session.duration} min
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={sessionStatusColors[session.status || 'scheduled']}
                        >
                          {sessionStatusLabels[session.status || 'scheduled']}
                        </Badge>
                        <Select
                          value={session.status || 'scheduled'}
                          onValueChange={(value) =>
                            updateSessionStatus.mutate({ id: session.id, status: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Agendada</SelectItem>
                            <SelectItem value="completed">Realizada</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                            <SelectItem value="no_show">Não compareceu</SelectItem>
                          </SelectContent>
                        </Select>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSessionClick(session)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteSessionId(session.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Past Sessions Tab */}
          <TabsContent value="past" className="space-y-4">
            {pastSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma sessão anterior
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastSessions.slice(0, 20).map((session) => (
                  <Card key={session.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">{session.patients?.full_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(session.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={sessionStatusColors[session.status || 'scheduled']}
                        >
                          {sessionStatusLabels[session.status || 'scheduled']}
                        </Badge>
                        <Select
                          value={session.status || 'scheduled'}
                          onValueChange={(value) =>
                            updateSessionStatus.mutate({ id: session.id, status: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Agendada</SelectItem>
                            <SelectItem value="completed">Realizada</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                            <SelectItem value="no_show">Não compareceu</SelectItem>
                          </SelectContent>
                        </Select>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSessionClick(session)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteSessionId(session.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <AvailabilitySettings />
                <BlockedSlots />
              </div>
              <div>
                <GoogleCalendarIntegration />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Session Detail Modal */}
        <SessionDetailModal
          session={selectedSession}
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          onUpdate={handleUpdateSession}
          onStatusChange={handleStatusChange}
        />

        {/* Delete Session Confirmation */}
        <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteSessionId && deleteSession.mutate(deleteSessionId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteSession.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
