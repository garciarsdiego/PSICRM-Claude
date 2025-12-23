-- Adicionar novos tipos de role para suportar hierarquia da clínica e admin global
-- Nota: O Supabase não suporta 'IF NOT EXISTS' diretamente em ADICIONAR VALOR em todos os ambientes Postgres, 
-- mas geralmente em migrations isso é gerenciado. Se falhar, verifique se os valores já existem.
DO $$
BEGIN
    ALTER TYPE app_role ADD VALUE 'admin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE app_role ADD VALUE 'clinic_admin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE app_role ADD VALUE 'staff';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de Clínicas
CREATE TABLE IF NOT EXISTS clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Membros da Clínica (vínculo Usuário -> Clínica)
CREATE TABLE IF NOT EXISTS clinic_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- Valores esperados: 'owner', 'clinic_admin', 'professional', 'staff'
  permissions JSONB DEFAULT '{}', -- Permissões granulares ex: { "can_view_financial": true }
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

-- Habilitar RLS (Row Level Security) - Segurança Básica
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS) Sugeridas (Simplificadas para início)

-- Quem pode ver a clínica? Membros da clínica.
CREATE POLICY "Membros podem ver dados da clinica" ON clinics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_members 
      WHERE clinic_members.clinic_id = clinics.id 
      AND clinic_members.user_id = auth.uid()
    )
    OR
    owner_id = auth.uid()
  );

-- Quem pode criar clínica? Qualquer usuário autenticado (por enquanto, ou restringir depois)
CREATE POLICY "Usuarios autenticados podem criar clinicas" ON clinics
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Quem pode ver membros? Outros membros da mesma clínica.
CREATE POLICY "Membros podem ver lista de membros" ON clinic_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_members cm 
      WHERE cm.clinic_id = clinic_members.clinic_id 
      AND cm.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM clinics c
        WHERE c.id = clinic_members.clinic_id
        AND c.owner_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users to ensure they can interact with the tables
GRANT ALL ON clinics TO authenticated;
GRANT ALL ON clinic_members TO authenticated;
GRANT ALL ON clinics TO service_role;
GRANT ALL ON clinic_members TO service_role;
