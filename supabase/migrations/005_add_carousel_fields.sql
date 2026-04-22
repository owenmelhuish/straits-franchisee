-- Carousel support: store all slide PNGs for carousel submissions.
-- `file_url` stays as the cover (first slide) for backward compatibility with
-- existing readers (dashboards, download buttons, etc.). `slide_file_urls` is
-- the full ordered list; null means a legacy single-image submission.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS slide_file_urls JSONB;
