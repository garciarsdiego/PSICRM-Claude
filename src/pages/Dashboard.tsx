import { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { UpcomingSessions } from '@/components/dashboard/UpcomingSessions';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Users, Calendar, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getLastMonthsBoundaries } from '@/lib/dateUtils';
import { DEFAULTS } from '@/lib/constants';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    activePatients: 0,
    monthSessions: 0,
    pendingPayments: 0,
  });
  const [todaySessions, setTodaySessions] = useState<Array<{
    id: string;
    scheduled_at: string;
    status: string;
    patient: { full_name: string } | null;
  }>>([]);
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    try {
      // Buscar estatísticas em paralelo
      const [
        patientsResult,
        sessionsResult,
        todayResult,
        paymentsResult,
      ] = await Promise.all([
        // Pacientes ativos
        supabase
          .from('patients')
          .select('id', { count: 'exact' })
          .eq('professional_id', user.id)
          .eq('is_active', true),
        
        // Sessões do mês
        supabase
          .from('sessions')
          .select('*')
          .eq('professional_id', user.id)
          .gte('scheduled_at', monthStart.toISOString())
          .lte('scheduled_at', monthEnd.toISOString()),
        
        // Sessões de hoje
        supabase
          .from('sessions')
          .select('*, patient:patients(full_name)')
          .eq('professional_id', user.id)
          .gte('scheduled_at', dayStart.toISOString())
          .lte('scheduled_at', dayEnd.toISOString())
          .order('scheduled_at', { ascending: true }),
        
        // Pagamentos pendentes
        supabase
          .from('sessions')
          .select('price')
          .eq('professional_id', user.id)
          .eq('payment_status', 'pending'),
      ]);

      // Calcular receita do mês
      const monthlyRevenue = sessionsResult.data
        ?.filter(s => s.payment_status === 'paid')
        .reduce((acc, s) => acc + Number(s.price), 0) || 0;

      // Calcular pagamentos pendentes
      const pendingPayments = paymentsResult.data
        ?.reduce((acc, s) => acc + Number(s.price), 0) || 0;

      setStats({
        monthlyRevenue,
        activePatients: patientsResult.count || 0,
        monthSessions: sessionsResult.data?.length || 0,
        pendingPayments,
      });

      setTodaySessions(todayResult.data || []);

      // Buscar receita dos últimos 6 meses em UMA ÚNICA query (fix N+1)
      const monthBoundaries = getLastMonthsBoundaries(DEFAULTS.REVENUE_MONTHS_TO_SHOW);
      const sixMonthsAgo = monthBoundaries[0].start;
      const today = monthBoundaries[monthBoundaries.length - 1].end;

      const { data: allRevenueSessions } = await supabase
        .from('sessions')
        .select('price, scheduled_at')
        .eq('professional_id', user.id)
        .eq('payment_status', 'paid')
        .gte('scheduled_at', sixMonthsAgo.toISOString())
        .lte('scheduled_at', today.toISOString());

      // Agrupar por mês no cliente
      const revenueByMonth = monthBoundaries.map(({ start, end, label }) => {
        const monthRevenue = (allRevenueSessions || [])
          .filter(s => {
            const sessionDate = new Date(s.scheduled_at);
            return sessionDate >= start && sessionDate <= end;
          })
          .reduce((acc, s) => acc + Number(s.price), 0);

        return { month: label, revenue: monthRevenue };
      });

      setRevenueData(revenueByMonth);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Profissional'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatsCard
            title="Receita do Mês"
            value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-6 h-6" />}
          />
          <StatsCard
            title="Pacientes Ativos"
            value={stats.activePatients}
            icon={<Users className="w-6 h-6" />}
          />
          <StatsCard
            title="Sessões do Mês"
            value={stats.monthSessions}
            icon={<Calendar className="w-6 h-6" />}
          />
          <StatsCard
            title="Saldo Devedor"
            value={`R$ ${stats.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<AlertCircle className="w-6 h-6" />}
            className="border-warning/50"
          />
        </div>

        {/* Charts and Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart data={revenueData} />
          <UpcomingSessions sessions={todaySessions} />
        </div>
      </div>
    </AppLayout>
  );
}
