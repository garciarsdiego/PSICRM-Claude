# PSICRM - Análise de Otimizações e Melhorias

Este documento contém uma análise abrangente do projeto PSICRM com identificação de potenciais otimizações e melhorias em diversas categorias.

---

## Sumário Executivo

| Categoria | Severidade | Itens Identificados |
|-----------|------------|---------------------|
| Arquivos Grandes | Alta | 7 arquivos >500 linhas |
| Segurança | Crítica/Alta | 14 vulnerabilidades |
| Performance | Alta | 6 problemas principais |
| TypeScript | Média | 15+ usos de `any` |
| Duplicação de Código | Média | 4 padrões duplicados |
| Arquitetura | Média | 7 melhorias necessárias |

---

## 1. PROBLEMAS CRÍTICOS DE SEGURANÇA

### 1.1 Exposição de Dados Sensíveis

**Arquivo:** `.env` (comitado no repositório)
```
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_PROJECT_ID="geglemxrugxnmfwymtec"
```

**Risco:** Chave JWT exposta no histórico do git.

**Solução:**
1. Adicionar `.env` ao `.gitignore`
2. Remover do histórico git com `git filter-branch`
3. Regenerar chaves no Supabase

### 1.2 CORS Permissivo (Wildcard)

**Arquivos afetados:**
- `supabase/functions/google-calendar-auth/index.ts`
- `supabase/functions/send-gmail/index.ts`
- `supabase/functions/google-calendar-sync/index.ts`
- `supabase/functions/send-email-reminders/index.ts`

```typescript
// ATUAL (Inseguro)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

// RECOMENDADO
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://seudominio.com',
};
```

### 1.3 Armazenamento de Tokens em localStorage

**Arquivo:** `src/integrations/supabase/client.ts` (linhas 13-15)

```typescript
// ATUAL (Vulnerável a XSS)
auth: {
  storage: localStorage,
}

// RECOMENDADO: Usar httpOnly cookies
```

### 1.4 Requisitos Fracos de Senha

**Arquivos:**
- `src/pages/Auth.tsx` (linha 14): Mínimo 6 caracteres
- `src/pages/patient/PatientAuth.tsx` (linha 15): Mínimo 6 caracteres

**Melhor implementação já existe em:**
- `src/components/auth/ChangePasswordDialog.tsx` (linhas 19-24)

```typescript
// RECOMENDADO (aplicar em todos os formulários de auth)
const passwordSchema = z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter letra maiúscula')
  .regex(/[a-z]/, 'Deve conter letra minúscula')
  .regex(/[0-9]/, 'Deve conter número');
```

### 1.5 Headers de Segurança Ausentes

**Arquivo:** `index.html` e `vite.config.ts`

**Headers necessários:**
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `Referrer-Policy`

---

## 2. ARQUIVOS GRANDES (REFATORAÇÃO NECESSÁRIA)

### 2.1 Páginas Críticas

| Arquivo | Linhas | Recomendação |
|---------|--------|--------------|
| `src/pages/Patients.tsx` | 1,799 | Dividir em 6+ componentes |
| `src/pages/Financial.tsx` | 1,010 | Dividir em 4+ componentes |
| `src/pages/Emails.tsx` | 895 | Dividir em 3+ componentes |
| `src/pages/Schedule.tsx` | 866 | Dividir em 4+ componentes |

### 2.2 Proposta de Refatoração - Patients.tsx

**Atual:** 1,799 linhas com 26 variáveis de estado

**Proposto:**
```
src/components/patients/
├── PatientsTable.tsx        # Tabela de pacientes
├── PatientForm.tsx          # Formulário criar/editar
├── PatientToolbar.tsx       # Busca e filtros
├── PatientDialogs.tsx       # Modais de confirmação
├── PatientImport.tsx        # Importação CSV
├── PatientInvite.tsx        # Sistema de convites
└── PatientDetails/
    ├── InfoTab.tsx
    ├── SessionsTab.tsx
    ├── AttachmentsTab.tsx
    └── RecordsTab.tsx
```

---

## 3. DUPLICAÇÃO DE CÓDIGO

### 3.1 Função `generateRecurringDates` Duplicada

**Arquivos:**
- `src/pages/Patients.tsx` (linhas 165-187)
- `src/pages/Schedule.tsx` (linhas 231-254)

**Implementação idêntica!**

**Solução:** Extrair para `src/lib/dateRecurrence.ts`

```typescript
// src/lib/dateRecurrence.ts
export function generateRecurringDates(
  startDate: Date,
  recurrenceRule: string,
  occurrences: number
): Date[] {
  // Implementação única
}
```

