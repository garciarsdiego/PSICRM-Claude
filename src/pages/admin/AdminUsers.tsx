import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Search, MoreHorizontal, UserX, Shield, Loader2, KeyRound, RefreshCcw, UserPlus, Pencil, AlertTriangle } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';

// Define UserProfile type (without relying on external hooks that might be outdated)
type UserProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
    status?: string | null;
    created_at: string;
    last_sign_in_at?: string | null; // From auth metadata if available, or manual tracking
};

export default function AdminUsers() {
    const { user: currentUser } = useAuth();

    // Custom fetch to ensure we get what we need and handle errors gracefully
    const { data: users, isLoading, error, refetch } = useQuery({
        queryKey: ['admin-users-full'],
        queryFn: async () => {
            // Fetch profiles
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as UserProfile[];
        }
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

    // Edit Dialog State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Create User State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createEmail, setCreateEmail] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createName, setCreateName] = useState('');
    const [createRole, setCreateRole] = useState('patient');
    const [isCreating, setIsCreating] = useState(false);

    const handleEditClick = (user: UserProfile) => {
        setSelectedUser(user);
        setEditName(user.full_name || '');
        setEditStatus(user.status || 'active');
        setIsEditOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editName,
                    status: editStatus
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            toast.success('Usuário atualizado com sucesso!');
            setIsEditOpen(false);
            refetch();
        } catch (err) {
            toast.error('Erro ao atualizar usuário: ' + (err as Error).message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;
            toast.success(`Status atualizado para ${newStatus}`);
            refetch();
        } catch (err) {
            toast.error(`Erro ao atualizar status: ${(err as Error).message}`);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            // Warning: supabase.auth.signUp signs the user in immediately!
            // This is a known limitation of client-side auth administrative actions.
            const { error } = await supabase.auth.signUp({
                email: createEmail,
                password: createPassword,
                options: {
                    data: {
                        full_name: createName,
                        role: createRole // Ideally this should be set properly in profiles
                    }
                }
            });

            if (error) throw error;

            toast.success('Usuário criado com sucesso! Sessão atual pode ter sido encerrada.');
            setIsCreateOpen(false);
            // We might need to reload or let the AuthContext handle the redirect if session changed
            window.location.href = '/auth'; // Force re-login or check
        } catch (err) {
            toast.error('Erro ao criar usuário: ' + (err as Error).message);
            setIsCreating(false);
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

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Gestão de Usuários</h1>
                        <p className="text-slate-500 dark:text-slate-400">Gerencie acesso e permissões de todos os usuários.</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Novo Usuário
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Todos os Usuários ({users?.length || 0})</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => refetch()} title="Recarregar lista">
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrar por nome ou email..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Criado em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    users?.filter(u =>
                                        !searchTerm ||
                                        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                    ).map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.full_name || 'Sem nome'}</TableCell>
                                            <TableCell>{user.email || 'Sem email'}</TableCell>
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

                                                        <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator />

                                                        {user.status === 'pending' && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')} className="text-green-600">
                                                                <Shield className="mr-2 h-4 w-4" />
                                                                Aprovar Acesso
                                                            </DropdownMenuItem>
                                                        )}

                                                        {user.status === 'active' && (
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

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>
                                Atualize as informações do perfil do usuário.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="pending">Pendente</SelectItem>
                                        <SelectItem value="suspended">Suspenso</SelectItem>
                                        <SelectItem value="rejected">Rejeitado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                            <Button onClick={handleUpdateUser} disabled={isUpdating}>
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Criar Novo Usuário</DialogTitle>
                            <DialogDescription className="text-amber-600 font-medium flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <span>
                                    Atenção: Criar um usuário irá desconectar sua sessão atual de administrador e logar como o novo usuário.
                                    Recomendamos fazer isso em uma janela anônima.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-name">Nome Completo</Label>
                                    <Input id="create-name" value={createName} onChange={(e) => setCreateName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-email">Email</Label>
                                    <Input id="create-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-password">Senha Provisória</Label>
                                    <Input id="create-password" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-role">Função Inicial</Label>
                                    <Select value={createRole} onValueChange={setCreateRole}>
                                        <SelectTrigger id="create-role">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="patient">Paciente</SelectItem>
                                            <SelectItem value="professional">Profissional</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Criar Usuário
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
