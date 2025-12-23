-- Clean up orphan records before adding constraints
-- 1. Delete clinics where owner is not in profiles
DELETE FROM clinics
WHERE owner_id NOT IN (SELECT id FROM profiles);

-- 2. Delete audit_logs where user_id is not in profiles
DELETE FROM audit_logs
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM profiles);

-- 3. Delete clinic_members where user_id is not in profiles
DELETE FROM clinic_members
WHERE user_id NOT IN (SELECT id FROM profiles);


-- Now apply constraints
-- 1. Fix Clinics -> Profiles
ALTER TABLE clinics
  DROP CONSTRAINT IF EXISTS clinics_owner_id_fkey;

ALTER TABLE clinics
  ADD CONSTRAINT clinics_owner_id_profiles_fkey
  FOREIGN KEY (owner_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- 2. Fix Audit Logs -> Profiles
ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_user_id_profiles_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- 3. Fix Clinic Members -> Profiles
ALTER TABLE clinic_members
  DROP CONSTRAINT IF EXISTS clinic_members_user_id_fkey;

ALTER TABLE clinic_members
  ADD CONSTRAINT clinic_members_user_id_profiles_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;
