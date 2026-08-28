-- Reduce authenticated access on public.troops to the CRUD operations used by the app.
-- RLS continues to enforce row ownership/visibility.
revoke truncate, references, trigger on table public.troops from authenticated;
