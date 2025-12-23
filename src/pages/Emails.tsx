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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Mail, Bell, CreditCard, Save, Eye, Send, CheckCircle, AlertCircle, Loader2,
  Users, Clock, Play, FileEdit, RefreshCw, Copy, Check, UserPlus, Calendar
} from 'lucide-react';

const defaultTemplates = {
  session_reminder: `Olá {{nome}},

Este é um lembrete de que sua sessão está agendada para {{data}} às {{hora}}.

{{#meet_link}}
📹 Link da reunião: {{meet_link}}
{{/meet_link}}

Duração prevista: {{duracao}} minutos.

Qualquer dúvida, entre em contato.`,

  session_confirmation: `Olá {{nome}},

Sua sessão foi agendada com sucesso!

📅 Data: {{data}}
🕐 Horário: {{hora}}
⏱️ Duração: {{duracao}} minutos

{{#meet_link}}
📹 Link do Google Meet: {{meet_link}}
{{/meet_link}}

Aguardo você!`,

  payment_reminder: `Olá {{nome}},

Você possui {{sessoes}} sessão(ões) com pagamento pendente, totalizando R$ {{valor}}.

Por favor, regularize o pagamento assim que possível.

Qualquer dúvida, estou à disposição.`,

  welcome: `Olá {{nome}},

É um prazer recebê-lo(a) como novo paciente! A partir de agora, você faz parte do nosso consultório.

{{#primeira_sessao}}
📅 Primeira sessão: {{primeira_sessao_data}} às {{primeira_sessao_hora}}
{{/primeira_sessao}}

{{#meet_link}}
📹 Link da reunião: {{meet_link}}
{{/meet_link}}

{{#link_convite}}
🔗 Crie sua conta e acesse o portal: {{link_convite}}
{{/link_convite}}

⏱️ Duração das sessões: {{duracao}} minutos

Caso tenha dúvidas, sinta-se à vontade para entrar em contato.`,
};

const templateInfo = {
  session_reminder: {
    title: 'Lembrete de Sessão',
    description: 'Enviado automaticamente antes das sessões agendadas',
    icon: Bell,
    variables: ['nome', 'data', 'hora', 'duracao', 'meet_link'],
  },
  session_confirmation: {
    title: 'Confirmação de Agendamento',
    description: 'Enviado quando uma sessão é agendada',
    icon: Calendar,
    variables: ['nome', 'data', 'hora', 'duracao', 'meet_link'],
  },
  payment_reminder: {
    title: 'Lembrete de Pagamento',
    description: 'Enviado para pacientes com pagamentos pendentes',
    icon: CreditCard,
    variables: ['nome', 'sessoes', 'valor'],
  },
  welcome: {
    title: 'Boas-vindas',
    description: 'Enviado quando um novo paciente é cadastrado',
    icon: UserPlus,
    variables: ['nome', 'primeira_sessao_data', 'primeira_sessao_hora', 'duracao', 'meet_link', 'link_convite'],
  },
};

const variableDescriptions: Record<string, string> = {
  nome: 'Nome completo do paciente',
  data: 'Data da sessão (DD/MM/AAAA)',
  hora: 'Horário da sessão (HH:MM)',
  duracao: 'Duração da sessão em minutos',
  meet_link: 'Link do Google Meet (se disponível)',
  sessoes: 'Quantidade de sessões pendentes',
  valor: 'Valor total pendente (R$)',
  primeira_sessao_data: 'Data da primeira sessão',
  primeira_sessao_hora: 'Horário da primeira sessão',
  link_convite: 'Link de convite para o Portal do Paciente',
};

