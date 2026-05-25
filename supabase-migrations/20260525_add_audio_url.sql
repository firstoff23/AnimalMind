ALTER TABLE IF EXISTS classification_events
ADD COLUMN IF NOT EXISTS audio_url TEXT;
