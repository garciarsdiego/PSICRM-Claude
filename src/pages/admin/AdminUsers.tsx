import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MoreHorizontal, UserX, Shield, Loader2, KeyRound, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminUsers, useUpdateUserStatus, UserProfile } from '@/hooks/useAdmin';

export default function AdminUsers() {
    const { user, role } = useAuth();
    const { data: users, isLoading, error, refetch } = useAdminUsers();
    const updateUserStatus = useUpdateUserStatus();

    // Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [directSearchEmail, setDirectSearchEmail] = useState('');
    const [directSearchResults, setDirectSearchResults] = useState<UserProfile[]>([]);

    const handleDirectSearch = async () => {
        if (!directSearchEmail) return;
        try {
            console.log("Direct searching for:", directSearchEmail);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', `%${directSearchEmail}%`)
                .limit(10);

            if (error) throw error;
            if (data && data.length > 0) {
                setDirectSearchResults(data as UserProfile[]);
                toast.success(`${data.length} usuário(s) encontrado(s)!`);
            } else {
                setDirectSearchResults([]);
                toast.error('Nenhum usuário encontrado.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro na busca: ' + (err as Error).message);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        try {
            await updateUserStatus.mutateAsync({ userId, status: newStatus });
            toast.success(`Status atualizado para ${newStatus}`);
            // If we have a direct result displayed, update it too
            if (directSearchResults.some(u => u.id === userId)) {
                setDirectSearchResults(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
            }
        } catch (err) {
            toast.error(`Erro ao atualizar status: ${(err as Error).message}`);
        }
    };

    const handleSyncUsers = async () => {
        try {
            toast.info('Sincronizando usuários...');
            const { error } = await supabase.rpc('sync_missing_profiles');
            if (error) throw error;
            await refetch();
            toast.success('Sincronização concluída!');
        } catch (err) {
            toast.error('Erro ao sincronizar usuários');
            console.error(err);
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!email) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth?type=recovery`,
            });
            if (error) throw error;
            toast.success(`Email de redefinição enviado para ${email}`);
        } catch (err) {
            toast.error(`Erro ao enviar email: ${(err as Error).message}`);
        }
    };

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
                    Erro ao carregar usuários: {(error as Error).message}. <br />
                    Verifique se você tem permissão de administrador ou se as tabelas foram criadas.
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Gestão de Usuários</h1>
                        <p className="text-slate-500 dark:text-slate-400">Gerencie acesso e permissões de todos os usuários.</p>
                        <p className="text-xs text-muted-foreground mt-1">Debug: Logged as {role} ({user?.email})</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Todos os Usuários ({users?.length || 0})</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => refetch()} title="Recarregar lista">
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                                {/* Removed sync button as it requires server-side migration execution */}
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrar na tela..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Direct Database Search */}
                        <div className="mt-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-medium mb-2">Busca Direta no Banco (Recuperação)</h3>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Digite o E-mail exato do usuário..."
                                    value={directSearchEmail}
                                    onChange={(e) => setDirectSearchEmail(e.target.value)}
                                    className="max-w-md"
                                />
                                <Button variant="secondary" onClick={handleDirectSearch} disabled={!directSearchEmail}>
                                    Buscar
                                </Button>
                            </div>
                            {directSearchResults.length > 0 && (
                                <div className="mt-4 border rounded p-3 bg-white dark:bg-slate-800 space-y-2">
                                    <p className="font-bold text-green-600 mb-2">Usuários Encontrados:</p>
                                    {directSearchResults.map(res => (
                                        <div key={res.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p>{res.full_name} ({res.email})</p>
                                                <p className="text-xs text-muted-foreground">ID: {res.id}</p>
                                                <p className="text-xs">Status: {res.status || 'NULO'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleStatusChange(res.id, 'active')} className="bg-green-600 hover:bg-green-700">
                                                    Aprovar
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleStatusChange(res.id, 'suspended')}>
                                                    Suspender
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Último Acesso</TableHead>
                                    <TableHead>Criado em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    users?.filter(u =>
                                        !searchTerm ||
                                        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.full_name || 'Sem nome'}</TableCell>
                                            <TableCell>{user.email || 'Sem email'}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'professional' ? 'default' : 'secondary'}>
                                                    {user.role || 'user'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    user.status === 'active' ? 'outline' :
                                                        user.status === 'pending' ? 'secondary' :
                                                            'destructive'
                                                } className={
                                                    user.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200' :
                                                        user.status === 'pending' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' : ''
                                                }>
                                                    {user.status || 'active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {/* @ts-ignore - last_seen might not be in types yet */}
                                                {user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Nunca'}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>

                                                        {user.status === 'pending' && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')} className="text-green-600">
                                                                <Shield className="mr-2 h-4 w-4" />
                                                                Aprovar Acesso
                                                            </DropdownMenuItem>
                                                        )}

                                                        {user.status === 'active' && user.role !== 'admin' && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'suspended')} className="text-amber-600">
                                                                <UserX className="mr-2 h-4 w-4" />
                                                                Suspender
                                                            </DropdownMenuItem>
                                                        )}

                                                        {user.status === 'suspended' && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')} className="text-green-600">
                                                                <Shield className="mr-2 h-4 w-4" />
                                                                Reativar
                                                            </DropdownMenuItem>
                                                        )}

                                                        <DropdownMenuSeparator />

                                                        <DropdownMenuItem onClick={() => user.email && handleResetPassword(user.email)}>
                                                            <KeyRound className="mr-2 h-4 w-4" />
                                                            Resetar Senha
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>Editar Permissões</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600">
                                                            <UserX className="mr-2 h-4 w-4" />
                                                            Inativar Usuário
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
