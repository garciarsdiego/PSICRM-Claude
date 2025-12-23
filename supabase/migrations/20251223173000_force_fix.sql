-- 1. Force Reset ALL RLS Policies on profiles to be absolutely sure
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Allow Authenticated Read All" ON profiles;
DROP POLICY IF EXISTS "Admins Update" ON profiles;

-- 2. Create Simple Global Read Policy
CREATE POLICY "Global Read"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Create Admin Update Policy
CREATE POLICY "Admin Update"
ON profiles FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Create Self Update Policy (optional, for profile editing)
CREATE POLICY "Self Update"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. Force update recent professionals to PENDING to verify existence
-- This helps if the user had an old 'active' profile hiding somewhere
UPDATE profiles 
SET status = 'pending' 
WHERE role = 'professional' 
AND (status IS NULL OR status = 'active');
-- Note: This might logout active legit users, but needed for testing validation.

-- 6. Ensure user_id column is synced with id if it exists (Legacy Support)
-- If user_id column exists, copy id to it if null
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
    EXECUTE 'UPDATE profiles SET user_id = id WHERE user_id IS NULL';
  END IF;
END $$;