### 3.2 Constantes de Status/Cores Duplicadas

**Arquivos com definições duplicadas:**
- `src/pages/Financial.tsx` (linhas 84-96)
- `src/pages/Schedule.tsx` (linhas 80-95)
- `src/components/dashboard/UpcomingSessions.tsx` (linhas 21-32)

**Solução:** Criar `src/lib/constants.ts`

```typescript
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const SESSION_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-yellow-100 text-yellow-800',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};
```

---

## 4. PROBLEMAS DE PERFORMANCE

### 4.1 Query N+1 no Dashboard

**Arquivo:** `src/pages/Dashboard.tsx` (linhas 99-120)

```typescript
// PROBLEMA: 6 queries separadas em loop!
for (let i = 5; i >= 0; i--) {
  const { data: monthSessions } = await supabase
    .from('sessions')
    .select('price')
    .eq('professional_id', userId)
    // ...
}

// SOLUÇÃO: Uma única query com filtro de data
const { data: allMonthSessions } = await supabase
  .from('sessions')
  .select('price, scheduled_at')
  .eq('professional_id', userId)
  .gte('scheduled_at', sixMonthsAgo.toISOString())
  .lte('scheduled_at', today.toISOString());

// Agrupar por mês no cliente
const groupedByMonth = allMonthSessions.reduce((acc, session) => {
  const month = format(new Date(session.scheduled_at), 'MMM');
  // ...
}, {});
```

### 4.2 Memoização Ausente

**Arquivos sem useMemo/useCallback necessário:**
- `src/pages/Patients.tsx` (linha 150): Lista filtrada recalculada
- `src/pages/Financial.tsx`: Sem memoização de gráficos
- `src/components/layout/GlobalSearch.tsx` (linhas 106-128): Mapeamento de resultados

**Solução:**
```typescript
// Antes
const filteredPatients = patients.filter(p =>
  p.full_name.toLowerCase().includes(search)
);

// Depois
const filteredPatients = useMemo(() =>
  patients.filter(p => p.full_name.toLowerCase().includes(search)),
  [patients, search]
);
```

### 4.3 Query Keys Inconsistentes

**Problema:** Cache misses e queries duplicadas

```typescript
// Arquivo: src/pages/Financial.tsx
queryKey: ['sessions', profile?.id]

// Arquivo: src/hooks/useSessions.ts
queryKey: ['sessions', profile?.user_id]

// IDs diferentes = caches separados!
```

**Solução:** Criar factory de query keys

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  patients: (userId: string) => ['patients', userId] as const,
  sessions: (userId: string) => ['sessions', userId] as const,
  expenses: (userId: string) => ['expenses', userId] as const,
};
```

---

## 5. PROBLEMAS DE TYPESCRIPT

### 5.1 Uso Excessivo de `any`

| Arquivo | Linha | Variável |
|---------|-------|----------|
| `src/pages/Dashboard.tsx` | 20-21 | todaySessions, revenueData |
| `src/components/layout/GlobalSearch.tsx` | 82, 114, 121 | filter callbacks |
| `src/pages/Patients.tsx` | 268 | welcomeData |
| `src/contexts/AuthContext.tsx` | 11, 24 | profile |

### 5.2 Type Assertions (`as any`)

```typescript
// PROBLEMA: src/components/schedule/AvailabilitySettings.tsx (linhas 60-61)
setAllowParallelSessions((profile as any).allow_parallel_sessions ?? false);
setBufferBetweenSessions((profile as any).buffer_between_sessions ?? 0);
```

**Solução:** Atualizar tipos do Supabase ou criar interface extendida:

```typescript
interface ExtendedProfile extends Tables<'profiles'> {
  allow_parallel_sessions?: boolean;
  buffer_between_sessions?: number;
}
```

---

## 6. MELHORIAS DE ARQUITETURA

### 6.1 Camada de Serviço Ausente

**Problema:** 102 chamadas `.from()` espalhadas

**Solução:** Criar `src/services/`

```typescript
// src/services/patients.service.ts
export const patientService = {
  list: async (professionalId: string) => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('professional_id', professionalId);
    if (error) throw new ApiError(error.code, 400, error.message);
    return data;
  },

  create: async (patient: PatientInsert) => { ... },
  update: async (id: string, patient: PatientUpdate) => { ... },
  delete: async (id: string) => { ... },
};
```

### 6.2 Error Boundaries Ausentes

**Problema:** Erro em componente = crash da página inteira

**Solução:**
```typescript
// src/components/error/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 6.3 Estrutura de Pastas Melhorada

