import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminAudit() {
    const { data: logs, isLoading, error } = useQuery({
        queryKey: ['admin-audit'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    user:profiles!audit_logs_user_id_profiles_fkey(full_name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data;
        },
    });

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Log de Auditoria</h1>
                    <p className="text-slate-500 dark:text-slate-400">Rastreie as atividades importantes do sistema.</p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Últimas Atividades</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Buscar logs..." className="pl-8" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="p-4 text-red-500">Erro ao carregar logs: {(error as Error).message}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Entidade</TableHead>
                                        <TableHead>Detalhes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro encontrado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        logs?.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {log.user?.full_name || 'Sistema'}
                                                    <span className="block text-xs text-muted-foreground">{log.user?.email}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{log.action}</Badge>
                                                </TableCell>
                                                <TableCell>{log.entity}</TableCell>
                                                <TableCell className="max-w-md truncate text-muted-foreground">
                                                    {JSON.stringify(log.details)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
