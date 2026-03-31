-- ============================================================
-- Migration: Create ai_reports table for AI Blueprint generation
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Create the ai_reports table
CREATE TABLE IF NOT EXISTS ai_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  report text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own reports
CREATE POLICY "Users can view own ai_reports" ON ai_reports
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM consultations WHERE id = consultation_id
    )
  );

-- Create policy to allow the service role to insert/update reports
CREATE POLICY "Service role can manage ai_reports" ON ai_reports
  FOR ALL USING (true) WITH CHECK (true);
