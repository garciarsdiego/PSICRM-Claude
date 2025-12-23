-- Remove todas policies de Clinics e Clinic Members para redefinir do zero SEM recursão
DROP POLICY IF EXISTS "Clinics Basic Access" ON clinics;
DROP POLICY IF EXISTS "Clinics Insert" ON clinics;
DROP POLICY IF EXISTS "Members View Own Membership" ON clinic_members;
DROP POLICY IF EXISTS "Members View Clinic" ON clinics;
DROP POLICY IF EXISTS "Owner Adds Members" ON clinic_members;

-- 1. CLINICS:
-- Dono VÊ, EDITA, DELETA.
-- User Autenticado CRIA.
-- Membros: NÃO vêem via RLS direta nesta etapa para evitar recursão. (O app pode mostrar via owner_id ou assumir contexto).
CREATE POLICY "Clinics Owner Access" ON clinics
  FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Clinics Insert Access" ON clinics
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 2. CLINIC_MEMBERS:
-- Members VÊEM seu próprio registro.
-- Dono da Clínica (checado via clinics) pode INSERIR/EDITAR/DELETAR.
-- Como a policy de CLINICS agora só permite o DONO ver, quando fizermos essa checagem, 
-- ela passará limpa sem tentar ler clinic_members de volta (pois removemos a policy que fazia isso).

CREATE POLICY "Members View Own" ON clinic_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Clinic Owner Manages Members" ON clinic_members
  FOR ALL
  USING (
    EXISTS (
        SELECT 1 FROM clinics
        WHERE clinics.id = clinic_members.clinic_id
        AND clinics.owner_id = auth.uid()
    )
  );
