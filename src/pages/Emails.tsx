import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Bell, CreditCard, Save, Eye, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Emails() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [sendingType, setSendingType] = useState<'session_reminder' | 'payment_reminder' | null>(null);

  // Check if Google is connected
  const { data: googleToken } = useQuery({
    queryKey: ['google-token', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('professional_id', user.id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch email settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['email-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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
  useEffect(() => {
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
  }, [settings]);

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const settingsData = {
        professional_id: user.id,
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

  // Send test email mutation
  const sendTestEmail = useMutation({
    mutationFn: async ({ template, patientId }: { template: string; patientId: string }) => {
      const patient = patients.find(p => p.id === patientId);
      if (!patient?.email) throw new Error('Paciente não possui email');
      if (!user?.id) throw new Error('Usuário não autenticado');

      const data: any = {
        patient_name: patient.full_name,
        date: new Date().toLocaleDateString('pt-BR'),
        time: '14:00',
        duration: 50,
        sessions_count: '1',
        total_amount: patient.session_price?.toFixed(2) || '0.00',
      };

      const { data: result, error } = await supabase.functions.invoke('send-gmail', {
        body: {
          to: patient.email,
          template,
          professional_id: user.id,
          data,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Email enviado com sucesso!' });
      setSendingType(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao enviar email', 
        description: error.message,
        variant: 'destructive' 
      });
      setSendingType(null);
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

  const isGoogleConnected = !!googleToken;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">E-mails Automáticos</h1>
          <p className="text-muted-foreground">
            Configure lembretes e notificações por e-mail via Gmail
          </p>
        </div>

        {/* Google Connection Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Gmail API</p>
                  <p className="text-sm text-muted-foreground">
                    Envie emails diretamente pela sua conta Google
                  </p>
                </div>
              </div>
              {isGoogleConnected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Não conectado
                </Badge>
              )}
            </div>
            {!isGoogleConnected && (
              <p className="text-sm text-muted-foreground mt-3">
                Conecte sua conta Google na página de <strong>Agenda</strong> para habilitar o envio de emails.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Email Section */}
        {isGoogleConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Email de Teste
              </CardTitle>
              <CardDescription>
                Teste o envio de emails antes de configurar automações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.filter(p => p.email).map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name} ({patient.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={() => {
                      setSendingType('session_reminder');
                      sendTestEmail.mutate({ template: 'session_reminder', patientId: selectedPatient });
                    }}
                    disabled={!selectedPatient || sendTestEmail.isPending}
                    variant="outline"
                  >
                    {sendingType === 'session_reminder' && sendTestEmail.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4 mr-2" />
                    )}
                    Lembrete de Sessão
                  </Button>
                  <Button
                    onClick={() => {
                      setSendingType('payment_reminder');
                      sendTestEmail.mutate({ template: 'payment_reminder', patientId: selectedPatient });
                    }}
                    disabled={!selectedPatient || sendTestEmail.isPending}
                    variant="outline"
                  >
                    {sendingType === 'payment_reminder' && sendTestEmail.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Lembrete de Pagamento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
