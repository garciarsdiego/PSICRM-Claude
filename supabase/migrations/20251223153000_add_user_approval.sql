-- Create user_status enum
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'rejected');

-- Add status column to profiles with default 'pending'
ALTER TABLE profiles 
ADD COLUMN status user_status NOT NULL DEFAULT 'pending';

-- Set existing users to 'active' so we don't lock everyone out
UPDATE profiles SET status = 'active';

-- Add index for faster filtering by status
CREATE INDEX idx_profiles_status ON profiles(status);
