-- Drop RPC function to avoid confusion
DROP FUNCTION IF EXISTS public.get_admin_users();

-- Simplest possible RLS for testing: Allow any authenticated user to read all profiles
-- This is temporary to verify data existence. We will tighten it later.
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles; 

CREATE POLICY "Allow Authenticated Read All"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Allow Admins to update (keep this restricted)
CREATE POLICY "Admins Update"
ON profiles FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
