import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
    const handleSave = () => {
        toast.success("Configurações salvas com sucesso!");
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Configurações do Sistema</h1>
                    <p className="text-slate-500 dark:text-slate-400">Ajustes globais da plataforma.</p>
                </div>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList>
                        <TabsTrigger value="general">Geral</TabsTrigger>
                        <TabsTrigger value="subscriptions">Planos & Assinaturas</TabsTrigger>
                        <TabsTrigger value="integrations">Integrações</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações da Plataforma</CardTitle>
                                <CardDescription>Identidade básica do sistema</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="appName">Nome da Aplicação</Label>
                                    <Input id="appName" defaultValue="PSICRM" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="supportEmail">Email de Suporte</Label>
                                    <Input id="supportEmail" defaultValue="suporte@psicrm.com" />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div className="space-y-0.5">
                                        <Label>Modo de Manutenção</Label>
                                        <p className="text-sm text-muted-foreground">Impede login de novos usuários (exceto admins)</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div className="space-y-0.5">
                                        <Label>Registro de Novos Usuários</Label>
                                        <p className="text-sm text-muted-foreground">Permitir que novos profissionais se cadastrem</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <Button onClick={handleSave}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Salvar Alterações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="subscriptions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gerenciamento de Planos</CardTitle>
                                <CardDescription>Configure os níveis de assinatura (Stripe/Pagar.me)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="integrations">
                        <Card>
                            <CardHeader>
                                <CardTitle>Chaves de API Globais</CardTitle>
                                <CardDescription>Configurações de serviços externos</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>API Key Google Calendar (Server)</Label>
                                    <Input type="password" value="************************" readOnly />
                                </div>
                                <div className="grid gap-2">
                                    <Label>API Key OpenAI (IA)</Label>
                                    <Input type="password" value="************************" readOnly />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
