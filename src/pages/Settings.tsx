import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { ThemeCustomizer } from '@/components/settings/ThemeCustomizer';
import {
  User,
  Users,
  Settings as SettingsIcon,
  Globe,
  Save,
  Palette,
} from 'lucide-react';

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const languages = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
];

export default function Settings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    crp: '',
    specialty: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    session_duration: 50,
    session_price: 0,
    language: 'pt-BR',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        crp: profile.crp || '',
        specialty: profile.specialty || '',
        bio: profile.bio || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zip_code: profile.zip_code || '',
        session_duration: profile.session_duration || 50,
        session_price: profile.session_price || 0,
        language: profile.language || 'pt-BR',
      });
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Perfil não encontrado');
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          crp: formData.crp || null,
          specialty: formData.specialty || null,
          bio: formData.bio || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          session_duration: formData.session_duration,
          session_price: formData.session_price,
          language: formData.language,
        })
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Perfil atualizado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
    },
  });

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6 p-4 lg:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie seu perfil e preferências</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
          <TabsList className="w-full grid grid-cols-5 md:flex md:w-auto">
            <TabsTrigger value="profile" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>

            <TabsTrigger value="practice" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <SettingsIcon className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Consultório</span>
            </TabsTrigger>
            <TabsTrigger value="personalization" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Palette className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Personalização</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Globe className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Preferências</span>
            </TabsTrigger>
            <TabsTrigger value="team" onClick={() => navigate('/settings/team')} className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Equipe</span>
            </TabsTrigger>
          </TabsList>

          {/* Personalization Tab */}
          <TabsContent value="personalization">
            <ThemeCustomizer />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Seus dados pessoais e informações de contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input value={formData.email} disabled />
                    <p className="text-xs text-muted-foreground mt-1">
                      O e-mail não pode ser alterado
                    </p>
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label>CRP</Label>
                    <Input
                      value={formData.crp}
                      onChange={(e) =>
                        setFormData({ ...formData, crp: e.target.value })
                      }
                      placeholder="00/00000"
                    />
                  </div>
                </div>

                <div>
                  <Label>Especialidade</Label>
                  <Input
                    value={formData.specialty}
                    onChange={(e) =>
                      setFormData({ ...formData, specialty: e.target.value })
                    }
                    placeholder="Ex: Psicologia Clínica, TCC, Psicanálise..."
                  />
                </div>

                <div>
                  <Label>Biografia</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="Uma breve descrição sobre você e sua prática..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>
                  Localização do seu consultório
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Endereço</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Rua, número, complemento"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) =>
                        setFormData({ ...formData, state: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={formData.zip_code}
                      onChange={(e) =>
                        setFormData({ ...formData, zip_code: e.target.value })
                      }
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Practice Tab */}
          <TabsContent value="practice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Atendimento</CardTitle>
                <CardDescription>
                  Valores e duração padrão das sessões
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Duração da Sessão (minutos)</Label>
                    <Input
                      type="number"
                      min={30}
                      max={120}
                      value={formData.session_duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          session_duration: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Valor da Sessão (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formData.session_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          session_price: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Agendamento Online
                </CardTitle>
                <CardDescription>
                  Link público para pacientes agendarem sessões iniciais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/book/${profile?.user_id || ''}`}
                    className="font-mono text-sm bg-background"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = `${window.location.origin}/book/${profile?.user_id}`;
                      navigator.clipboard.writeText(link);
                      toast({ title: 'Link copiado!' });
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Compartilhe este link em suas redes sociais ou site para receber agendamentos automaticamente.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Idioma e Região</CardTitle>
                <CardDescription>
                  Configurações de idioma do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <Label>Idioma</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      setFormData({ ...formData, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacidade e Segurança</CardTitle>
                <CardDescription>
                  Gerencie a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Alterar Senha</p>
                    <p className="text-sm text-muted-foreground">
                      Recomendamos trocar sua senha periodicamente
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
                    Alterar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">LGPD</p>
                    <p className="text-sm text-muted-foreground">
                      Seus dados são protegidos conforme a lei
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/privacy-policy')}>
                    Ver Política
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={() => saveProfile.mutate()}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>

        <ChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
        />
      </div>
    </AppLayout >
  );
}
