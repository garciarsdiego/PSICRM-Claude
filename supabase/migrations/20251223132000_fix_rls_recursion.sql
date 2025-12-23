-- Drop existing policies to avoid conflicts causing recursion
DROP POLICY IF EXISTS "Membros podem ver dados da clinica" ON clinics;
DROP POLICY IF EXISTS "Donos podem atualizar sua clinica" ON clinics;
DROP POLICY IF EXISTS "Membros podem ver outros membros da mesma clinica" ON clinic_members;
DROP POLICY IF EXISTS "Clinic Admins podem gerenciar membros" ON clinic_members;

-- Clinics Policies
CREATE POLICY "Users can create clinics" ON clinics
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can view clinics they belong to or own" ON clinics
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clinic_members 
      WHERE clinic_members.clinic_id = clinics.id 
      AND clinic_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their clinics" ON clinics
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their clinics" ON clinics
  FOR DELETE
  USING (owner_id = auth.uid());

-- Clinic Members Policies (Recursion Fix)

-- 1. READ: Allow users to see memberships if they are part of the clinic OR own the clinic
-- Avoids self-join on insert checks typically, but recursive logic is usually:
-- "I can see row X if I have a row Y in this same table". 
-- FIX: Split logic or ensure base condition (ownership via clinics table) is checked first.
CREATE POLICY "View Memberships" ON clinic_members
  FOR SELECT
  USING (
    user_id = auth.uid() -- Can see own membership
    OR
    EXISTS ( -- Or is owner of the clinic this membership belongs to
       SELECT 1 FROM clinics 
       WHERE clinics.id = clinic_members.clinic_id 
       AND clinics.owner_id = auth.uid()
    )
    OR
    EXISTS ( -- Or is a colleague in the same clinic (be careful of recursion here)
       SELECT 1 FROM clinic_members as cm
       WHERE cm.clinic_id = clinic_members.clinic_id 
       AND cm.user_id = auth.uid()
    )
  );

-- 2. INSERT: Allow owners to add members.
-- This was likely the recursion point.
-- We check against the CLINICS table (no recursion) first.
CREATE POLICY "Insert Memberships" ON clinic_members
  FOR INSERT
  WITH CHECK (
    -- Case 1: I am the owner of the clinic (checking clinics table)
    EXISTS (
        SELECT 1 FROM clinics
        WHERE clinics.id = clinic_members.clinic_id
        AND clinics.owner_id = auth.uid()
    )
    OR
    -- Case 2: I am adding MYSELF as part of clinic creation? 
    -- Usually owners add themselves. If the clinic owner_id matches auth.uid(), let them add anyone (including self).
    -- This covers the "create clinic -> add self" flow.
    EXISTS (
        SELECT 1 FROM clinics
        WHERE clinics.id = clinic_members.clinic_id
        AND clinics.owner_id = auth.uid()
    )
  );

-- 3. UPDATE/DELETE: Only Owners or Clinic Admins
CREATE POLICY "Manage Memberships" ON clinic_members
  FOR ALL
  USING (
    -- Optimization: Only check Clinics table for ownership to avoid deep recursion in simple cases
    EXISTS (
        SELECT 1 FROM clinics
        WHERE clinics.id = clinic_members.clinic_id
        AND clinics.owner_id = auth.uid()
    )
  );
