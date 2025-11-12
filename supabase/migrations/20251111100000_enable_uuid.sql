-- Enable UUID extension with proper schema
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    CREATE EXTENSION "uuid-ossp" WITH SCHEMA public;
  END IF;
END $$;

-- Grant usage on the extension
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
