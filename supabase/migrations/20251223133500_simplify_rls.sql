-- Simplificando radicalmente para quebrar o ciclo
DROP POLICY IF EXISTS "Users can create clinics" ON clinics;
DROP POLICY IF EXISTS "Users can view clinics they belong to or own" ON clinics;
DROP POLICY IF EXISTS "Owners can update their clinics" ON clinics;
DROP POLICY IF EXISTS "Owners can delete their clinics" ON clinics;

DROP POLICY IF EXISTS "View Memberships" ON clinic_members;
DROP POLICY IF EXISTS "Insert Memberships" ON clinic_members;
DROP POLICY IF EXISTS "Manage Memberships" ON clinic_members;

-- 1. CLINICS: Base Table
-- Permite leitura se for dono.
-- Para membros, vamos usar uma abordagem diferente para evitar recursão:
-- O usuário pode ver a clínica se o ID dela estiver numa lista de IDs que ele tem acesso (via função ou query direta sem JOIN implícito de policy)
-- Por enquanto, vamos focar no DONO criar.
CREATE POLICY "Clinics Basic Access" ON clinics
  FOR ALL
  USING (
    owner_id = auth.uid() -- Dono tem acesso total
  );

-- Habilitar leitura pública ou autenticada para facilitar (temporário para debug, ou restrito)
-- Se quisermos que membros vejam, precisamos que a policy de members não dependa de clinics.
-- Vamos permitir que usuários autenticados CRIEM.
CREATE POLICY "Clinics Insert" ON clinics
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Para permitir que membros vejam a clínica sem recursão:
-- A policy de members NÃO PODE ler a tabela clinics se a policy de clinics ler a tabela members.
-- Vamos fazer a policy de members ser SIMPLES, baseada apenas no user_id da própria tabela.
CREATE POLICY "Members View Own Membership" ON clinic_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Agora voltamos na clinics. Se o membro pode ver seu próprio membership, podemos usar isso?
-- Sim, mas a query deve ser cuidadosa.
CREATE POLICY "Members View Clinic" ON clinics
  FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM clinic_members 
        WHERE clinic_members.clinic_id = clinics.id 
        AND clinic_members.user_id = auth.uid()
    )
  );

-- Insert em Members: O dono da clínica pode inserir.
-- A validação "é dono" deve ser feita olhando para CLINICS.
-- Isso é seguro? Sim, a policy "Clinics Basic Access" garante que eu vejo a clínica se sou dono.
CREATE POLICY "Owner Adds Members" ON clinic_members
  FOR INSERT
  WITH CHECK (
     EXISTS (
        SELECT 1 FROM clinics
        WHERE clinics.id = clinic_members.clinic_id
        AND clinics.owner_id = auth.uid()
     )
  );
