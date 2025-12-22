import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Link, Unlink, RefreshCw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type GoogleCalendarToken = {
  id: string;
  professional_id: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  calendar_id: string;
};

export function GoogleCalendarIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: googleToken, isLoading } = useQuery({
    queryKey: ['google-calendar-token', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as GoogleCalendarToken | null;
    },
    enabled: !!user?.id,
  });

  const connectGoogle = async () => {
    try {
      // Call edge function to get OAuth URL
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url' },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast({
        title: 'Erro ao conectar',
        description: 'Configure as credenciais do Google Calendar nas configurações.',
        variant: 'destructive',
      });
    }
  };

  const disconnectGoogle = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('professional_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-token'] });
      toast({ title: 'Google Calendar desconectado!' });
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-token'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ 
        title: 'Sincronização concluída!',
        description: data?.message || 'Eventos sincronizados com sucesso.',
      });
    },
    onError: () => {
      toast({ title: 'Erro ao sincronizar', variant: 'destructive' });
    },
  });

  const isConnected = !!googleToken;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincronize suas sessões com o Google Calendar para visualização em qualquer dispositivo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Carregando...</p>
        ) : isConnected ? (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-success/10 border-success/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">Conectado ao Google Calendar</p>
                  {googleToken.last_sync_at && (
                    <p className="text-sm text-muted-foreground">
                      Última sincronização: {format(new Date(googleToken.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary">{googleToken.calendar_id}</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => syncNow.mutate()}
                disabled={syncNow.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncNow.isPending ? 'animate-spin' : ''}`} />
                {syncNow.isPending ? 'Sincronizando...' : 'Sincronizar Agora'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => disconnectGoogle.mutate()}
                disabled={disconnectGoogle.isPending}
              >
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A sincronização bidirecional mantém suas sessões e eventos do Google Calendar atualizados automaticamente.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center p-6 rounded-lg border border-dashed">
              <div className="text-center space-y-2">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Conecte sua conta do Google para sincronizar suas sessões
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={connectGoogle}>
              <Link className="mr-2 h-4 w-4" />
              Conectar Google Calendar
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Suas sessões serão sincronizadas automaticamente com o Google Calendar.
              Eventos do Google também serão importados para bloquear horários.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
