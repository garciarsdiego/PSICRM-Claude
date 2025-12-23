-- 1. Fix NULL status data
UPDATE profiles 
SET status = 'pending' 
WHERE status IS NULL;

-- 2. Enforce NOT NULL constraint to prevent future issues
ALTER TABLE profiles 
ALTER COLUMN status SET DEFAULT 'pending';

-- Optional: ALTER COLUMN status SET NOT NULL; 
-- (Only safe if we are sure all rows are fixed, which update above does)
ALTER TABLE profiles 
ALTER COLUMN status SET NOT NULL;

-- 3. Verify roles are valid too
UPDATE profiles
SET role = 'professional'
WHERE role IS NULL;

ALTER TABLE profiles
ALTER COLUMN role SET DEFAULT 'professional';

ALTER TABLE profiles
ALTER COLUMN role SET NOT NULL;
