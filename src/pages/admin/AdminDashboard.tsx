import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Building2, TrendingUp, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
    // Mock data for display
    const stats = [
        { title: 'Total de Usuários', value: '1,234', change: '+12%', icon: Users, color: 'text-blue-500' },
        { title: 'Clínicas Ativas', value: '56', change: '+3', icon: Building2, color: 'text-purple-500' },
        { title: 'Receita Mensal', value: 'R$ 45.2k', change: '+8.1%', icon: TrendingUp, color: 'text-green-500' },
        { title: 'Para Análise', value: '12', change: '-2', icon: AlertCircle, color: 'text-orange-500' },
    ];

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Painel Administrativo</h1>
                    <p className="text-slate-500 dark:text-slate-400">Visão geral do sistema e métricas principais.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stat.change} desde o último mês
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Crescimento de Usuários</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded-md">
                                Gráfico de Crescimento (Mock)
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Atividades Recentes</CardTitle>
                            <CardDescription>
                                Últimas 5 ações críticas no sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-8">
                                {/* Mock activities */}
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                Nova clínica cadastrada
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Clínica "Mente Sã" por Dr. Andre
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium text-xs text-muted-foreground">
                                            há {i * 10} min
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
