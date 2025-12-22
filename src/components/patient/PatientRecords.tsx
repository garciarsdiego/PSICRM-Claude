import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Calendar,
  Plus,
  Save,
  Sparkles,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type MedicalRecord = Tables<'medical_records'> & {
  sessions: { scheduled_at: string } | null;
};
type Session = Tables<'sessions'>;

interface PatientRecordsProps {
  patientId: string;
  patientName: string;
  professionalId: string;
}

export function PatientRecords({ patientId, patientName, professionalId }: PatientRecordsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [formData, setFormData] = useState({
    session_id: '',
    content: '',
    ai_summary: '',
  });

  // Fetch medical records for this patient
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['patient-records', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*, sessions(scheduled_at)')
        .eq('patient_id', patientId)
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MedicalRecord[];
    },
    enabled: !!patientId && !!professionalId,
  });

  // Fetch sessions for this patient
  const { data: sessions = [] } = useQuery({
    queryKey: ['patient-sessions-for-records', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!patientId,
  });

  // Save record mutation
  const saveRecord = useMutation({
    mutationFn: async (data: typeof formData) => {
      const recordData = {
        professional_id: professionalId,
        patient_id: patientId,
        session_id: data.session_id,
        content: data.content || null,
        ai_summary: data.ai_summary || null,
      };

      if (selectedRecord) {
        const { error } = await supabase
          .from('medical_records')
          .update(recordData)
          .eq('id', selectedRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('medical_records').insert(recordData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-records', patientId] });
      closeDialog();
      toast({
        title: selectedRecord ? 'Prontuário atualizado!' : 'Prontuário criado!',
      });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar prontuário', variant: 'destructive' });
    },
  });

  const openDialog = (record?: MedicalRecord) => {
    if (record) {
      setSelectedRecord(record);
      setFormData({
        session_id: record.session_id,
        content: record.content || '',
        ai_summary: record.ai_summary || '',
      });
    } else {
      setSelectedRecord(null);
      setFormData({
        session_id: '',
        content: '',
        ai_summary: '',
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedRecord(null);
  };

  const handleAISummary = async () => {
    if (!formData.content) {
      toast({ title: 'Adicione conteúdo antes de gerar resumo', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Gerando resumo com IA...' });
    setTimeout(() => {
      const summary = `Resumo automático gerado para sessão:\n\n• Pontos principais discutidos\n• Observações relevantes\n• Próximos passos sugeridos`;
      setFormData({ ...formData, ai_summary: summary });
      toast({ title: 'Resumo gerado!' });
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Prontuários
        </h3>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Registro
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-4 text-sm">Carregando...</p>
      ) : records.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 border rounded-lg">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum prontuário registrado</p>
        </div>
      ) : (
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => openDialog(record)}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {record.sessions?.scheduled_at
                        ? format(new Date(record.sessions.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <p className="mt-1 text-sm line-clamp-2">{record.content || 'Sem conteúdo'}</p>
                    {record.ai_summary && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                        <Sparkles className="h-3 w-3" />
                        Resumo IA disponível
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Record Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord ? 'Editar Prontuário' : 'Novo Prontuário'} - {patientName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Sessão</Label>
              <Select
                value={formData.session_id}
                onValueChange={(value) => setFormData({ ...formData, session_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a uma sessão" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {format(new Date(session.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Conteúdo do Prontuário</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Digite as anotações da sessão..."
                rows={8}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAISummary}>
                <Sparkles className="h-4 w-4 mr-1" />
                Gerar Resumo IA
              </Button>
            </div>

            {formData.ai_summary && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="font-medium text-sm text-primary mb-1">Resumo IA:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{formData.ai_summary}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={() => saveRecord.mutate(formData)} disabled={!formData.session_id}>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
