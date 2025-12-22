import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addWeeks, endOfMonth, isAfter, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimeSlotPicker } from '@/components/schedule/TimeSlotPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Edit,
  Eye,
  Link2,
  Unlink,
  Loader2,
  Copy,
  Check,
  Send,
  Calendar,
  Clock,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Patient = Tables<'patients'>;

export default function Patients() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    birth_date: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    emergency_contact: '',
    emergency_phone: '',
    session_price: '',
    clinical_notes: '',
    is_active: true,
  });
  
  // Session scheduling state
  const [scheduleSession, setScheduleSession] = useState(false);
  const [sessionData, setSessionData] = useState({
    scheduled_at: '',
    recurrence_type: 'none' as 'none' | 'weekly' | 'biweekly' | 'monthly',
  });

  // Fetch patients
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('professional_id', profile.user_id)
        .order('full_name');
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!profile?.user_id,
  });

  // Generate recurring dates for the current month
  const generateRecurringDates = (startDate: Date, recurrenceType: string): Date[] => {
    const dates: Date[] = [startDate];
    const monthEnd = endOfMonth(startDate);
    
    if (recurrenceType === 'none') return dates;
    
    let nextDate = startDate;
    
    while (true) {
      if (recurrenceType === 'weekly') {
        nextDate = addWeeks(nextDate, 1);
      } else if (recurrenceType === 'biweekly') {
        nextDate = addWeeks(nextDate, 2);
      } else if (recurrenceType === 'monthly') {
        break;
      }
      
      if (isAfter(nextDate, monthEnd)) break;
      dates.push(nextDate);
    }
    
    return dates;
  };

  // Create/Update patient mutation
  const savePatient = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile?.user_id) throw new Error('Usuário não autenticado');

      const patientData = {
        professional_id: profile.user_id,
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        cpf: data.cpf || null,
        birth_date: data.birth_date || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        emergency_contact: data.emergency_contact || null,
        emergency_phone: data.emergency_phone || null,
        session_price: data.session_price ? parseFloat(data.session_price) : null,
        clinical_notes: data.clinical_notes || null,
        is_active: data.is_active,
      };

      let patientId: string;

      if (selectedPatient) {
        const { error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', selectedPatient.id);
        if (error) throw error;
        patientId = selectedPatient.id;
      } else {
        const { data: newPatient, error } = await supabase
          .from('patients')
          .insert(patientData)
          .select('id')
          .single();
        if (error) throw error;
        patientId = newPatient.id;
      }

      // Create sessions if scheduling is enabled (only for new patients)
      if (!selectedPatient && scheduleSession && sessionData.scheduled_at) {
        const scheduledDate = new Date(sessionData.scheduled_at);
        const recurringDates = generateRecurringDates(scheduledDate, sessionData.recurrence_type);
        
        const sessionPrice = data.session_price ? parseFloat(data.session_price) : profile.session_price || 0;
        
        const sessionsToInsert = recurringDates.map((date) => ({
          professional_id: profile.user_id,
          patient_id: patientId,
          scheduled_at: date.toISOString(),
          duration: profile.session_duration || 50,
          price: Number(sessionPrice),
          is_recurring: sessionData.recurrence_type !== 'none',
          recurrence_rule: sessionData.recurrence_type !== 'none' ? sessionData.recurrence_type : null,
          title: `Sessão - ${data.full_name}`,
        }));
        
        const { error: sessionError } = await supabase.from('sessions').insert(sessionsToInsert);
        if (sessionError) throw sessionError;
        
        return { isNew: true, sessionsCreated: recurringDates.length };
      }

      return { isNew: !selectedPatient, sessionsCreated: 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      closeDialog();
      
      if (result?.sessionsCreated && result.sessionsCreated > 0) {
        toast({
          title: result.sessionsCreated > 1
            ? `Paciente cadastrado e ${result.sessionsCreated} sessões agendadas!`
            : 'Paciente cadastrado e sessão agendada!',
        });
      } else {
        toast({
          title: selectedPatient
            ? 'Paciente atualizado com sucesso!'
            : 'Paciente cadastrado com sucesso!',
        });
      }
    },
    onError: (error) => {
      console.error('Error saving patient:', error);
      toast({ title: 'Erro ao salvar paciente', variant: 'destructive' });
    },
  });

  // Link patient to user account
  const linkPatient = useMutation({
    mutationFn: async ({ patientId, email }: { patientId: string; email: string }) => {
      // Find user profile by email
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!userProfile) throw new Error('Usuário não encontrado com este email');

      // Check if user has patient role
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userProfile.user_id)
        .eq('role', 'patient')
        .maybeSingle();

      if (roleError) throw roleError;
      if (!userRole) throw new Error('Este usuário não possui conta de paciente');

      // Update patient with user_id
      const { error: updateError } = await supabase
        .from('patients')
        .update({ user_id: userProfile.user_id })
        .eq('id', patientId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsLinkDialogOpen(false);
      setLinkEmail('');
      setSelectedPatient(null);
      toast({ title: 'Paciente vinculado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Erro ao vincular paciente', variant: 'destructive' });
    },
  });

  // Unlink patient from user account
  const unlinkPatient = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from('patients')
        .update({ user_id: null })
        .eq('id', patientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({ title: 'Vínculo removido com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover vínculo', variant: 'destructive' });
    },
  });

  // Generate invite link
  const generateInvite = useMutation({
    mutationFn: async (patient: Patient) => {
      if (!profile?.user_id) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('patient_invites')
        .insert({
          professional_id: profile.user_id,
          patient_id: patient.id,
          email: patient.email || null,
        })
        .select('token')
        .single();

      if (error) throw error;
      return data.token;
    },
    onSuccess: (token) => {
      const link = `${window.location.origin}/patient/auth?invite=${token}`;
      setInviteLink(link);
      setIsInviteDialogOpen(true);
    },
    onError: () => {
      toast({ title: 'Erro ao gerar convite', variant: 'destructive' });
    },
  });

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copiado!' });
  };

  const openDialog = (patient?: Patient, viewMode = false) => {
    if (patient) {
      setSelectedPatient(patient);
      setFormData({
        full_name: patient.full_name,
        email: patient.email || '',
        phone: patient.phone || '',
        cpf: patient.cpf || '',
        birth_date: patient.birth_date || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zip_code: patient.zip_code || '',
        emergency_contact: patient.emergency_contact || '',
        emergency_phone: patient.emergency_phone || '',
        session_price: patient.session_price?.toString() || '',
        clinical_notes: patient.clinical_notes || '',
        is_active: patient.is_active ?? true,
      });
    } else {
      setSelectedPatient(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        cpf: '',
        birth_date: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        emergency_contact: '',
        emergency_phone: '',
        session_price: '',
        clinical_notes: '',
        is_active: true,
      });
    }
    setIsViewMode(viewMode);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedPatient(null);
    setIsViewMode(false);
    setScheduleSession(false);
    setSessionData({ scheduled_at: '', recurrence_type: 'none' });
  };

  const openLinkDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setLinkEmail(patient.email || '');
    setIsLinkDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await savePatient.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">
              Gerencie o cadastro dos seus pacientes
            </p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {patients.filter((p) => p.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vinculados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {patients.filter((p) => p.user_id).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sem Vínculo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {patients.filter((p) => !p.user_id).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patients List */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : filteredPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.full_name}</p>
                            {patient.birth_date && (
                              <p className="text-sm text-muted-foreground">
                                Nasc: {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {patient.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            patient.is_active
                              ? 'bg-success/20 text-success border-success'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {patient.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.user_id ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                              <Link2 className="h-3 w-3 mr-1" />
                              Vinculado
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unlinkPatient.mutate(patient.id)}
                              title="Remover vínculo"
                            >
                              <Unlink className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLinkDialog(patient)}
                              title="Vincular a conta existente"
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Vincular
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPatient(patient);
                                generateInvite.mutate(patient);
                              }}
                              disabled={generateInvite.isPending}
                              title="Gerar link de convite"
                            >
                              {generateInvite.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDialog(patient, true)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDialog(patient, false)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Patient Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isViewMode
                  ? 'Detalhes do Paciente'
                  : selectedPatient
                  ? 'Editar Paciente'
                  : 'Novo Paciente'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    disabled={isViewMode}
                    placeholder="Nome do paciente"
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isViewMode}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={isViewMode}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) =>
                      setFormData({ ...formData, cpf: e.target.value })
                    }
                    disabled={isViewMode}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                    disabled={isViewMode}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Endereço</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Endereço</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      disabled={isViewMode}
                      placeholder="Rua, número, complemento"
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      disabled={isViewMode}
                      placeholder="SP"
                    />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={formData.zip_code}
                      onChange={(e) =>
                        setFormData({ ...formData, zip_code: e.target.value })
                      }
                      disabled={isViewMode}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Contato de Emergência</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact: e.target.value,
                        })
                      }
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.emergency_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_phone: e.target.value,
                        })
                      }
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Informações de Atendimento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor da Sessão (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.session_price}
                      onChange={(e) =>
                        setFormData({ ...formData, session_price: e.target.value })
                      }
                      disabled={isViewMode}
                      placeholder="Deixe em branco para usar padrão"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                      disabled={isViewMode}
                    />
                    <Label>Paciente Ativo</Label>
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Observações Clínicas</Label>
                  <Textarea
                    value={formData.clinical_notes}
                    onChange={(e) =>
                      setFormData({ ...formData, clinical_notes: e.target.value })
                    }
                    disabled={isViewMode}
                    placeholder="Anotações gerais sobre o paciente..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Schedule First Session - Only for new patients */}
              {!selectedPatient && !isViewMode && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">Agendar Primeira Sessão</h3>
                    </div>
                    <Switch
                      checked={scheduleSession}
                      onCheckedChange={setScheduleSession}
                    />
                  </div>
                  
                  {scheduleSession && (
                    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                      <div>
                        <Label className="mb-2 block">Horário Disponível</Label>
                        <TimeSlotPicker
                          onSelect={(date) => {
                            setSessionData({ ...sessionData, scheduled_at: date.toISOString() });
                          }}
                        />
                        {sessionData.scheduled_at && (
                          <p className="text-sm text-primary mt-2">
                            Selecionado: {format(new Date(sessionData.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label>Recorrência</Label>
                        <Select
                          value={sessionData.recurrence_type}
                          onValueChange={(value: 'none' | 'weekly' | 'biweekly' | 'monthly') =>
                            setSessionData({ ...sessionData, recurrence_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a recorrência" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não recorrente</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="biweekly">Quinzenal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                        {sessionData.recurrence_type !== 'none' && sessionData.scheduled_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Serão criadas sessões até o final do mês de {format(new Date(sessionData.scheduled_at), 'MMMM', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isViewMode && (
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={!formData.full_name || isSaving || (scheduleSession && !sessionData.scheduled_at)}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    selectedPatient ? 'Salvar Alterações' : (scheduleSession ? 'Cadastrar e Agendar' : 'Cadastrar Paciente')
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Link Patient Dialog */}
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Digite o e-mail da conta do paciente para vincular. O paciente precisa ter
                criado uma conta no Portal do Paciente primeiro.
              </p>
              <div>
                <Label>E-mail do Paciente</Label>
                <Input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="paciente@email.com"
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  selectedPatient &&
                  linkPatient.mutate({ patientId: selectedPatient.id, email: linkEmail })
                }
                disabled={!linkEmail || linkPatient.isPending}
              >
                {linkPatient.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Vincular Conta
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite Link Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link de Convite Gerado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Envie este link para <strong>{selectedPatient?.full_name}</strong>. 
                O paciente poderá criar sua conta já vinculada ao seu consultório.
                O link expira em 7 dias.
              </p>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="text-xs"
                />
                <Button onClick={copyInviteLink} variant="outline">
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {selectedPatient?.email && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    window.open(
                      `mailto:${selectedPatient.email}?subject=Convite%20para%20Portal%20do%20Paciente&body=Olá%20${encodeURIComponent(selectedPatient.full_name)},%0A%0AVocê%20foi%20convidado%20para%20acessar%20o%20Portal%20do%20Paciente.%20Clique%20no%20link%20abaixo%20para%20criar%20sua%20conta:%0A%0A${encodeURIComponent(inviteLink)}%0A%0AEste%20link%20expira%20em%207%20dias.`,
                      '_blank'
                    );
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por E-mail
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
