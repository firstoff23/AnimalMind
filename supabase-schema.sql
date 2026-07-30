-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role VARCHAR(30) DEFAULT 'user' NOT NULL CHECK (role IN ('owner', 'user', 'vet', 'veterinarian', 'clinic_admin', 'admin')),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_signed_in TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create animals table
CREATE TABLE IF NOT EXISTS animals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(255),
  age INT,
  is_active BOOLEAN DEFAULT FALSE,
  date_of_birth DATE,
  sex VARCHAR(10) CHECK (sex IN ('male', 'female', 'unknown')),
  color TEXT,
  coat VARCHAR(10) CHECK (coat IN ('short', 'medium', 'long')),
  photo_url TEXT,
  microchip_number VARCHAR(15),
  height VARCHAR(50),
  tail VARCHAR(50),
  special_markings TEXT,
  baseline_data JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create classification_events table
CREATE TABLE IF NOT EXISTS classification_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  animal_id BIGINT NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  state VARCHAR(50) NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  emoji VARCHAR(10),
  model_used VARCHAR(50),
  cached BOOLEAN DEFAULT FALSE,
  feedback VARCHAR(50),
  audio_url TEXT,
  context_tags TEXT[] DEFAULT '{}'::text[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  alert_sensitivity VARCHAR(50) DEFAULT 'medium',
  share_diagnostic_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_animals_user_id ON animals(user_id);
CREATE INDEX idx_classification_events_user_id ON classification_events(user_id);
CREATE INDEX idx_classification_events_animal_id ON classification_events(animal_id);
CREATE INDEX idx_classification_events_created_at ON classification_events(created_at);
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- Create feedback_annotations table
CREATE TABLE IF NOT EXISTS feedback_annotations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  classification_event_id BIGINT NOT NULL REFERENCES classification_events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_state VARCHAR(50),
  comment TEXT,
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_feedback_per_user_event UNIQUE (classification_event_id, user_id)
);

-- Create indexes for feedback_annotations
CREATE INDEX idx_feedback_annotations_event_id ON feedback_annotations(classification_event_id);
CREATE INDEX idx_feedback_annotations_created_at ON feedback_annotations(created_at DESC);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  event_name VARCHAR(100) NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for analytics_events
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
