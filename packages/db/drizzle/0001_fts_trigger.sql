-- Keep jobs.search_vector in sync. Weighted: title + company name (A), department (B), description (C).
-- 'simple' config so tech terms (golang, k8s, react.js) are not stemmed away.
CREATE OR REPLACE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
DECLARE
  company_name text;
BEGIN
  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(company_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.department, '')), 'B') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.description_text, ''), 20000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER jobs_search_vector_trg
  BEFORE INSERT OR UPDATE OF title, department, description_text, company_id ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();
