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
  MoreHorizontal,
  Trash2,
  UserX,
  UserCheck,
  Upload,
  FileText,
  Download,
  Users,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  
  // Bulk selection and actions
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ is_active: '', session_price: '' });
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'csv' | 'text'>('csv');
  const [isImporting, setIsImporting] = useState(false);
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
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [sessionData, setSessionData] = useState({
    scheduled_at: '',
    recurrence_type: 'none' as 'none' | 'weekly' | 'biweekly' | 'monthly',
    duration: 50,
    price: '',
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
      let firstSessionMeetLink: string | null = null;
      if (!selectedPatient && scheduleSession && sessionData.scheduled_at) {
        const scheduledDate = new Date(sessionData.scheduled_at);
        const recurringDates = generateRecurringDates(scheduledDate, sessionData.recurrence_type);
        
        const sessionPrice = sessionData.price 
          ? parseFloat(sessionData.price) 
          : (data.session_price ? parseFloat(data.session_price) : profile.session_price || 0);
        const sessionDuration = sessionData.duration || profile.session_duration || 50;
        
        const sessionsToInsert = recurringDates.map((date) => ({
          professional_id: profile.user_id,
          patient_id: patientId,
          scheduled_at: date.toISOString(),
          duration: sessionDuration,
          price: Number(sessionPrice),
          is_recurring: sessionData.recurrence_type !== 'none',
          recurrence_rule: sessionData.recurrence_type !== 'none' ? sessionData.recurrence_type : null,
          title: `Sessão - ${data.full_name}`,
        }));
        
        const { data: createdSessions, error: sessionError } = await supabase
          .from('sessions')
          .insert(sessionsToInsert)
          .select('meet_link');
        if (sessionError) throw sessionError;
        
        // Get meet link from first session if available
        if (createdSessions && createdSessions.length > 0) {
          firstSessionMeetLink = createdSessions[0].meet_link;
        }
      }

      // Send welcome email if enabled
      if (!selectedPatient && sendWelcomeEmail && data.email) {
        try {
          const welcomeData: any = {
            patient_name: data.full_name,
            session_duration: sessionData.duration || profile.session_duration || 50,
          };
          
          if (scheduleSession && sessionData.scheduled_at) {
            const scheduledDate = new Date(sessionData.scheduled_at);
            welcomeData.first_session_date = format(scheduledDate, 'dd/MM/yyyy', { locale: ptBR });
            welcomeData.first_session_time = format(scheduledDate, 'HH:mm');
            welcomeData.meet_link = firstSessionMeetLink;
          }

          await supabase.functions.invoke('send-gmail', {
            body: {
              professional_id: profile.user_id,
              to: data.email,
              template: 'welcome',
              data: welcomeData,
            },
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      return { 
        isNew: !selectedPatient, 
        sessionsCreated: scheduleSession && sessionData.scheduled_at 
          ? generateRecurringDates(new Date(sessionData.scheduled_at), sessionData.recurrence_type).length 
          : 0,
        emailSent: sendWelcomeEmail && data.email,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      closeDialog();
      
      let message = selectedPatient ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado com sucesso!';
      
      if (result?.sessionsCreated && result.sessionsCreated > 0) {
        message = result.sessionsCreated > 1
          ? `Paciente cadastrado e ${result.sessionsCreated} sessões agendadas!`
          : 'Paciente cadastrado e sessão agendada!';
      }
      
      if (result?.emailSent) {
        message += ' E-mail de boas-vindas enviado.';
      }
      
      toast({ title: message });
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

  // Delete patient mutation
  const deletePatient = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDeletePatientId(null);
      toast({ title: 'Paciente excluído com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir paciente. Verifique se não há sessões vinculadas.', variant: 'destructive' });
    },
  });

  // Toggle patient active status
  const togglePatientStatus = useMutation({
    mutationFn: async ({ patientId, isActive }: { patientId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('patients')
        .update({ is_active: isActive })
        .eq('id', patientId);
      if (error) throw error;
      return isActive;
    },
    onSuccess: (isActive) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({ title: isActive ? 'Paciente reativado!' : 'Paciente desativado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao alterar status do paciente', variant: 'destructive' });
    },
  });

  // Bulk update patients mutation
  const bulkUpdatePatients = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: { is_active?: boolean; session_price?: number } }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.session_price !== undefined) updateData.session_price = updates.session_price;
      
      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsBulkEditDialogOpen(false);
      setSelectedPatients([]);
      setBulkEditData({ is_active: '', session_price: '' });
      toast({ title: `${selectedPatients.length} pacientes atualizados!` });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar pacientes', variant: 'destructive' });
    },
  });

  // Bulk delete patients mutation
  const bulkDeletePatients = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsBulkDeleteDialogOpen(false);
      setSelectedPatients([]);
      toast({ title: 'Pacientes excluídos com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir pacientes. Verifique se não há sessões vinculadas.', variant: 'destructive' });
    },
  });

  // Import patients mutation
  const importPatients = useMutation({
    mutationFn: async (patientsData: Array<{
      full_name: string;
      email?: string;
      phone?: string;
      session_price?: number;
      birth_date?: string;
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      cpf?: string;
      emergency_contact?: string;
      emergency_phone?: string;
      clinical_notes?: string;
    }>) => {
      if (!profile?.user_id) throw new Error('Usuário não autenticado');
      
      const patientsToInsert = patientsData.map(p => ({
        professional_id: profile.user_id,
        full_name: p.full_name.trim(),
        email: p.email?.trim() || null,
        phone: p.phone?.trim() || null,
        session_price: p.session_price || null,
        birth_date: p.birth_date?.trim() || null,
        address: p.address?.trim() || null,
        city: p.city?.trim() || null,
        state: p.state?.trim() || null,
        zip_code: p.zip_code?.trim() || null,
        cpf: p.cpf?.trim() || null,
        emergency_contact: p.emergency_contact?.trim() || null,
        emergency_phone: p.emergency_phone?.trim() || null,
        clinical_notes: p.clinical_notes?.trim() || null,
        is_active: true,
      }));
      
      const { error } = await supabase
        .from('patients')
        .insert(patientsToInsert);
      if (error) throw error;
      
      return patientsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsImportDialogOpen(false);
      setImportText('');
      toast({ title: `${count} pacientes importados com sucesso!` });
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast({ title: 'Erro ao importar pacientes', variant: 'destructive' });
    },
  });

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    
    // Check if first line is header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('nome') || firstLine.includes('name') || firstLine.includes('email');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    
    return dataLines
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        return {
          full_name: parts[0] || '',
          email: parts[1] || undefined,
          phone: parts[2] || undefined,
          session_price: parts[3] ? parseFloat(parts[3]) : undefined,
          birth_date: parts[4] || undefined,
          cpf: parts[5] || undefined,
          address: parts[6] || undefined,
          city: parts[7] || undefined,
          state: parts[8] || undefined,
          zip_code: parts[9] || undefined,
          emergency_contact: parts[10] || undefined,
          emergency_phone: parts[11] || undefined,
          clinical_notes: parts[12] || undefined,
        };
      })
      .filter(p => p.full_name);
  };

  const parseText = (text: string) => {
    const lines = text.trim().split('\n');
    return lines
      .filter(line => line.trim())
      .map(line => {
        const trimmed = line.trim();
        // Try to extract email if present
        const emailMatch = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/);
        const email = emailMatch ? emailMatch[0] : undefined;
        // Remove email from name if found
        const name = email ? trimmed.replace(email, '').replace(/[,;-]/, '').trim() : trimmed;
        return { full_name: name, email };
      })
      .filter(p => p.full_name);
  };

  const downloadTemplate = () => {
    const headers = 'nome,email,telefone,valor_sessao,data_nascimento,cpf,endereco,cidade,estado,cep,contato_emergencia,telefone_emergencia,observacoes';
    const example = 'João Silva,joao@email.com,(11) 99999-9999,200,1990-01-15,123.456.789-00,Rua Exemplo 123,São Paulo,SP,01234-567,Maria Silva,(11) 98888-8888,Observações do paciente';
    const content = `${headers}\n${example}`;
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_pacientes.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Template baixado!' });
  };

  const exportPatientsToCSV = () => {
    const headers = 'nome,email,telefone,valor_sessao,data_nascimento,cpf,endereco,cidade,estado,cep,contato_emergencia,telefone_emergencia,observacoes,status';
    
    const rows = patients.map(p => {
      const escape = (val: string | null | undefined) => {
        if (!val) return '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = val.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
      };
      
      return [
        escape(p.full_name),
        escape(p.email),
        escape(p.phone),
        p.session_price?.toString() || '',
        escape(p.birth_date),
        escape(p.cpf),
        escape(p.address),
        escape(p.city),
        escape(p.state),
        escape(p.zip_code),
        escape(p.emergency_contact),
        escape(p.emergency_phone),
        escape(p.clinical_notes),
        p.is_active ? 'ativo' : 'inativo',
      ].join(',');
    });
    
    const content = `${headers}\n${rows.join('\n')}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pacientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: `${patients.length} pacientes exportados!` });
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      toast({ title: 'Digite ou cole os dados para importar', variant: 'destructive' });
      return;
    }
    
    setIsImporting(true);
    try {
      const patients = importMode === 'csv' ? parseCSV(importText) : parseText(importText);
      if (patients.length === 0) {
        toast({ title: 'Nenhum paciente válido encontrado', variant: 'destructive' });
        return;
      }
      await importPatients.mutateAsync(patients);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  // Selection helpers
  const togglePatientSelection = (id: string) => {
    setSelectedPatients(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllPatients = () => {
    setSelectedPatients(filteredPatients.map(p => p.id));
  };

  const deselectAllPatients = () => {
    setSelectedPatients([]);
  };

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
    setSendWelcomeEmail(false);
    setSessionData({ scheduled_at: '', recurrence_type: 'none', duration: 50, price: '' });
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
      (showInactive || p.is_active) &&
      (p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm))
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPatientsToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-sm whitespace-nowrap">
              Mostrar inativos
            </Label>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedPatients.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {selectedPatients.length} selecionados
                  </Badge>
                  <Button variant="outline" size="sm" onClick={deselectAllPatients}>
                    Limpar seleção
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBulkEditDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar em massa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      bulkUpdatePatients.mutate({ ids: selectedPatients, updates: { is_active: true } });
                    }}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Ativar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      bulkUpdatePatients.mutate({ ids: selectedPatients, updates: { is_active: false } });
                    }}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Desativar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={selectAllPatients}>
                    Selecionar todos
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) selectAllPatients();
                            else deselectAllPatients();
                          }}
                        />
                      </TableHead>
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
                          <Checkbox
                            checked={selectedPatients.includes(patient.id)}
                            onCheckedChange={() => togglePatientSelection(patient.id)}
                          />
                        </TableCell>
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
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDialog(patient, true)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDialog(patient, false)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {patient.is_active ? (
                                <DropdownMenuItem
                                  onClick={() => togglePatientStatus.mutate({ patientId: patient.id, isActive: false })}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => togglePatientStatus.mutate({ patientId: patient.id, isActive: true })}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Reativar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletePatientId(patient.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
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
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Duração (min)</Label>
                          <Input
                            type="number"
                            value={sessionData.duration}
                            onChange={(e) =>
                              setSessionData({ ...sessionData, duration: parseInt(e.target.value) || 50 })
                            }
                            placeholder="50"
                          />
                        </div>
                        <div>
                          <Label>Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={sessionData.price}
                            onChange={(e) =>
                              setSessionData({ ...sessionData, price: e.target.value })
                            }
                            placeholder="Valor padrão"
                          />
                        </div>
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

              {/* Send Welcome Email - Only for new patients with email */}
              {!selectedPatient && !isViewMode && formData.email && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Enviar E-mail de Boas-vindas</h3>
                        <p className="text-xs text-muted-foreground">
                          Um e-mail será enviado para {formData.email}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={sendWelcomeEmail}
                      onCheckedChange={setSendWelcomeEmail}
                    />
                  </div>
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

        {/* Delete Patient Confirmation */}
        <AlertDialog open={!!deletePatientId} onOpenChange={(open) => !open && setDeletePatientId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.
                Se houver sessões vinculadas, a exclusão falhará.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePatientId && deletePatient.mutate(deletePatientId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePatient.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedPatients.length} paciente(s)? Esta ação não pode ser desfeita.
                Pacientes com sessões vinculadas não serão excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDeletePatients.mutate(selectedPatients)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkDeletePatients.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Excluir Todos'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Edit Dialog */}
        <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar {selectedPatients.length} Pacientes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={bulkEditData.is_active} onValueChange={(value) => setBulkEditData({ ...bulkEditData, is_active: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Manter atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor da Sessão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={bulkEditData.session_price}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, session_price: e.target.value })}
                  placeholder="Manter atual"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const updates: { is_active?: boolean; session_price?: number } = {};
                    if (bulkEditData.is_active) updates.is_active = bulkEditData.is_active === 'true';
                    if (bulkEditData.session_price) updates.session_price = parseFloat(bulkEditData.session_price);
                    if (Object.keys(updates).length > 0) {
                      bulkUpdatePatients.mutate({ ids: selectedPatients, updates });
                    } else {
                      toast({ title: 'Selecione ao menos um campo para editar', variant: 'destructive' });
                    }
                  }}
                  disabled={bulkUpdatePatients.isPending}
                >
                  {bulkUpdatePatients.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Aplicar a Todos'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Importar Pacientes</DialogTitle>
            </DialogHeader>
            <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'csv' | 'text')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </TabsTrigger>
                <TabsTrigger value="text">
                  <User className="h-4 w-4 mr-2" />
                  Lista de Nomes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="csv" className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Carregar arquivo CSV</Label>
                    <Input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Template
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ou cole os dados CSV</Label>
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="nome,email,telefone,valor_sessao,data_nascimento,cpf,endereco,cidade,estado,cep,contato_emergencia,telefone_emergencia,observacoes&#10;João Silva,joao@email.com,(11) 99999-9999,200,1990-01-15,123.456.789-00,Rua A,SP,SP,01234-567,Maria,(11) 8888-8888,Obs"
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Campos: Nome, Email, Telefone, Valor, Data Nascimento (AAAA-MM-DD), CPF, Endereço, Cidade, Estado, CEP, Contato Emergência, Tel. Emergência, Observações.
                </p>
              </TabsContent>
              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label>Cole a lista de pacientes (um por linha)</Label>
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="João Silva&#10;Maria Santos, maria@email.com&#10;Pedro Oliveira"
                    rows={10}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite um nome por linha. Emails serão detectados automaticamente se incluídos.
                </p>
              </TabsContent>
            </Tabs>
            {importText && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Prévia:</p>
                <p className="text-sm text-muted-foreground">
                  {importMode === 'csv' ? parseCSV(importText).length : parseText(importText).length} pacientes serão importados
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setImportText(''); }}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={isImporting || !importText.trim()}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
