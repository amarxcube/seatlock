-- manual: case-insensitive text for emails (docs/database.md §1)
CREATE EXTENSION IF NOT EXISTS citext;

-- manual: shared trigger function that keeps updated_at current on mutable tables
-- (docs/database.md §1). Tables attach it with:
--   CREATE TRIGGER <table>_set_updated_at BEFORE UPDATE ON <table>
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
