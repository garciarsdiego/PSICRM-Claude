import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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
  DialogTrigger,
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Edit,
  Eye,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Patient = Tables<'patients'>;

export default function Patients() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
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

  // Fetch patients
  const { data: patients = [], isLoading } = useQuery({
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

      if (selectedPatient) {
        const { error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', selectedPatient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('patients').insert(patientData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      closeDialog();
      toast({
        title: selectedPatient
          ? 'Paciente atualizado com sucesso!'
          : 'Paciente cadastrado com sucesso!',
      });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar paciente', variant: 'destructive' });
    },
  });

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
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm)
  );

  const activePatients = filteredPatients.filter((p) => p.is_active);
  const inactivePatients = filteredPatients.filter((p) => !p.is_active);

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
            </DialogTrigger>
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

                {!isViewMode && (
                  <Button
                    className="w-full"
                    onClick={() => savePatient.mutate(formData)}
                    disabled={!formData.full_name}
                  >
                    {selectedPatient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
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
              <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {patients.filter((p) => !p.is_active).length}
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
      </div>
    </AppLayout>
  );
}
