import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Building2, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
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

export default function AdminClinics() {
    const { data: clinics, isLoading, error } = useQuery({
        queryKey: ['admin-clinics'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clinics')
                .select(`
                    *,
                    owner:profiles!clinics_owner_id_profiles_fkey(full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full pt-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="p-6 text-red-500">
                    Erro ao carregar clínicas: {(error as Error).message}.
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Gestão de Clínicas</h1>
                        <p className="text-slate-500 dark:text-slate-400">Gerencie todas as clínicas cadastradas no sistema.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Todas as Clínicas ({clinics?.length || 0})</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Buscar clínicas..." className="pl-8" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Proprietário</TableHead>
                                    <TableHead>Criado em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clinics?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma clínica encontrada.</TableCell>
                                    </TableRow>
                                ) : (
                                    clinics?.map((clinic) => (
                                        <TableRow key={clinic.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-primary" />
                                                    {clinic.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {clinic.owner?.full_name || 'Desconhecido'}
                                                <span className="block text-xs text-muted-foreground">{clinic.owner?.email}</span>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(clinic.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
