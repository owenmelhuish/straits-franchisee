-- Remove FK constraint on templates.created_by so dev inserts work
-- without needing a matching profiles/auth.users row.
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_created_by_fkey;
ALTER TABLE public.templates ALTER COLUMN created_by DROP NOT NULL;
