import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

type Expense = Tables<'expenses'>;

interface FinancialChartProps {
  sessions: Session[];
  expenses: Expense[];
  months?: number;
}

const chartConfig = {
  revenue: {
    label: 'Receitas',
    color: 'hsl(var(--success))',
  },
  expenses: {
    label: 'Despesas',
    color: 'hsl(var(--destructive))',
  },
  profit: {
    label: 'Lucro',
    color: 'hsl(var(--primary))',
  },
};

export function FinancialChart({ sessions, expenses, months = 6 }: FinancialChartProps) {
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, 'MMM yyyy', { locale: ptBR });

      // Calculate revenue (paid sessions)
      const monthRevenue = sessions
        .filter((s) => {
          const sessionDate = new Date(s.scheduled_at);
          return (
            s.payment_status === 'paid' &&
            sessionDate >= monthStart &&
            sessionDate <= monthEnd
          );
        })
        .reduce((acc, s) => acc + Number(s.price), 0);

      // Calculate expenses
      const monthExpenses = expenses
        .filter((e) => {
          const expenseDate = parseISO(e.expense_date);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        })
        .reduce((acc, e) => acc + Number(e.amount), 0);

      data.push({
        month: monthLabel,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }

    return data;
  }, [sessions, expenses, months]);

  const totalRevenue = chartData.reduce((acc, d) => acc + d.revenue, 0);
  const totalExpenses = chartData.reduce((acc, d) => acc + d.expenses, 0);
  const avgProfit = chartData.length > 0 
    ? chartData.reduce((acc, d) => acc + d.profit, 0) / chartData.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Bar Chart - Revenue vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                  />
                } 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                dataKey="revenue" 
                fill="var(--color-revenue)" 
                radius={[4, 4, 0, 0]}
                name="Receitas"
              />
              <Bar 
                dataKey="expenses" 
                fill="var(--color-expenses)" 
                radius={[4, 4, 0, 0]}
                name="Despesas"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Area Chart - Profit Evolution */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Lucro</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                  />
                } 
              />
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone"
                dataKey="profit" 
                stroke="var(--color-profit)" 
                fill="url(#profitGradient)"
                strokeWidth={2}
                name="Lucro"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Receitas ({months} meses)</p>
              <p className="text-2xl font-bold text-success">
                R$ {totalRevenue.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Despesas ({months} meses)</p>
              <p className="text-2xl font-bold text-destructive">
                R$ {totalExpenses.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Lucro Médio Mensal</p>
              <p className={`text-2xl font-bold ${avgProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {avgProfit.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