```
src/
├── components/
│   ├── ui/                    # shadcn/ui
│   ├── common/                # NOVO: Componentes compartilhados
│   ├── skeletons/             # NOVO: Loading states
│   ├── error/                 # NOVO: Error handling
│   ├── patients/              # Renomear de patient/
│   └── ...
├── services/                  # NOVO: Camada de API
│   ├── patients.service.ts
│   ├── sessions.service.ts
│   └── ...
├── types/                     # NOVO: Tipos do domínio
│   ├── patient.types.ts
│   └── session.types.ts
├── lib/
│   ├── utils.ts
│   ├── constants.ts           # NOVO
│   ├── formatters.ts          # NOVO
│   ├── queryKeys.ts           # NOVO
│   └── error-handler.ts       # NOVO
└── hooks/
    ├── queries/               # NOVO: Organizar por tipo
    └── mutations/             # NOVO
```

---

## 7. VALORES HARDCODED

### 7.1 Magic Numbers Identificados

| Valor | Arquivos | Descrição |
|-------|----------|-----------|
| `50` | Settings, Patients, TimeSlotPicker | Duração padrão sessão |
| `5` | GlobalSearch | Limite de resultados |
| `10 * 1024 * 1024` | PatientAttachments | Tamanho máximo arquivo |
| `'08:00'`, `'18:00'` | AvailabilitySettings | Horários padrão |
| `6` | Auth.tsx, PatientAuth.tsx | Mínimo caracteres senha |

**Solução:**
```typescript
// src/lib/constants.ts
export const DEFAULT_SESSION_DURATION = 50;
export const SEARCH_RESULTS_LIMIT = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_WORKING_HOURS = {
  start: '08:00',
  end: '18:00',
};
export const MIN_PASSWORD_LENGTH = 8;
```

---

## 8. TRATAMENTO DE ERROS

### 8.1 Console.error para Produção

**Arquivos com `console.error` que devem ser removidos:**
- `src/pages/Patients.tsx` (linhas 289, 322, 551)
- `src/pages/Schedule.tsx` (linha 296)
- `src/pages/Dashboard.tsx` (linha 124)
- `src/components/schedule/GoogleCalendarIntegration.tsx` (linha 56)
- `src/components/patient/PatientAttachments.tsx` (linhas 145, 168)

**Solução:** Implementar logging estruturado ou serviço de monitoramento (Sentry, LogRocket)

### 8.2 Mensagens de Erro Genéricas

```typescript
// PROBLEMA: Mensagens expostas ao usuário
catch (error) {
  toast({ description: error.message }); // Pode expor detalhes internos
}

// SOLUÇÃO: Mapear erros para mensagens amigáveis
import { handleError } from '@/lib/error-handler';

catch (error) {
  toast({ description: handleError(error) });
}
```

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

### Prioridade 1 (Crítico - Segurança)
- [ ] Remover `.env` do git e adicionar ao `.gitignore`
- [ ] Restringir CORS nas Edge Functions
- [ ] Aplicar requisitos fortes de senha em todos formulários
- [ ] Configurar security headers

### Prioridade 2 (Alta - Performance/Manutenibilidade)
- [ ] Corrigir query N+1 no Dashboard
- [ ] Extrair `generateRecurringDates` para utility
- [ ] Padronizar query keys com factory
- [ ] Criar Error Boundaries

### Prioridade 3 (Média - Qualidade de Código)
- [ ] Refatorar `Patients.tsx` (1,799 linhas)
- [ ] Criar camada de serviços
- [ ] Remover usos de `any`
- [ ] Centralizar constantes

### Prioridade 4 (Baixa - Melhorias)
- [ ] Adicionar Skeleton loaders
- [ ] Implementar memoização
- [ ] Melhorar estrutura de pastas
- [ ] Adicionar logging estruturado

---

## 10. MÉTRICAS DO PROJETO

| Métrica | Valor |
|---------|-------|
| Total de arquivos TypeScript/TSX | 96 |
| Componentes UI (shadcn) | 75+ |
| Páginas | 12 (6 profissional + 6 paciente) |
| Migrações de banco | 9 |
| Edge Functions | 5 |
| Linhas no maior arquivo | 1,799 (Patients.tsx) |
| Usos de `any` | 15+ |
| Chamadas diretas ao Supabase | 102 |

---

*Documento gerado em: 2025-12-23*
*Versão: 1.0*
