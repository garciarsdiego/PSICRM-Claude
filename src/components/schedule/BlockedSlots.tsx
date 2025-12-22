import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Trash2, Ban } from 'lucide-react';

type BlockedSlot = {
  id: string;
  professional_id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
};

export function BlockedSlots() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBlock, setNewBlock] = useState({
    blocked_date: '',
    start_time: '08:00',
    end_time: '18:00',
    reason: '',
  });

  const { data: blockedSlots = [], isLoading } = useQuery({
    queryKey: ['blocked-slots', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('professional_id', user.id)
        .gte('blocked_date', format(new Date(), 'yyyy-MM-dd'))
        .order('blocked_date', { ascending: true });
      if (error) throw error;
      return data as BlockedSlot[];
    },
    enabled: !!user?.id,
  });

  const createBlock = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('blocked_slots').insert({
        professional_id: user.id,
        blocked_date: newBlock.blocked_date,
        start_time: newBlock.start_time,
        end_time: newBlock.end_time,
        reason: newBlock.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-slots'] });
      setIsDialogOpen(false);
      setNewBlock({ blocked_date: '', start_time: '08:00', end_time: '18:00', reason: '' });
      toast({ title: 'Bloqueio adicionado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar bloqueio', variant: 'destructive' });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-slots'] });
      toast({ title: 'Bloqueio removido!' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Bloqueios de Horário
            </CardTitle>
            <CardDescription>
              Bloqueie datas ou horários específicos em que você não estará disponível
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Bloqueio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bloquear Horário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newBlock.blocked_date}
                    onChange={(e) => setNewBlock({ ...newBlock, blocked_date: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={newBlock.start_time}
                      onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={newBlock.end_time}
                      onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    value={newBlock.reason}
                    onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                    placeholder="Ex: Consulta médica, férias, compromisso pessoal..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createBlock.mutate()}
                  disabled={!newBlock.blocked_date || createBlock.isPending}
                >
                  {createBlock.isPending ? 'Salvando...' : 'Bloquear Horário'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Carregando...</p>
        ) : blockedSlots.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum bloqueio agendado
          </p>
        ) : (
          <div className="space-y-2">
            {blockedSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(slot.blocked_date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      {slot.reason && ` • ${slot.reason}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteBlock.mutate(slot.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
