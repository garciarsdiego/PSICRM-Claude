import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientLayout } from '@/components/patient/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, User } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'>;

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
  no_show: 'Faltou',
};

export default function PatientSessions() {
  const { user } = useAuth();

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

  // Fetch all sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['patient-all-sessions', patientRecord?.id],
    queryFn: async () => {
      if (!patientRecord?.id) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientRecord.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!patientRecord?.id,
  });

  const upcomingSessions = sessions.filter(
    (s) => new Date(s.scheduled_at) >= new Date() && s.status === 'scheduled'
  );

  const pastSessions = sessions.filter(
    (s) => new Date(s.scheduled_at) < new Date() || s.status !== 'scheduled'
  );

  const SessionCard = ({ session }: { session: Session }) => (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {format(new Date(session.scheduled_at), "EEEE, dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {format(new Date(session.scheduled_at), 'HH:mm', { locale: ptBR })}
              <span>•</span>
              {session.duration} min
              <span>•</span>
              R$ {Number(session.price).toFixed(2)}
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
          <Badge
            variant="outline"
            className={
              session.payment_status === 'paid'
                ? 'bg-success/20 text-success'
                : 'bg-warning/20 text-warning'
            }
          >
            {session.payment_status === 'paid' ? 'Pago' : 'Pendente'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Minhas Sessões</h1>
          <p className="text-muted-foreground">
            Visualize suas sessões agendadas e anteriores
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">
              Próximas ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">Anteriores ({pastSessions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : upcomingSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhuma sessão agendada</p>
                  <p className="text-sm">Agende sua próxima sessão!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma sessão anterior
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PatientLayout>
  );
}
