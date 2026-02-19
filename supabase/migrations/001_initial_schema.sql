-- ============================================================
-- Concert Calendar — Initial Schema
-- ============================================================

-- ── cities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL UNIQUE,
  timezone  text NOT NULL
);

-- ── profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text,
  city_id           uuid REFERENCES cities(id),
  digest_preference text NOT NULL DEFAULT 'weekly'
    CHECK (digest_preference IN ('daily', 'weekly', 'none')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── artists ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artists (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE  -- stored lowercase
);

-- ── user_artists ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_artists (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artist_id  uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, artist_id)
);

-- ── concerts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name  text NOT NULL,  -- lowercase, trimmed
  venue        text,
  city_id      uuid REFERENCES cities(id),
  date         date NOT NULL,
  ticket_url   text,
  source_id    text UNIQUE,    -- for upsert deduplication
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── user_concert_matches ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_concert_matches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concert_id  uuid NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, concert_id)
);
