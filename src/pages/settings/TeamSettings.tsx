import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserPlus, Check, Loader2, AlertCircle } from 'lucide-react';
import { useClinic, useClinicMembers, useInviteMember, useCreateClinic } from '@/hooks/useClinic';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export default function TeamSettings() {
    const { data: clinic, isLoading: isLoadingClinic } = useClinic();
    const { data: members, isLoading: isLoadingMembers } = useClinicMembers(clinic?.id);
    const inviteMember_ = useInviteMember();
    const createClinic_ = useCreateClinic();

    const [inviteEmail, setInviteEmail] = useState('');
    const [newClinicName, setNewClinicName] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const handleInvite = async () => {
        if (!clinic?.id || !inviteEmail) return;
        try {
            await inviteMember_.mutateAsync({ clinicId: clinic.id, email: inviteEmail, role: 'member' });
            toast.success('Convite enviado com sucesso!');
            setInviteEmail('');
        } catch (error) {
            toast.error('Erro ao enviar convite: Funcionalidade ainda não implementada no backend.');
        }
    };

    const handleCreateClinic = async () => {
        if (!newClinicName.trim()) return;
        try {
            await createClinic_.mutateAsync(newClinicName);
            toast.success('Clínica criada com sucesso!');
            setIsCreateDialogOpen(false);
        } catch (error) {
            toast.error('Erro ao criar clínica: ' + (error as Error).message);
        }
    };

    if (isLoadingClinic) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!clinic) {
        return (
            <AppLayout>
                <div className="space-y-6 p-4 lg:p-6">
                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <AlertCircle className="h-5 w-5" />
                                Nenhuma Clínica Encontrada
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4">Você ainda não criou ou não foi adicionado a uma clínica.</p>
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>Criar Minha Clínica</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Criar Nova Clínica</DialogTitle>
                                        <DialogDescription>
                                            Dê um nome para sua clínica ou consultório. Você será o administrador.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label htmlFor="name" className="text-right">
                                            Nome da Clínica
                                        </Label>
                                        <Input
                                            id="name"
                                            value={newClinicName}
                                            onChange={(e) => setNewClinicName(e.target.value)}
                                            placeholder="Ex: Clínica Bem Estar"
                                            className="col-span-3 mt-2"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleCreateClinic} disabled={createClinic_.isPending}>
                                            {createClinic_.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Criar Clínica
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="space-y-6 p-4 lg:p-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestão da Clínica: {clinic.name}</h1>
                    <p className="text-muted-foreground">Gerencie sua equipe e níveis de acesso.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Team Members List */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Membros da Equipe ({members?.length || 0})</CardTitle>
                                <CardDescription>Pessoas com acesso à sua clínica</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Email do profissional"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-[200px] h-9"
                                />
                                <Button size="sm" onClick={handleInvite} disabled={!inviteEmail}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Convidar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {isLoadingMembers ? (
                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                                ) : members?.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">Nenhum membro encontrado.</p>
                                ) : (
                                    members?.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {member.profile?.full_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{member.profile?.full_name || 'Usuário'}</p>
                                                    <p className="text-sm text-muted-foreground">{member.profile?.email || 'Sem email'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm bg-secondary px-2 py-1 rounded-md text-secondary-foreground font-medium capitalize animate-in fade-in">
                                                    {member.role}
                                                </span>
                                                <Button variant="ghost" size="sm">Editar</Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Access Levels / Roles Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Níveis de Acesso</CardTitle>
                            <CardDescription>Configure o que cada função pode fazer</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Selecionar Função para Editar</Label>
                                    <select className="w-full p-2 border rounded-md bg-background">
                                        <option>Secretária</option>
                                        <option>Profissional Associado</option>
                                        <option>Estagiário</option>
                                    </select>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="font-medium text-sm">Permissões (Exemplo)</h4>

                                    <div className="flex items-center justify-between">
                                        <Label className="flex flex-col gap-1">
                                            <span>Ver Agenda Completa</span>
                                            <span className="font-normal text-xs text-muted-foreground">Todos os profissionais</span>
                                        </Label>
                                        <Switch defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label className="flex flex-col gap-1">
                                            <span>Financeiro</span>
                                            <span className="font-normal text-xs text-muted-foreground">Ver e editar pagamentos</span>
                                        </Label>
                                        <Switch />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label className="flex flex-col gap-1">
                                            <span>Prontuários</span>
                                            <span className="font-normal text-xs text-muted-foreground">Acesso a dados médicos</span>
                                        </Label>
                                        <Switch />
                                    </div>

                                    <Button className="w-full">
                                        <Check className="mr-2 h-4 w-4" />
                                        Salvar Permissões
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
