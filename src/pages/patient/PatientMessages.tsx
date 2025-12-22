import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientLayout } from '@/components/patient/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'>;

export default function PatientMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch patient record with professional info
  const { data: patientRecord } = useQuery({
    queryKey: ['patient-record-with-prof', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('*, profiles:professional_id(full_name, email, specialty)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['patient-messages', patientRecord?.id, user?.id],
    queryFn: async () => {
      if (!patientRecord?.id || !user?.id) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientRecord.id)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!patientRecord?.id && !!user?.id,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !patientRecord?.professional_id || !patientRecord?.id) {
        throw new Error('Dados inválidos');
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: patientRecord.professional_id,
        patient_id: patientRecord.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-messages'] });
      setNewMessage('');
    },
    onError: () => {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    },
  });

  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const unreadMessages = messages.filter(
        (m) => m.receiver_id === user.id && !m.is_read
      );
      
      if (unreadMessages.length > 0) {
        supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map((m) => m.id))
          .then();
      }
    }
  }, [messages, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const professionalName = (patientRecord as any)?.profiles?.full_name || 'Seu Profissional';
  const professionalInitials = professionalName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <PatientLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mensagens</h1>
            <p className="text-muted-foreground">
              Converse com seu profissional de saúde
            </p>
          </div>
        </div>

        <Card className="h-[calc(100%-4rem)] flex flex-col">
          {!patientRecord?.professional_id ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg">Você precisa estar vinculado a um profissional</p>
                <p className="text-sm">para trocar mensagens</p>
              </div>
            </CardContent>
          ) : (
            <>
              {/* Header */}
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{professionalInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{professionalName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {(patientRecord as any)?.profiles?.specialty || 'Psicólogo(a)'}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-2" />
                      <p>Nenhuma mensagem ainda.</p>
                      <p className="text-sm">Envie a primeira mensagem!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwn = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg px-4 py-2',
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <p>{message.content}</p>
                              <p
                                className={cn(
                                  'text-xs mt-1',
                                  isOwn
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {format(new Date(message.created_at), 'HH:mm', {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                    />
                    <Button onClick={handleSend} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </PatientLayout>
  );
}
