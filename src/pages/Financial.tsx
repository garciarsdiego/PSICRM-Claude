import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  AlertCircle,
  Download,
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

  // Update payment status mutation
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

  // Calculate totals
  const totalReceived = sessions
    .filter((s) => s.payment_status === 'paid')
    .reduce((acc, s) => acc + Number(s.price), 0);

  const totalPending = sessions
    .filter((s) => s.payment_status === 'pending' || s.payment_status === 'overdue')
    .reduce((acc, s) => acc + Number(s.price), 0);

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">
              Gerencie pagamentos e despesas do consultório
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recebido</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                R$ {totalReceived.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                R$ {totalPending.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {totalExpenses.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {netProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="report">Relatório</TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {loadingSessions ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma sessão encontrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            {format(new Date(session.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>{session.patients?.full_name || 'N/A'}</TableCell>
                          <TableCell>R$ {Number(session.price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={paymentStatusColors[session.payment_status || 'pending']}
                            >
                              {paymentStatusLabels[session.payment_status || 'pending']}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {session.payment_status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updatePaymentStatus.mutate({
                                    id: session.id,
                                    status: 'paid',
                                  })
                                }
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Marcar Pago
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </AppLayout>
  );
}
