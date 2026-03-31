-- ============================================================
-- Migration: Add sections JSONB column + merge RPC
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add the sections JSONB column with empty-object default
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Backfill existing data from legacy JSONB columns into the new sections column.
--    identity & lifestyle both map from identity_lifestyle (best available).
--    bodyHarmony uses body_fit_architecture first, falls back to body_architecture.
UPDATE consultations
SET sections = jsonb_strip_nulls(jsonb_build_object(
  'identity',       COALESCE(identity_lifestyle, '{}'::jsonb),
  'lifestyle',      COALESCE(identity_lifestyle, '{}'::jsonb),
  'colorAnalysis',  COALESCE(color_intelligence, '{}'::jsonb),
  'bodyHarmony',    COALESCE(COALESCE(body_fit_architecture, body_architecture), '{}'::jsonb),
  'styleArchetype', COALESCE(personal_style, '{}'::jsonb),
  'wardrobeAudit',  COALESCE(wardrobe_audit, '{}'::jsonb),
  'styleGoals',     COALESCE(transformation_goals, '{}'::jsonb),
  'grooming',       COALESCE(face_grooming, '{}'::jsonb),
  'stylistNotes',   '{}'::jsonb
));

-- 3. RPC function for atomic section-level merge (used by frontend autosave).
--    Merges only one section key at a time instead of replacing the whole object.
CREATE OR REPLACE FUNCTION merge_consultation_section(
  p_consultation_id uuid,
  p_section_key text,
  p_section_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE consultations
  SET sections = COALESCE(sections, '{}'::jsonb)
                 || jsonb_build_object(p_section_key, p_section_data),
      updated_at = now()
  WHERE id = p_consultation_id;
END;
$$;
