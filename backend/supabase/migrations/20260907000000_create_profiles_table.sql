CREATE TABLE profiles (
  id uuid references auth.users ON DELETE CASCADE primary key,
  display_name text,
  risk_style text,
  risk_answer int,
  goal_answer int,
  brand_picks text[],
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
