-- Safe schema updates for the male consultation questionnaire.
-- Run this in Supabase SQL editor before deploying frontend changes.

create table if not exists public.consultations (
  client_id uuid primary key references public.clients(id) on delete cascade,
  identity_lifestyle jsonb,
  body_architecture jsonb,
  body_fit_architecture jsonb,
  face_grooming jsonb,
  color_intelligence jsonb,
  personal_style jsonb,
  wardrobe_audit jsonb,
  transformation_goals jsonb,
  stylist_notes text,
  generate_blueprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consultations add column if not exists identity_lifestyle jsonb;
alter table public.consultations add column if not exists body_architecture jsonb;
alter table public.consultations add column if not exists body_fit_architecture jsonb;
alter table public.consultations add column if not exists face_grooming jsonb;
alter table public.consultations add column if not exists color_intelligence jsonb;
alter table public.consultations add column if not exists personal_style jsonb;
alter table public.consultations add column if not exists wardrobe_audit jsonb;
alter table public.consultations add column if not exists transformation_goals jsonb;
alter table public.consultations add column if not exists stylist_notes text;
alter table public.consultations add column if not exists generate_blueprint text;
alter table public.consultations add column if not exists created_at timestamptz not null default now();
alter table public.consultations add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_consultations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_consultations_updated_at on public.consultations;
create trigger trg_consultations_updated_at
before update on public.consultations
for each row execute function public.set_consultations_updated_at();
