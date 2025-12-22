import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Bell, CreditCard, Save, Eye } from 'lucide-react';

export default function Emails() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  // Fetch email settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['email-settings', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .eq('professional_id', profile.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const [formData, setFormData] = useState({
    reminder_enabled: true,
    reminder_days_before: 1,
    session_reminder_template:
      'Olá {{nome}}, lembrete: sua sessão está agendada para {{data}} às {{hora}}.',
    payment_reminder_enabled: true,
    payment_reminder_template:
      'Olá {{nome}}, você tem {{sessoes}} sessão(ões) pendente(s) no valor de R$ {{valor}}.',
  });

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormData({
        reminder_enabled: settings.reminder_enabled ?? true,
        reminder_days_before: settings.reminder_days_before ?? 1,
        session_reminder_template:
          settings.session_reminder_template ||
          'Olá {{nome}}, lembrete: sua sessão está agendada para {{data}} às {{hora}}.',
        payment_reminder_enabled: settings.payment_reminder_enabled ?? true,
        payment_reminder_template:
          settings.payment_reminder_template ||
          'Olá {{nome}}, você tem {{sessoes}} sessão(ões) pendente(s) no valor de R$ {{valor}}.',
      });
    }
  });

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!profile?.user_id) throw new Error('Usuário não autenticado');

      const settingsData = {
        professional_id: profile.user_id,
        ...formData,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('email_settings')
          .update(settingsData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_settings').insert(settingsData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      toast({ title: 'Configurações salvas!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    },
  });

  const renderPreview = (template: string) => {
    return template
      .replace('{{nome}}', 'João Silva')
      .replace('{{data}}', '25/12/2024')
      .replace('{{hora}}', '14:00')
      .replace('{{sessoes}}', '3')
      .replace('{{valor}}', '450,00');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">E-mails Automáticos</h1>
          <p className="text-muted-foreground">
            Configure lembretes e notificações por e-mail
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Session Reminders */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Lembretes de Sessão</CardTitle>
              </div>
              <CardDescription>
                Envie lembretes automáticos antes das sessões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reminder-enabled">Ativar lembretes</Label>
                <Switch
                  id="reminder-enabled"
                  checked={formData.reminder_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, reminder_enabled: checked })
                  }
                />
              </div>

              {formData.reminder_enabled && (
                <>
                  <div>
                    <Label>Dias de antecedência</Label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={formData.reminder_days_before}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reminder_days_before: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Template do lembrete</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPreviewTemplate(
                            previewTemplate === 'session' ? null : 'session'
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Prévia
                      </Button>
                    </div>
                    <Textarea
                      value={formData.session_reminder_template}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          session_reminder_template: e.target.value,
                        })
                      }
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Variáveis: {'{{nome}}'}, {'{{data}}'}, {'{{hora}}'}
                    </p>
                  </div>

                  {previewTemplate === 'session' && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Prévia:</p>
                      <p className="text-sm">
                        {renderPreview(formData.session_reminder_template)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Reminders */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Lembretes de Pagamento</CardTitle>
              </div>
              <CardDescription>
                Notifique pacientes sobre pagamentos pendentes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-reminder-enabled">Ativar lembretes</Label>
                <Switch
                  id="payment-reminder-enabled"
                  checked={formData.payment_reminder_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, payment_reminder_enabled: checked })
                  }
                />
              </div>

              {formData.payment_reminder_enabled && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Template do lembrete</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPreviewTemplate(
                            previewTemplate === 'payment' ? null : 'payment'
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Prévia
                      </Button>
                    </div>
                    <Textarea
                      value={formData.payment_reminder_template}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment_reminder_template: e.target.value,
                        })
                      }
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Variáveis: {'{{nome}}'}, {'{{sessoes}}'}, {'{{valor}}'}
                    </p>
                  </div>

                  {previewTemplate === 'payment' && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Prévia:</p>
                      <p className="text-sm">
                        {renderPreview(formData.payment_reminder_template)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Variáveis Disponíveis</CardTitle>
            <CardDescription>
              Use estas variáveis nos templates para personalizar as mensagens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono text-primary">{'{{nome}}'}</code>
                <p className="text-sm text-muted-foreground mt-1">
                  Nome completo do paciente
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono text-primary">{'{{data}}'}</code>
                <p className="text-sm text-muted-foreground mt-1">
                  Data da sessão (DD/MM/AAAA)
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono text-primary">{'{{hora}}'}</code>
                <p className="text-sm text-muted-foreground mt-1">Horário da sessão</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono text-primary">{'{{sessoes}}'}</code>
                <p className="text-sm text-muted-foreground mt-1">
                  Número de sessões pendentes
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono text-primary">{'{{valor}}'}</code>
                <p className="text-sm text-muted-foreground mt-1">
                  Valor total pendente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={() => saveSettings.mutate()} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
