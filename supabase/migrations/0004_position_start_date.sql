-- Replace the free-text time_in_position field with a proper date column.
-- The existing text values ("2 years", "6 months", etc.) can't be parsed
-- reliably, so we drop the old column and add the new one nullable.

alter table public.profiles
  add column if not exists position_start_date date;

alter table public.profiles
  drop column if exists time_in_position;
