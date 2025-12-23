-- 1. Ensure the trigger exists and is linked to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Sync missing profiles (Retroactive fix for users created when trigger might have been off)
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT 
  id, 
  email,
  raw_user_meta_data->>'full_name',
  COALESCE((raw_user_meta_data->>'role')::app_role, 'professional'),
  'pending'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 3. Double check RLS for Admin
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR id = auth.uid() -- Allow users to view themselves
);
