import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Building2, TrendingUp, Activity, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

export default function AdminDashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            // 1. Total Users (Profiles)
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 2. Total Patients (Global)
            const { count: patientsCount } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true });

            // 3. Gross Revenue (Deep Sessions Sum)
            // Note: This relies on RLS allowing the admin to see sessions. If 0, RLS is blocking.
            const { data: sessions } = await supabase
                .from('sessions')
                .select('price, created_at')
                .eq('status', 'completed'); // Only count completed sessions

            const totalRevenue = sessions?.reduce((sum, session) => sum + (session.price || 0), 0) || 0;

            return {
                users: usersCount || 0,
                patients: patientsCount || 0,
                revenue: totalRevenue,
                sessionsCount: sessions?.length || 0
            };
        },
    });

    const { data: recentUsers } = useQuery({
        queryKey: ['admin-recent-users'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('full_name, created_at, email')
                .order('created_at', { ascending: false })
                .limit(5);
            return data || [];
        },
    });

    // Mock growth data based on recent users (since we don't have historical aggregates)
    // In a real app we would use a database function for this.
    const chartData = [
        { name: 'Jan', users: 10 },
        { name: 'Fev', users: 15 },
        { name: 'Mar', users: 20 },
        { name: 'Abr', users: 35 },
        { name: 'Mai', users: stats?.users || 45 },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Painel Administrativo</h1>
                    <p className="text-slate-500 dark:text-slate-400">Visão geral do sistema e métricas principais.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.users}</div>
                            <p className="text-xs text-muted-foreground">+2 novos hoje</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Vidas Impactadas (Pacientes)</CardTitle>
                            <Activity className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.patients}</div>
                            <p className="text-xs text-muted-foreground">Em tratamento ativo</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Receita Bruta (Psicólogos)</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(stats?.revenue || 0)}</div>
                            <p className="text-xs text-muted-foreground">Sessões finalizadas</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Receita da Plataforma</CardTitle>
                            <Building2 className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">R$ 0,00</div>
                            <p className="text-xs text-muted-foreground">Plano Básico (Em breve)</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Crescimento de Usuários</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="name" className="text-xs" />
                                        <YAxis className="text-xs" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        />
                                        <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Novos Usuários</CardTitle>
                            <CardDescription>Recém cadastrados na plataforma</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-8">
                                {recentUsers?.map((user, i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                        <div className="ml-auto font-medium text-xs text-muted-foreground">
                                            {new Date(user.created_at || '').toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                ))}
                                {(!recentUsers || recentUsers.length === 0) && (
                                    <div className="text-sm text-muted-foreground text-center py-4">Nenhum usuário recente</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
