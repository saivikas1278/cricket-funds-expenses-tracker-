-- Ensure the UUID generation extension is active
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Players Table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely enforce the UNIQUE constraint on existing tables so ON CONFLICT works!
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_name_key;
ALTER TABLE public.players ADD CONSTRAINT players_name_key UNIQUE (name);

-- 2) Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  payment_date DATE NOT NULL DEFAULT current_date,
  week_identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT payments_week_identifier_format_chk 
    CHECK (week_identifier ~ '^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'),
  
  CONSTRAINT payments_player_week_unique UNIQUE (player_id, week_identifier)
);

-- 3) Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Equipment',
  amount NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT current_date,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_payments_week_identifier ON public.payments (week_identifier);
CREATE INDEX IF NOT EXISTS idx_payments_player_id ON public.payments (player_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (expense_date);

-- 4) Sample Player Roster Seed
-- Now that the players_name_key is guaranteed to exist via the ALTER TABLE, this will work perfectly.
INSERT INTO public.players (name, is_active) VALUES
  ('Rohit Sharma', true),
  ('Virat Kohli', true),
  ('KL Rahul', true),
  ('Jasprit Bumrah', true),
  ('Ravindra Jadeja', true),
  ('Mohammed Siraj', true)
ON CONFLICT (name) DO NOTHING;

-- --------------------------------------------------
-- Security: Row Level Security (RLS) Configuration
-- --------------------------------------------------

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.players FROM anon;
REVOKE ALL ON public.payments FROM anon;

GRANT SELECT ON public.players TO anon, authenticated;
GRANT SELECT ON public.payments TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payments TO authenticated;

DROP POLICY IF EXISTS players_read_public ON public.players;
CREATE POLICY players_read_public ON public.players FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS payments_read_public ON public.payments;
CREATE POLICY payments_read_public ON public.payments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS players_write_authenticated ON public.players;
CREATE POLICY players_write_authenticated ON public.players FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS payments_write_authenticated ON public.payments;
CREATE POLICY payments_write_authenticated ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
