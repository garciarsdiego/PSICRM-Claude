import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { Search, Send, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'>;
type Patient = Tables<'patients'>;

export default function Messages() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('professional_id', profile.user_id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!profile?.id,
  });

  // Fetch messages for selected patient
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedPatientId, profile?.user_id],
    queryFn: async () => {
      if (!selectedPatientId || !profile?.user_id) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', selectedPatientId)
        .or(`sender_id.eq.${profile.user_id},receiver_id.eq.${profile.user_id}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedPatientId && !!profile?.user_id,
  });

  // Get unread message counts per patient
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ['unread-counts', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return {};
      const { data, error } = await supabase
        .from('messages')
        .select('patient_id')
        .eq('receiver_id', profile.user_id)
        .eq('is_read', false);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((msg) => {
        if (msg.patient_id) {
          counts[msg.patient_id] = (counts[msg.patient_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!profile?.user_id,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!profile?.user_id || !selectedPatientId) throw new Error('Dados inválidos');
      
      const selectedPatient = patients.find((p) => p.id === selectedPatientId);
      if (!selectedPatient?.user_id) {
        throw new Error('Paciente não possui conta de usuário');
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: profile.user_id,
        receiver_id: selectedPatient.user_id,
        patient_id: selectedPatientId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setNewMessage('');
    },
    onError: (error: Error) => {
      toast({ 
        title: error.message || 'Erro ao enviar mensagem', 
        variant: 'destructive' 
      });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (patientId: string) => {
      if (!profile?.user_id) return;
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('patient_id', patientId)
        .eq('receiver_id', profile.user_id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    },
  });

  // Enable realtime messages
  useRealtimeMessages(selectedPatientId, profile?.user_id);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      markAsRead.mutate(selectedPatientId);
    }
  }, [selectedPatientId]);

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

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mensagens</h1>
            <p className="text-sm md:text-base text-muted-foreground">Comunique-se com seus pacientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-4rem)]">
          {/* Patients List */}
          <Card className="flex flex-col md:col-span-1">
            <CardHeader className="pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {filteredPatients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      Nenhum paciente encontrado
                    </p>
                  ) : (
                    filteredPatients.map((patient) => {
                      const unreadCount = unreadCounts[patient.id] || 0;
                      return (
                        <div
                          key={patient.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                            selectedPatientId === patient.id
                              ? 'bg-primary/10'
                              : 'hover:bg-accent'
                          )}
                          onClick={() => setSelectedPatientId(patient.id)}
                        >
                          <Avatar>
                            <AvatarFallback>
                              {patient.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{patient.full_name}</p>
                            {patient.user_id ? (
                              <p className="text-xs text-muted-foreground">
                                Conta ativa
                              </p>
                            ) : (
                              <p className="text-xs text-warning">Sem conta</p>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <Badge variant="default" className="rounded-full">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex-col hidden lg:flex">
            {selectedPatient ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedPatient.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedPatient.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedPatient.email || selectedPatient.phone || 'Sem contato'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 flex flex-col">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {!selectedPatient.user_id ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-2" />
                        <p>Este paciente ainda não possui uma conta.</p>
                        <p className="text-sm">
                          Convide-o para criar uma conta para trocar mensagens.
                        </p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-2" />
                        <p>Nenhuma mensagem ainda.</p>
                        <p className="text-sm">Envie a primeira mensagem!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isOwn = message.sender_id === profile?.user_id;
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                'flex',
                                isOwn ? 'justify-end' : 'justify-start'
                              )}
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
                  {selectedPatient.user_id && (
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
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg">Selecione um paciente</p>
                  <p className="text-sm">para iniciar uma conversa</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
