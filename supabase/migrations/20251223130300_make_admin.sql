-- Create role column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role app_role DEFAULT 'professional';
    END IF;
END $$;

-- Make Diego Admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'garciarsdiego@gmail.com';
