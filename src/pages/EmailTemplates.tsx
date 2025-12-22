import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Eye, 
  RefreshCw, 
  Bell, 
  CreditCard, 
  UserPlus, 
  Calendar,
  Copy,
  Check
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
    variables: ['nome', 'primeira_sessao_data', 'primeira_sessao_hora', 'duracao', 'meet_link'],
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
};

export default function EmailTemplates() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('session_reminder');
  const [previewMode, setPreviewMode] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  
  const [templates, setTemplates] = useState<Record<string, string>>(defaultTemplates);

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

  // Update templates when settings load
  useEffect(() => {
    if (settings) {
      setTemplates({
        ...defaultTemplates,
        session_reminder: settings.session_reminder_template || defaultTemplates.session_reminder,
        payment_reminder: settings.payment_reminder_template || defaultTemplates.payment_reminder,
      });
    }
  }, [settings]);

  // Save templates mutation
  const saveTemplates = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const settingsData = {
        professional_id: user.id,
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
      toast({ title: 'Templates salvos com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar templates', variant: 'destructive' });
    },
  });

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

  const currentInfo = templateInfo[activeTab as keyof typeof templateInfo];
  const Icon = currentInfo?.icon || Bell;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Templates de E-mail</h1>
            <p className="text-muted-foreground">
              Personalize as mensagens enviadas automaticamente aos seus pacientes
            </p>
          </div>
          <Button onClick={() => saveTemplates.mutate()} disabled={saveTemplates.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Templates
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Template Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    {`{{#meet_link}}`}<br/>
                    &nbsp;&nbsp;Conteúdo aqui...<br/>
                    {`{{/meet_link}}`}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exibe apenas se houver link do Meet
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs font-mono text-primary block">
                    {`{{#primeira_sessao}}`}<br/>
                    &nbsp;&nbsp;Conteúdo aqui...<br/>
                    {`{{/primeira_sessao}}`}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exibe apenas se tiver sessão agendada
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Use emojis para deixar os emails mais visuais</p>
                <p>• Mantenha as mensagens curtas e diretas</p>
                <p>• Personalize com o nome do paciente</p>
                <p>• Inclua sempre informações de contato</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
