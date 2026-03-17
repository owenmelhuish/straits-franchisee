-- Add Meta Ads integration columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
  ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_page_id TEXT;

-- Add Meta Ads tracking columns to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS meta_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_status TEXT;
