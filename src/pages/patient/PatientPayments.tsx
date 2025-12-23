import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientLayout } from '@/components/patient/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'>;

export default function PatientPayments() {
  const { user } = useAuth();
  const { toast } = useToast();

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

  // Fetch sessions with payment info
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['patient-payments', patientRecord?.id],
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

  const pendingSessions = sessions.filter(
    (s) => s.payment_status === 'pending' || s.payment_status === 'overdue'
  );

  const paidSessions = sessions.filter((s) => s.payment_status === 'paid');

  const totalPending = pendingSessions.reduce((acc, s) => acc + Number(s.price), 0);
  const totalPaid = paidSessions.reduce((acc, s) => acc + Number(s.price), 0);

  // Payment is disabled - requires proper payment gateway integration
  // Patients cannot mark their own sessions as paid - this must be done by the professional
  // or through a verified payment processor
  const handlePaymentClick = () => {
    toast({
      title: 'Pagamento',
      description: 'Entre em contato com o profissional para efetuar o pagamento.',
    });
  };

  const generatePixCode = () => {
    // Simulated PIX code - in production would generate real PIX
    const pixCode = '00020126580014br.gov.bcb.pix0136' + Math.random().toString(36).substring(7);
    navigator.clipboard.writeText(pixCode);
    toast({ title: 'Código PIX copiado!' });
  };

  return (
    <PatientLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie seus pagamentos e histórico financeiro
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                R$ {totalPending.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingSessions.length} sessão(ões)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                R$ {totalPaid.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {paidSessions.length} sessão(ões)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Payments */}
        {pendingSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Pagamentos Pendentes
              </CardTitle>
              <CardDescription>
                Selecione uma sessão para realizar o pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-warning/10 flex-shrink-0">
                      <Calendar className="h-5 w-5 md:h-6 md:w-6 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-sm md:text-base">
                        {format(new Date(session.scheduled_at), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Sessão às {format(new Date(session.scheduled_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-base md:text-lg">R$ {Number(session.price).toFixed(2)}</p>
                      <Badge
                        variant="outline"
                        className={
                          session.payment_status === 'overdue'
                            ? 'bg-destructive/20 text-destructive text-xs'
                            : 'bg-warning/20 text-warning text-xs'
                        }
                      >
                        {session.payment_status === 'overdue' ? 'Atrasado' : 'Pendente'}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 sm:gap-2">
                      <Button
                        size="sm"
                        onClick={handlePaymentClick}
                        variant="outline"
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pagar
                      </Button>
                      <Button size="sm" variant="outline" onClick={generatePixCode}>
                        <Copy className="h-4 w-4 mr-1" />
                        PIX
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pay All Button */}
              {pendingSessions.length > 1 && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Pagar todas as sessões</p>
                      <p className="text-sm text-muted-foreground">
                        Total: R$ {totalPending.toFixed(2)}
                      </p>
                    </div>
                    <Button size="lg">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar Tudo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {pendingSessions.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success" />
              <h3 className="font-semibold text-lg">Tudo em dia!</h3>
              <p className="text-muted-foreground">
                Você não possui pagamentos pendentes
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {paidSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paidSessions.slice(0, 10).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-medium">
                          Sessão de{' '}
                          {format(new Date(session.scheduled_at), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pago em{' '}
                          {session.paid_at &&
                            format(new Date(session.paid_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-success">
                      R$ {Number(session.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PatientLayout>
  );
}