export default function Emails() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<'send' | 'templates' | 'settings'>('send');
  const [templateTab, setTemplateTab] = useState('session_reminder');
  const [previewMode, setPreviewMode] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [sendingType, setSendingType] = useState<'session_reminder' | 'payment_reminder' | null>(null);

  // Bulk email state
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [bulkEmailTemplate, setBulkEmailTemplate] = useState<'session_reminder' | 'payment_reminder'>('session_reminder');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [isRunningCron, setIsRunningCron] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<Record<string, string>>(defaultTemplates);

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
    payment_reminder_enabled: true,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        reminder_enabled: settings.reminder_enabled ?? true,
        reminder_days_before: settings.reminder_days_before ?? 1,
        payment_reminder_enabled: settings.payment_reminder_enabled ?? true,
      });
      setTemplates({
        ...defaultTemplates,
        session_reminder: settings.session_reminder_template || defaultTemplates.session_reminder,
        payment_reminder: settings.payment_reminder_template || defaultTemplates.payment_reminder,
      });
    }
  }, [settings]);

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const settingsData = {
        professional_id: user.id,
        reminder_enabled: formData.reminder_enabled,
        reminder_days_before: formData.reminder_days_before,
        payment_reminder_enabled: formData.payment_reminder_enabled,
        session_reminder_template: templates.session_reminder,
        payment_reminder_template: templates.payment_reminder,
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

  // Send bulk email function
  const sendBulkEmails = async () => {
    if (!user?.id || selectedPatients.length === 0) return;

    setIsSendingBulk(true);
    let sent = 0;
    let errors = 0;

    for (const patientId of selectedPatients) {
      const patient = patients.find(p => p.id === patientId);
      if (!patient?.email) {
        errors++;
        continue;
      }

      try {
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
            template: bulkEmailTemplate,
            professional_id: user.id,
            data,
          },
        });

        if (error || result?.error) {
          errors++;
        } else {
          sent++;
        }
      } catch (err) {
        errors++;
      }
    }

    setIsSendingBulk(false);
    setSelectedPatients([]);

    toast({
      title: `Envio em massa concluído`,
      description: `${sent} emails enviados, ${errors} erros`,
    });
  };

  // Run cron job manually
  const runRemindersCron = async () => {
    setIsRunningCron(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-reminders');

      if (error) throw error;

      toast({
        title: 'Lembretes processados!',
        description: data?.message || `${data?.sent || 0} lembretes enviados`,
      });
    } catch (err) {
      toast({
        title: 'Erro ao processar lembretes',
        variant: 'destructive',
      });
    } finally {
      setIsRunningCron(false);
    }
  };

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const selectAllPatients = () => {
    const patientsWithEmail = patients.filter(p => p.email).map(p => p.id);
    setSelectedPatients(patientsWithEmail);
  };

  const deselectAllPatients = () => {
    setSelectedPatients([]);
  };

  const renderPreview = (template: string) => {
    return template
      .replace(/\{\{nome\}\}/g, 'João Silva')
      .replace(/\{\{data\}\}/g, '25/12/2024')
      .replace(/\{\{hora\}\}/g, '14:00')
      .replace(/\{\{duracao\}\}/g, '50')
      .replace(/\{\{sessoes\}\}/g, '3')
      .replace(/\{\{valor\}\}/g, '450,00')
      .replace(/\{\{meet_link\}\}/g, 'https://meet.google.com/abc-defg-hij')
      .replace(/\{\{primeira_sessao_data\}\}/g, '25/12/2024')
      .replace(/\{\{primeira_sessao_hora\}\}/g, '14:00')
      .replace(/\{\{#meet_link\}\}([\s\S]*?)\{\{\/meet_link\}\}/g, '$1')
      .replace(/\{\{#primeira_sessao\}\}([\s\S]*?)\{\{\/primeira_sessao\}\}/g, '$1');
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const resetTemplate = (templateKey: string) => {
    setTemplates({
      ...templates,
      [templateKey]: defaultTemplates[templateKey as keyof typeof defaultTemplates],
    });
    toast({ title: 'Template restaurado para o padrão' });
  };

  const isGoogleConnected = !!googleToken;
  const patientsWithEmail = patients.filter(p => p.email);
  const currentInfo = templateInfo[templateTab as keyof typeof templateInfo];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">E-mails</h1>
            <p className="text-muted-foreground">
              Gerencie lembretes, templates e envios de e-mail
            </p>
          </div>
          <Button onClick={() => saveSettings.mutate()} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar
          </Button>
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

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'send' | 'templates' | 'settings')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Automações
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-6">
            {isGoogleConnected ? (
              <>
                {/* Test Email Section */}
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

                {/* Bulk Email Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Envio em Massa
                    </CardTitle>
                    <CardDescription>
                      Envie emails para múltiplos pacientes de uma vez
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAllPatients}>
                          Selecionar todos
                        </Button>
                        <Button variant="outline" size="sm" onClick={deselectAllPatients}>
                          Limpar seleção
                        </Button>
                      </div>
                      <Badge variant="secondary">
                        {selectedPatients.length} de {patientsWithEmail.length} selecionados
                      </Badge>
                    </div>

                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {patientsWithEmail.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum paciente com email cadastrado
                        </p>
                      ) : (
                        patientsWithEmail.map((patient) => (
                          <div
                            key={patient.id}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => togglePatientSelection(patient.id)}
                          >
                            <Checkbox
                              checked={selectedPatients.includes(patient.id)}
                              onCheckedChange={() => togglePatientSelection(patient.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{patient.full_name}</p>
                              <p className="text-xs text-muted-foreground">{patient.email}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <Label>Template</Label>
                        <Select
                          value={bulkEmailTemplate}
                          onValueChange={(v) => setBulkEmailTemplate(v as 'session_reminder' | 'payment_reminder')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="session_reminder">Lembrete de Sessão</SelectItem>
                            <SelectItem value="payment_reminder">Lembrete de Pagamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={sendBulkEmails}
                        disabled={selectedPatients.length === 0 || isSendingBulk}
                      >
                        {isSendingBulk ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar para {selectedPatients.length} pacientes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Conecte sua conta Google para enviar emails</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Template Editor */}
              <div className="lg:col-span-2 space-y-4">
                <Tabs value={templateTab} onValueChange={setTemplateTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="session_reminder" className="flex items-center gap-1">
                      <Bell className="h-4 w-4" />
                      <span className="hidden sm:inline">Lembrete</span>
                    </TabsTrigger>
                    <TabsTrigger value="session_confirmation" className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Confirmação</span>
                    </TabsTrigger>
                    <TabsTrigger value="payment_reminder" className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      <span className="hidden sm:inline">Pagamento</span>
                    </TabsTrigger>
                    <TabsTrigger value="welcome" className="flex items-center gap-1">
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Boas-vindas</span>
                    </TabsTrigger>
                  </TabsList>

                  {Object.entries(templateInfo).map(([key, info]) => (
                    <TabsContent key={key} value={key} className="space-y-4">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <info.icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle>{info.title}</CardTitle>
                                <CardDescription>{info.description}</CardDescription>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewMode(!previewMode)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {previewMode ? 'Editar' : 'Prévia'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetTemplate(key)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Restaurar
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {previewMode ? (
                            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap font-mono text-sm">
                              {renderPreview(templates[key as keyof typeof templates])}
                            </div>
                          ) : (
                            <Textarea
                              value={templates[key as keyof typeof templates]}
                              onChange={(e) =>
                                setTemplates({
                                  ...templates,
                                  [key]: e.target.value,
                                })
                              }
                              rows={12}
                              className="font-mono text-sm"
                              placeholder="Digite o conteúdo do template..."
                            />
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* Variables Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variáveis Disponíveis</CardTitle>
                    <CardDescription>
                      Clique para copiar e use no seu template
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {currentInfo?.variables.map((variable) => (
                      <div
                        key={variable}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleCopyVariable(variable)}
                      >
                        <div>
                          <code className="text-sm font-mono text-primary">
                            {`{{${variable}}}`}
                          </code>
                          <p className="text-xs text-muted-foreground mt-1">
                            {variableDescriptions[variable]}
                          </p>
                        </div>
                        {copiedVariable === variable ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Blocos Condicionais</CardTitle>
                    <CardDescription>
                      Conteúdo exibido apenas se a condição for verdadeira
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <code className="text-xs font-mono text-primary block">
                        {`{{#meet_link}}`}<br />
                        &nbsp;&nbsp;Conteúdo aqui...<br />
                        {`{{/meet_link}}`}
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        Exibe apenas se houver link do Meet
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Automatic Reminders Cron */}
            {isGoogleConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Lembretes Automáticos
                  </CardTitle>
                  <CardDescription>
                    Os lembretes são enviados automaticamente diariamente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Executar lembretes agora</p>
                      <p className="text-sm text-muted-foreground">
                        Envia lembretes para sessões agendadas
                      </p>
                    </div>
                    <Button onClick={runRemindersCron} disabled={isRunningCron}>
                      {isRunningCron ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Executar
                        </>
                      )}
                    </Button>
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
