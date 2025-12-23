# Plano de Implementação: Visão Administrador e Versão Clínica/Multi-profissional

## 1. Visão Administrador do Sistema (Super Admin)
Esta visão é destinada aos gestores da plataforma (SaaS) ou administradores globais.

### Funcionalidades:
- **Dashboard Global**: Métricas gerais (Total de Psicólogos, Pacientes, Consultas realizadas).
- **Gestão de Usuários**: Listagem de todos os profissionais e pacientes cadastrados, com opções de bloquear/desbloquear.

## 2. Versão para Clínicas (Multi-profissional)
Esta funcionalidade permite que múltiplos psicólogos operem sob uma mesma "clínica" ou "organização".

### Estrutura de Dados Proposta (Supabase):
Precisaremos atualizar o banco de dados para suportar estas relações.

```sql
-- Adicionar novos tipos de role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'clinic_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'staff';

-- Tabela de Clínicas
CREATE TABLE clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Membros da Clínica (vínculo Usuário -> Clínica)
CREATE TABLE clinic_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'professional', 'secretary'
  permissions JSONB DEFAULT '{}', -- Permissões granulares ex: { "can_view_financial": true }
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);
```

### Funcionalidades da Clínica:
- **Gestão de Equipe**: Convidar outros psicólogos ou secretários.
- **Níveis de Acesso (RBAC)**:
    - **Dono**: Acesso total.
    - **Admin/Gerente**: Pode adicionar membros e ver relatórios.
    - **Profissional**: Vê apenas seus pacientes e agenda (ou compartilhado, configurável).
    - **Secretaria**: Vê agenda de todos, mas não vê prontuários médicos.

---

## Próximos Passos (Nesta Sessão)

1.  **Frontend Admin**: Criar layout e páginas para a visão do Administrador do Sistema.
2.  **Frontend Clínica**: Criar página de "Gestão de Equipe" dentro de Configurações, onde seria possível configurar os níveis de acesso (interface visual primeiro).
