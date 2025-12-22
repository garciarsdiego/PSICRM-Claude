import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Lock, Eye, Trash2, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Política de Privacidade</h1>
            <p className="text-muted-foreground">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD)
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              1. Coleta de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Coletamos apenas os dados estritamente necessários para a prestação dos serviços de psicologia, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dados de identificação (nome, e-mail, telefone)</li>
              <li>Dados demográficos (data de nascimento, endereço)</li>
              <li>Registros de sessões e prontuários clínicos</li>
              <li>Informações de pagamento e agendamentos</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              2. Uso dos Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Prestação de serviços de acompanhamento psicológico</li>
              <li>Agendamento e gestão de sessões</li>
              <li>Comunicação sobre consultas e lembretes</li>
              <li>Processamento de pagamentos</li>
              <li>Cumprimento de obrigações legais do profissional de saúde</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              3. Segurança dos Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Implementamos medidas técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controle de acesso baseado em funções</li>
              <li>Autenticação segura</li>
              <li>Backups regulares</li>
              <li>Monitoramento de segurança contínuo</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              4. Seus Direitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Conforme a LGPD (Lei 13.709/2018), você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acesso aos seus dados pessoais</li>
              <li>Correção de dados incompletos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados a outro prestador de serviço</li>
              <li>Revogação do consentimento</li>
              <li>Informação sobre compartilhamento de dados</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-primary" />
              5. Retenção e Exclusão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Os prontuários clínicos são mantidos pelo período mínimo exigido pelo Conselho Federal de Psicologia (CFP), 
              que estabelece a guarda por no mínimo 5 (cinco) anos após o último atendimento.
            </p>
            <p>
              Dados não essenciais podem ser excluídos mediante solicitação, respeitando as obrigações legais de retenção.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              6. Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados, entre em contato 
              através dos canais disponibilizados pelo profissional responsável.
            </p>
            <p className="text-sm">
              Esta política pode ser atualizada periodicamente. Recomendamos revisar esta página regularmente.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
