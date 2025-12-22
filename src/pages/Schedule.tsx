import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { AvailabilitySettings } from '@/components/schedule/AvailabilitySettings';
import { BlockedSlots } from '@/components/schedule/BlockedSlots';
import { GoogleCalendarIntegration } from '@/components/schedule/GoogleCalendarIntegration';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

type Patient = Tables<'patients'>;

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    patient_id: '',
    scheduled_at: '',
    duration: 50,
    price: '',
    notes: '',
    is_recurring: false,
  });

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    // Check if we have a code and user is loaded
    if (code && state && user?.id) {
      // Verify state matches user id for security
      if (user.id !== state) {
        console.error('OAuth state mismatch');
        window.history.replaceState({}, '', '/schedule');
        return;
      }

      // Exchange code for tokens
      const exchangeCode = async () => {
        try {
          console.log('Exchanging OAuth code...');
          const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
            body: {
              action: 'exchange_code',
              code,
              redirect_uri: `${window.location.origin}/schedule`,
            },
          });

          if (error) {
            console.error('Exchange error:', error);
            throw error;
          }

          console.log('Exchange response:', data);
          toast({ title: 'Google Calendar conectado com sucesso!' });
          queryClient.invalidateQueries({ queryKey: ['google-calendar-token'] });
          
          // Clean URL
          window.history.replaceState({}, '', '/schedule');
        } catch (err) {
          console.error('Error exchanging code:', err);
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (session: typeof newSession) => {
      if (!profile?.user_id) throw new Error('Usuário não autenticado');
      
      const selectedPatient = patients.find(p => p.id === session.patient_id);
      const price = session.price || selectedPatient?.session_price || profile.session_price || 0;
      
      const { error } = await supabase.from('sessions').insert({
        professional_id: profile.user_id,
        patient_id: session.patient_id,
        scheduled_at: session.scheduled_at,
        duration: session.duration,
        price: Number(price),
        notes: session.notes || null,
        is_recurring: session.is_recurring,
        title: `Sessão - ${selectedPatient?.full_name || 'Paciente'}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsDialogOpen(false);
      setNewSession({
        patient_id: '',
        scheduled_at: '',
        duration: 50,
        price: '',
        notes: '',
        is_recurring: false,
      });
      toast({ title: 'Sessão agendada com sucesso!' });
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

  const getSessionsForDay = (day: Date) => {
    return sessions.filter((s) => isSameDay(parseISO(s.scheduled_at), day));
  };

  const futureSessions = sessions.filter(
    (s) => new Date(s.scheduled_at) >= new Date() && s.status === 'scheduled'
  );

  const pastSessions = sessions.filter(
    (s) => new Date(s.scheduled_at) < new Date() || s.status !== 'scheduled'
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Gerencie suas sessões e compromissos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data e Hora</Label>
                    <Input
                      type="datetime-local"
                      value={newSession.scheduled_at}
                      onChange={(e) =>
                        setNewSession({ ...newSession, scheduled_at: e.target.value })
                      }
                    />
                  </div>
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
                    placeholder="Deixe em branco para usar valor padrão"
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={newSession.notes}
                    onChange={(e) =>
                      setNewSession({ ...newSession, notes: e.target.value })
                    }
                    placeholder="Notas sobre a sessão..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newSession.is_recurring}
                    onCheckedChange={(checked) =>
                      setNewSession({ ...newSession, is_recurring: checked })
                    }
                  />
                  <Label>Sessão recorrente (semanal)</Label>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createSession.mutate(newSession)}
                  disabled={!newSession.patient_id || !newSession.scheduled_at}
                >
                  Agendar Sessão
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
            <TabsTrigger value="upcoming">Próximas ({futureSessions.length})</TabsTrigger>
            <TabsTrigger value="past">Anteriores</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings2 className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(addDays(currentDate, -7))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      Hoje
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(addDays(currentDate, 7))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-32 rounded-lg border p-2',
                        isSameDay(day, new Date())
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground">
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
                      <div className="mt-2 space-y-1">
                        {getSessionsForDay(day).map((session) => (
                          <div
                            key={session.id}
                            className={cn(
                              'text-xs p-1 rounded truncate cursor-pointer',
                              sessionStatusColors[session.status || 'scheduled']
                            )}
                            title={`${session.patients?.full_name} - ${format(
                              new Date(session.scheduled_at),
                              'HH:mm'
                            )}`}
                          >
                            {format(new Date(session.scheduled_at), 'HH:mm')} -{' '}
                            {session.patients?.full_name?.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
                      <Badge
                        variant="outline"
                        className={sessionStatusColors[session.status || 'scheduled']}
                      >
                        {sessionStatusLabels[session.status || 'scheduled']}
                      </Badge>
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
      </div>
    </AppLayout>
  );
}
