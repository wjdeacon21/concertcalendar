-- ============================================================
-- 2.4 Seed NYC city record
-- ============================================================
INSERT INTO cities (name, timezone)
VALUES ('New York City', 'America/New_York')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 2.5 Enable Row-Level Security + policies
-- ============================================================

ALTER TABLE cities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_artists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE concerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_concert_matches ENABLE ROW LEVEL SECURITY;

-- cities: any authenticated user can read
CREATE POLICY "cities_read" ON cities
  FOR SELECT TO authenticated USING (true);

-- profiles: users can read/update only their own row
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- artists: any authenticated user can read; only service role can insert
CREATE POLICY "artists_read" ON artists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "artists_insert_service" ON artists
  FOR INSERT TO service_role WITH CHECK (true);

-- user_artists: users manage only their own rows
CREATE POLICY "user_artists_select_own" ON user_artists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_artists_insert_own" ON user_artists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_artists_delete_own" ON user_artists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- concerts: any authenticated user can read; only service role can write
CREATE POLICY "concerts_read" ON concerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "concerts_insert_service" ON concerts
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "concerts_update_service" ON concerts
  FOR UPDATE TO service_role USING (true);

-- user_concert_matches: users read own; service role inserts
CREATE POLICY "matches_select_own" ON user_concert_matches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "matches_insert_service" ON user_concert_matches
  FOR INSERT TO service_role WITH CHECK (true);


-- ============================================================
-- 2.6 Auto-create profile on signup trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nyc_id uuid;
BEGIN
  SELECT id INTO nyc_id FROM cities WHERE name = 'New York City' LIMIT 1;

  INSERT INTO public.profiles (id, email, city_id, digest_preference)
  VALUES (
    NEW.id,
    NEW.email,
    nyc_id,
    'weekly'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
