import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FinancialChart } from '@/components/financial/FinancialChart';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Check,
  Clock,
  Download,
  Pencil,
  Trash2,
  Loader2,
  Filter,
  BarChart3,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

type Expense = Tables<'expenses'>;

const expenseCategories = [
  { value: 'rent', label: 'Aluguel' },
  { value: 'utilities', label: 'Utilidades' },
  { value: 'supplies', label: 'Materiais' },
  { value: 'software', label: 'Software' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'education', label: 'Educação' },
  { value: 'other', label: 'Outros' },
];

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning-foreground border-warning',
  paid: 'bg-success/20 text-success border-success',
  overdue: 'bg-destructive/20 text-destructive border-destructive',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
};

export default function Financial() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'other',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  // Session selection and editing state
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionData, setEditSessionData] = useState({ price: '', payment_status: '' });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditStatus, setBulkEditStatus] = useState<string>('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue' | 'cancelled'>('all');

  // Fetch sessions with payment info
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions-financial', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*, patients(full_name)')
        .eq('professional_id', profile.user_id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!profile?.id,
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('professional_id', profile.user_id)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!profile?.id,
  });

  // Create expense mutation
  const createExpense = useMutation({
    mutationFn: async (expense: typeof newExpense) => {
      if (!profile?.user_id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('expenses').insert({
        professional_id: profile.user_id,
        description: expense.description,
        amount: parseFloat(expense.amount),
        category: expense.category as Expense['category'],
        expense_date: expense.expense_date,
        notes: expense.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsExpenseDialogOpen(false);
      setNewExpense({
        description: '',
        amount: '',
        category: 'other',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
      toast({ title: 'Despesa registrada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao registrar despesa', variant: 'destructive' });
    },
  });

  // Update session mutation
  const updateSession = useMutation({
    mutationFn: async ({ id, price, payment_status }: { id: string; price: number; payment_status: string }) => {
      const updateData: Record<string, unknown> = { 
        price,
        payment_status 
      };
      if (payment_status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else {
        updateData.paid_at = null;
      }
      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-financial'] });
      setIsEditDialogOpen(false);
      setEditingSession(null);
      toast({ title: 'Sessão atualizada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar sessão', variant: 'destructive' });
    },
  });

  // Bulk update sessions mutation
  const bulkUpdateSessions = useMutation({
    mutationFn: async ({ ids, payment_status }: { ids: string[]; payment_status: string }) => {
      const updateData: Record<string, unknown> = { payment_status };
      if (payment_status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else {
        updateData.paid_at = null;
      }
      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-financial'] });
      setIsBulkEditDialogOpen(false);
      setSelectedSessions([]);
      setBulkEditStatus('');
      toast({ title: `${selectedSessions.length} sessões atualizadas!` });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar sessões', variant: 'destructive' });
    },
  });

  // Delete sessions mutation
  const deleteSessions = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-financial'] });
      setIsDeleteDialogOpen(false);
      setSelectedSessions([]);
      toast({ title: 'Sessões excluídas com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir sessões', variant: 'destructive' });
    },
  });

  // Update payment status mutation (quick action)
  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { payment_status: status };
      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-financial'] });
      toast({ title: 'Status de pagamento atualizado!' });
    },
  });

  // Selection helpers
  const toggleSessionSelection = (id: string) => {
    setSelectedSessions(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAllSessions = () => {
    setSelectedSessions(sessions.map(s => s.id));
  };

  const deselectAllSessions = () => {
    setSelectedSessions([]);
  };

  const openEditDialog = (session: Session) => {
    setEditingSession(session);
    setEditSessionData({
      price: String(session.price),
      payment_status: session.payment_status || 'pending',
    });
    setIsEditDialogOpen(true);
  };

  // Filter sessions based on period and payment status
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];
    const now = new Date();

    // Apply period filter
    if (periodFilter !== 'all') {
      let startDate: Date;
      let endDate: Date;

      if (periodFilter === 'month') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      } else if (periodFilter === 'quarter') {
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
      } else {
        startDate = startOfYear(now);
        endDate = endOfYear(now);
      }

      filtered = filtered.filter((s) => {
        const sessionDate = new Date(s.scheduled_at);
        return sessionDate >= startDate && sessionDate <= endDate;
      });
    }

    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter((s) => s.payment_status === paymentStatusFilter);
    }

    return filtered;
  }, [sessions, periodFilter, paymentStatusFilter]);

  // Calculate totals from filtered sessions
  const totalReceived = filteredSessions
    .filter((s) => s.payment_status === 'paid')
    .reduce((acc, s) => acc + Number(s.price), 0);

  const totalPending = filteredSessions
    .filter((s) => s.payment_status === 'pending' || s.payment_status === 'overdue')
    .reduce((acc, s) => acc + Number(s.price), 0);

  const filteredExpenses = useMemo(() => {
    if (periodFilter === 'all') return expenses;
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (periodFilter === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (periodFilter === 'quarter') {
      startDate = startOfQuarter(now);
      endDate = endOfQuarter(now);
    } else {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    }

    return expenses.filter((e) => {
      const expenseDate = parseISO(e.expense_date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }, [expenses, periodFilter]);

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

  const netProfit = totalReceived - totalExpenses;

  const handleExportCSV = () => {
    const headers = ['Data', 'Paciente', 'Valor', 'Status'];
    const rows = sessions.map((s) => [
      format(new Date(s.scheduled_at), 'dd/MM/yyyy'),
      s.patients?.full_name || 'N/A',
      `R$ ${Number(s.price).toFixed(2)}`,
      paymentStatusLabels[s.payment_status || 'pending'],
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Gerencie pagamentos e despesas do consultório
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Recebido</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0">
              <div className="text-lg lg:text-2xl font-bold text-success">
                R$ {totalReceived.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0">
              <div className="text-lg lg:text-2xl font-bold text-warning">
                R$ {totalPending.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0">
              <div className="text-lg lg:text-2xl font-bold text-destructive">
                R$ {totalExpenses.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0">
              <div className={`text-lg lg:text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {netProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="sessions" className="text-xs lg:text-sm">Sessões</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs lg:text-sm">Despesas</TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-1 text-xs lg:text-sm">
              <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Gráficos</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="text-xs lg:text-sm">Relatório</TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            {/* Bulk Actions */}
            {selectedSessions.length > 0 && (
              <Card>
                <CardContent className="py-3 px-3 lg:px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 lg:gap-4">
                      <Badge variant="secondary" className="text-xs">
                        {selectedSessions.length} selecionadas
                      </Badge>
                      <Button variant="outline" size="sm" onClick={deselectAllSessions} className="text-xs">
                        Limpar
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBulkEditDialogOpen(true)}
                        className="text-xs"
                      >
                        <Pencil className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-xs"
                      >
                        <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <CardContent className="py-3 px-3 lg:px-6">
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 lg:gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs lg:text-sm font-medium">Filtros:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={periodFilter} onValueChange={(value: 'all' | 'month' | 'quarter' | 'year') => setPeriodFilter(value)}>
                      <SelectTrigger className="w-32 lg:w-40 h-8 text-xs lg:text-sm">
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="month">Este mês</SelectItem>
                        <SelectItem value="quarter">Trimestre</SelectItem>
                        <SelectItem value="year">Este ano</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={paymentStatusFilter} onValueChange={(value: 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled') => setPaymentStatusFilter(value)}>
                      <SelectTrigger className="w-32 lg:w-40 h-8 text-xs lg:text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Atrasado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(periodFilter !== 'all' || paymentStatusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setPeriodFilter('all');
                        setPaymentStatusFilter('all');
                      }}
                    >
                      Limpar
                    </Button>
                  )}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {filteredSessions.length} sessões
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 lg:pt-6 lg:px-6">
                {loadingSessions ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : filteredSessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma sessão encontrada
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedSessions(filteredSessions.map(s => s.id))}>
                        Selecionar todas
                      </Button>
                    </div>
                    <ResponsiveTable minWidth="700px">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={selectedSessions.length === filteredSessions.length && filteredSessions.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedSessions(filteredSessions.map(s => s.id));
                                  else deselectAllSessions();
                                }}
                              />
                            </TableHead>
                            <TableHead className="text-xs lg:text-sm">Data</TableHead>
                            <TableHead className="text-xs lg:text-sm">Paciente</TableHead>
                            <TableHead className="text-xs lg:text-sm">Valor</TableHead>
                            <TableHead className="text-xs lg:text-sm">Status</TableHead>
                            <TableHead className="text-xs lg:text-sm">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSessions.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell className="p-2 lg:p-4">
                                <Checkbox
                                  checked={selectedSessions.includes(session.id)}
                                  onCheckedChange={() => toggleSessionSelection(session.id)}
                                />
                              </TableCell>
                              <TableCell className="text-xs lg:text-sm p-2 lg:p-4 whitespace-nowrap">
                                {format(new Date(session.scheduled_at), "dd/MM/yy HH:mm", {
                                  locale: ptBR,
                                })}
                              </TableCell>
                              <TableCell className="text-xs lg:text-sm p-2 lg:p-4">{session.patients?.full_name || 'N/A'}</TableCell>
                              <TableCell className="text-xs lg:text-sm p-2 lg:p-4 whitespace-nowrap">R$ {Number(session.price).toFixed(2)}</TableCell>
                              <TableCell className="p-2 lg:p-4">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${paymentStatusColors[session.payment_status || 'pending']}`}
                                >
                                  {paymentStatusLabels[session.payment_status || 'pending']}
                                </Badge>
                              </TableCell>
                              <TableCell className="p-2 lg:p-4">
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => openEditDialog(session)}
                                  >
                                    <Pencil className="h-3 w-3 lg:h-4 lg:w-4" />
                                  </Button>
                                  {session.payment_status !== 'paid' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() =>
                                        updatePaymentStatus.mutate({
                                          id: session.id,
                                          status: 'paid',
                                        })
                                      }
                                    >
                                      <Check className="h-3 w-3 lg:h-4 lg:w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ResponsiveTable>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Despesa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newExpense.description}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, description: e.target.value })
                        }
                        placeholder="Ex: Aluguel do consultório"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newExpense.amount}
                          onChange={(e) =>
                            setNewExpense({ ...newExpense, amount: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <Select
                          value={newExpense.category}
                          onValueChange={(value) =>
                            setNewExpense({ ...newExpense, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={newExpense.expense_date}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, expense_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Observações (opcional)</Label>
                      <Textarea
                        value={newExpense.notes}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, notes: e.target.value })
                        }
                        placeholder="Notas adicionais..."
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createExpense.mutate(newExpense)}
                      disabled={!newExpense.description || !newExpense.amount}
                    >
                      Salvar Despesa
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                {loadingExpenses ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : expenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa registrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>
                            {expenseCategories.find((c) => c.value === expense.category)?.label ||
                              'Outros'}
                          </TableCell>
                          <TableCell className="text-destructive">
                            - R$ {Number(expense.amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-4">
            <FinancialChart sessions={sessions} expenses={expenses} months={6} />
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Receitas</h3>
                    <div className="flex justify-between">
                      <span>Total de sessões:</span>
                      <span>{sessions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sessões pagas:</span>
                      <span>{sessions.filter((s) => s.payment_status === 'paid').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sessões pendentes:</span>
                      <span>
                        {sessions.filter((s) => s.payment_status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-success">
                      <span>Total recebido:</span>
                      <span>R$ {totalReceived.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Despesas por Categoria</h3>
                    {expenseCategories.map((cat) => {
                      const catTotal = expenses
                        .filter((e) => e.category === cat.value)
                        .reduce((acc, e) => acc + Number(e.amount), 0);
                      if (catTotal === 0) return null;
                      return (
                        <div key={cat.value} className="flex justify-between">
                          <span>{cat.label}:</span>
                          <span className="text-destructive">R$ {catTotal.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-semibold text-destructive border-t pt-2">
                      <span>Total despesas:</span>
                      <span>R$ {totalExpenses.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Lucro Líquido:</span>
                    <span className={netProfit >= 0 ? 'text-success' : 'text-destructive'}>
                      R$ {netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Session Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paciente</Label>
              <Input value={editingSession?.patients?.full_name || 'N/A'} disabled />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                value={editingSession ? format(new Date(editingSession.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                disabled
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={editSessionData.price}
                onChange={(e) => setEditSessionData({ ...editSessionData, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Status de Pagamento</Label>
              <Select
                value={editSessionData.payment_status}
                onValueChange={(value) => setEditSessionData({ ...editSessionData, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingSession) {
                  updateSession.mutate({
                    id: editingSession.id,
                    price: parseFloat(editSessionData.price),
                    payment_status: editSessionData.payment_status,
                  });
                }
              }}
              disabled={updateSession.isPending}
            >
              {updateSession.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {selectedSessions.length} Sessões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo Status de Pagamento</Label>
              <Select value={bulkEditStatus} onValueChange={setBulkEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (bulkEditStatus) {
                  bulkUpdateSessions.mutate({
                    ids: selectedSessions,
                    payment_status: bulkEditStatus,
                  });
                }
              }}
              disabled={!bulkEditStatus || bulkUpdateSessions.isPending}
            >
              {bulkUpdateSessions.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Atualizar Todas'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedSessions.length} sessão(ões)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSessions.mutate(selectedSessions)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSessions.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
