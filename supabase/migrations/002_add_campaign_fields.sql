-- Add campaign metadata to submissions
alter table public.submissions
  add column if not exists campaign_start date,
  add column if not exists campaign_end date,
  add column if not exists budget numeric(10, 2);

-- Add indexes for common query patterns
create index if not exists idx_submissions_user_id on public.submissions(user_id);
create index if not exists idx_submissions_template_id on public.submissions(template_id);
create index if not exists idx_templates_slug on public.templates(slug);
create index if not exists idx_templates_status on public.templates(status);
