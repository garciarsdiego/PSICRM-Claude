import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Search,
  User,
  Calendar,
  Plus,
  Save,
  Mic,
  MicOff,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type MedicalRecord = Tables<'medical_records'> & {
  patients: { full_name: string } | null;
  sessions: { scheduled_at: string } | null;
};

type Patient = Tables<'patients'>;
type Session = Tables<'sessions'>;

export default function Records() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    session_id: '',
    content: '',
    audio_transcription: '',
    ai_summary: '',
  });

  // Fetch medical records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['medical-records', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('medical_records')
        .select('*, patients(full_name), sessions(scheduled_at)')
        .eq('professional_id', profile.user_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MedicalRecord[];
    },
    enabled: !!profile?.id,
  });

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('professional_id', profile.user_id)
        .order('full_name');
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!profile?.id,
  });

  // Fetch sessions for selected patient
  const { data: sessions = [] } = useQuery({
    queryKey: ['patient-sessions', formData.patient_id],
    queryFn: async () => {
      if (!formData.patient_id) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', formData.patient_id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!formData.patient_id,
  });

  // Save record mutation
  const saveRecord = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile?.user_id) throw new Error('Usuário não autenticado');

      const recordData = {
        professional_id: profile.user_id,
        patient_id: data.patient_id,
        session_id: data.session_id,
        content: data.content || null,
        audio_transcription: data.audio_transcription || null,
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
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      closeDialog();
      toast({
        title: selectedRecord
          ? 'Prontuário atualizado!'
          : 'Prontuário criado!',
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
        patient_id: record.patient_id,
        session_id: record.session_id,
        content: record.content || '',
        audio_transcription: record.audio_transcription || '',
        ai_summary: record.ai_summary || '',
      });
    } else {
      setSelectedRecord(null);
      setFormData({
        patient_id: '',
        session_id: '',
        content: '',
        audio_transcription: '',
        ai_summary: '',
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedRecord(null);
    setIsFullscreen(false);
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      toast({ title: 'Gravação finalizada' });
      // In a real implementation, this would send audio to AI for transcription
    } else {
      setIsRecording(true);
      toast({ title: 'Gravando áudio...' });
    }
  };

  const handleAISummary = async () => {
    if (!formData.content) {
      toast({ title: 'Adicione conteúdo antes de gerar resumo', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Gerando resumo com IA...' });
    // Simulated AI summary - in production would call Lovable AI
    setTimeout(() => {
      const summary = `Resumo automático gerado para sessão:\n\n• Pontos principais discutidos\n• Observações relevantes\n• Próximos passos sugeridos`;
      setFormData({ ...formData, ai_summary: summary });
      toast({ title: 'Resumo gerado!' });
    }, 1500);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPatient =
      selectedPatientId === 'all' || r.patient_id === selectedPatientId;
    return matchesSearch && matchesPatient;
  });

  // Group records by patient
  const recordsByPatient = filteredRecords.reduce((acc, record) => {
    const patientName = record.patients?.full_name || 'Sem paciente';
    if (!acc[patientName]) {
      acc[patientName] = [];
    }
    acc[patientName].push(record);
    return acc;
  }, {} as Record<string, MedicalRecord[]>);

  const DialogWrapper = isFullscreen ? 'div' : DialogContent;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prontuários</h1>
            <p className="text-muted-foreground">
              Registros clínicos dos seus pacientes
            </p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Registro
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nos prontuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pacientes</SelectItem>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Records List */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : Object.keys(recordsByPatient).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchTerm || selectedPatientId !== 'all'
                ? 'Nenhum prontuário encontrado'
                : 'Nenhum prontuário registrado'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(recordsByPatient).map(([patientName, patientRecords]) => (
              <Card key={patientName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {patientName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patientRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-start justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => openDialog(record)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {record.sessions?.scheduled_at
                                ? format(
                                    new Date(record.sessions.scheduled_at),
                                    "dd/MM/yyyy 'às' HH:mm",
                                    { locale: ptBR }
                                  )
                                : format(new Date(record.created_at), 'dd/MM/yyyy', {
                                    locale: ptBR,
                                  })}
                            </div>
                            <p className="mt-1 text-sm line-clamp-2">
                              {record.content || 'Sem conteúdo'}
                            </p>
                            {record.ai_summary && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                                <Sparkles className="h-3 w-3" />
                                Resumo IA disponível
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Record Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent
            className={cn(
              'max-w-4xl',
              isFullscreen && 'fixed inset-4 max-w-none max-h-none h-auto'
            )}
          >
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {selectedRecord ? 'Editar Prontuário' : 'Novo Prontuário'}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Left: Patient & Session Selection */}
              <div className="space-y-4">
                <div>
                  <Label>Paciente</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, patient_id: value, session_id: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.patient_id && (
                  <div>
                    <Label>Sessão</Label>
                    <Select
                      value={formData.session_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, session_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vincular a uma sessão" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {format(new Date(session.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Voice Recording */}
                <div className="border-t pt-4">
                  <Label>Gravação de Áudio</Label>
                  <Button
                    variant={isRecording ? 'destructive' : 'outline'}
                    className="w-full mt-2"
                    onClick={handleVoiceRecording}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="mr-2 h-4 w-4" />
                        Parar Gravação
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" />
                        Iniciar Gravação
                      </>
                    )}
                  </Button>
                  {formData.audio_transcription && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="font-medium mb-1">Transcrição:</p>
                      <p className="text-muted-foreground">
                        {formData.audio_transcription}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                <div className="border-t pt-4">
                  <Label>Resumo com IA</Label>
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={handleAISummary}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Resumo
                  </Button>
                  {formData.ai_summary && (
                    <div className="mt-2 p-2 bg-primary/5 rounded text-sm border border-primary/20">
                      <p className="font-medium mb-1 text-primary">Resumo IA:</p>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {formData.ai_summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Content Editor */}
              <div className="col-span-2 space-y-4">
                <div className="h-full flex flex-col">
                  <Label>Conteúdo do Prontuário</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Digite as anotações da sessão..."
                    className="flex-1 mt-2 min-h-[300px] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => saveRecord.mutate(formData)}
                    disabled={!formData.patient_id || !formData.session_id}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Prontuário
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
