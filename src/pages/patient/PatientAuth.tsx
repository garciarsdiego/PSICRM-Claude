import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Heart, Loader2, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');

interface InviteData {
  id: string;
  professional_id: string;
  patient_id: string | null;
  email: string | null;
  professional_name?: string;
}

export default function PatientAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const { user, role, signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [inviteError, setInviteError] = useState('');

  // Load invite data if token exists
  useEffect(() => {
    const loadInvite = async () => {
      if (!inviteToken) return;
      
      setInviteLoading(true);
      try {
        const { data: invite, error } = await supabase
          .from('patient_invites')
          .select('id, professional_id, patient_id, email')
          .eq('token', inviteToken)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error) throw error;
        if (!invite) {
          setInviteError('Convite inválido ou expirado');
          return;
        }

        // Get professional name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', invite.professional_id)
          .maybeSingle();

        setInviteData({
          ...invite,
          professional_name: profile?.full_name || 'Profissional',
        });

        // Pre-fill email if available
        if (invite.email) {
          setSignupEmail(invite.email);
        }
      } catch (error) {
        console.error('Error loading invite:', error);
        setInviteError('Erro ao carregar convite');
      } finally {
        setInviteLoading(false);
      }
    };

    loadInvite();
  }, [inviteToken]);

  useEffect(() => {
    if (user && role === 'patient') {
      navigate('/patient/dashboard');
    } else if (user && role === 'professional') {
      navigate('/dashboard');
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Erro de validação',
          description: error.errors[0].message,
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'Nome é obrigatório',
      });
      return;
    }

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Erro de validação',
          description: error.errors[0].message,
        });
        return;
      }
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'As senhas não coincidem',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, 'patient');
    
    if (error) {
      setIsLoading(false);
      if (error.message.includes('already registered')) {
        toast({
          variant: 'destructive',
          title: 'Erro ao criar conta',
          description: 'Este email já está cadastrado',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao criar conta',
          description: error.message,
        });
      }
      return;
    }

    // If we have an invite, link the patient after signup
    if (inviteData) {
      try {
        // Wait a bit for the user to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { user: newUser } } = await supabase.auth.getUser();
        
        if (newUser && inviteData.patient_id) {
          // Update patient with user_id
          await supabase
            .from('patients')
            .update({ user_id: newUser.id })
            .eq('id', inviteData.patient_id);
        }

        // Mark invite as used
        await supabase
          .from('patient_invites')
          .update({ used_at: new Date().toISOString() })
          .eq('id', inviteData.id);

        toast({
          title: 'Conta criada e vinculada!',
          description: `Você está vinculado ao profissional ${inviteData.professional_name}.`,
        });
      } catch (linkError) {
        console.error('Error linking patient:', linkError);
        toast({
          title: 'Conta criada!',
          description: 'Houve um problema ao vincular. Entre em contato com seu profissional.',
        });
      }
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você será redirecionado para o portal.',
      });
    }

    setIsLoading(false);
  };

  if (inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/auth" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para login do profissional
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Portal do Paciente</h1>
          <p className="text-muted-foreground mt-2">
            Acesse suas sessões e pagamentos
          </p>
        </div>

        {inviteError ? (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{inviteError}</p>
              <Button onClick={() => navigate('/patient/auth')} variant="outline">
                Continuar sem convite
              </Button>
            </CardContent>
          </Card>
        ) : inviteData ? (
          <Card className="border-primary mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-primary">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Convite de {inviteData.professional_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Crie sua conta para acessar o portal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Área do Paciente</CardTitle>
            <CardDescription className="text-center">
              {inviteData ? 'Crie sua conta para continuar' : 'Entre ou crie sua conta de paciente'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={inviteData ? 'signup' : 'login'} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="João Silva"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar senha</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Repita a senha"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-1">
          Cuide da sua saúde mental <Heart className="w-4 h-4 text-destructive" />
        </p>
      </div>
    </div>
  );
}