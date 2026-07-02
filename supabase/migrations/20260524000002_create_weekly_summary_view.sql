-- Create weekly_animal_summary view
CREATE OR REPLACE VIEW weekly_animal_summary AS
SELECT
  animal_id,
  DATE_TRUNC('week', created_at) AS week_start,
  COUNT(*) AS total_vocalizations,
  AVG(confidence) AS avg_confidence,
  MODE() WITHIN GROUP (ORDER BY state) AS dominant_state
FROM
  classification_events
GROUP BY
  animal_id,
  DATE_TRUNC('week', created_at);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  animal_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status VARCHAR(20) NOT NULL,
  details TEXT
);

-- Enable RLS and policies on notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid()::text IN (
    SELECT open_id FROM users WHERE id = notification_logs.user_id
  ));
