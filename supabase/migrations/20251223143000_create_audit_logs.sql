-- Create Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  action TEXT NOT NULL,
  entity TEXT NOT NULL, -- 'clinic', 'user', 'patient'
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add last_seen to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- RLS for Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view all logs
CREATE POLICY "Admins View All Audit Logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can view their own logs (optional, maybe unnecessary for now)
CREATE POLICY "Users View Own Logs" ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Insert policy (System or triggered actions usually, but we allow authenticated inserts for now for frontend tracking)
CREATE POLICY "Users Create Logs" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
