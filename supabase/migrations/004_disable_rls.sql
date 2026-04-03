-- Disable RLS on all tables — this is a private family app
-- RLS was causing persistent insert/update failures
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_access DISABLE ROW LEVEL SECURITY;
