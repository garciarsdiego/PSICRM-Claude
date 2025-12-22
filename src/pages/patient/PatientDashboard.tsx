import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientLayout } from '@/components/patient/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  Clock,
  CalendarPlus,
  MessageSquare,
  User,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'>;

export default function PatientDashboard() {
  const { profile, user } = useAuth();

  // Fetch patient record for this user
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

  // Fetch upcoming sessions
  const { data: upcomingSessions = [] } = useQuery({
    queryKey: ['patient-upcoming-sessions', patientRecord?.id],
    queryFn: async () => {
      if (!patientRecord?.id) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientRecord.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!patientRecord?.id,
  });

  // Fetch pending payments
  const { data: pendingPayments = [] } = useQuery({
    queryKey: ['patient-pending-payments', patientRecord?.id],
    queryFn: async () => {
      if (!patientRecord?.id) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientRecord.id)
        .in('payment_status', ['pending', 'overdue'])
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!patientRecord?.id,
  });

  const totalPending = pendingPayments.reduce((acc, s) => acc + Number(s.price), 0);

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu portal de atendimento
          </p>
        </div>

        {!patientRecord && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="py-4">
              <p className="text-warning-foreground">
                Seu cadastro ainda não foi vinculado a um profissional. Entre em contato
                com seu psicólogo para que ele vincule sua conta.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Próximas Sessões</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingSessions.length}</div>
              <p className="text-xs text-muted-foreground">sessões agendadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
              <CreditCard className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                R$ {totalPending.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingPayments.length} sessão(ões)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Próxima Sessão</CardTitle>
              <Clock className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {upcomingSessions[0] ? (
                <>
                  <div className="text-2xl font-bold">
                    {format(new Date(upcomingSessions[0].scheduled_at), 'dd/MM', {
                      locale: ptBR,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(upcomingSessions[0].scheduled_at), "HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Nenhuma agendada</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/patient/book">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CalendarPlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Agendar Sessão</h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha um horário disponível
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/patient/payments">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                  <CreditCard className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">Realizar Pagamento</h3>
                  <p className="text-sm text-muted-foreground">
                    {pendingPayments.length > 0
                      ? `${pendingPayments.length} pendente(s)`
                      : 'Tudo em dia!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/patient/messages">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <MessageSquare className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Enviar Mensagem</h3>
                  <p className="text-sm text-muted-foreground">
                    Fale com seu profissional
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Próximas Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(new Date(session.scheduled_at), "EEEE, dd 'de' MMMM", {
                            locale: ptBR,
                          })}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(session.scheduled_at), 'HH:mm', { locale: ptBR })}
                          <span>•</span>
                          {session.duration} min
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      Confirmada
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link to="/patient/sessions">
                  <Button variant="outline" className="w-full">
                    Ver todas as sessões
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PatientLayout>
  );
}
