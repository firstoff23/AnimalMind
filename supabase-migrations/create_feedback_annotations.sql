CREATE TABLE IF NOT EXISTS public.feedback_annotations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_type VARCHAR(10) NOT NULL CHECK (animal_type IN ('dog', 'cat')),
  predicted_breed VARCHAR(100),
  confirmed_breed VARCHAR(100),
  predicted_state VARCHAR(50),
  confirmed_state VARCHAR(50),
  confidence FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
