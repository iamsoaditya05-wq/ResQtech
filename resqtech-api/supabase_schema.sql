-- ============================================================
-- ResQtech — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- Region: ap-south-1 (Mumbai)
-- ============================================================

-- Enable PostGIS for geolocation queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT UNIQUE NOT NULL,
  role         TEXT NOT NULL DEFAULT 'patient'
                 CHECK (role IN ('patient', 'responder', 'admin')),
  is_trained   BOOLEAN DEFAULT false,
  vehicle_type TEXT CHECK (vehicle_type IN ('bike', 'car', 'auto', null)),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── hospitals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name             TEXT NOT NULL,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  location         GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_MakePoint(lng, lat)) STORED,
  beds_available   INT NOT NULL DEFAULT 0,
  total_beds       INT NOT NULL DEFAULT 0,
  specializations  TEXT[] DEFAULT '{}',
  phone            TEXT,
  district         TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── emergencies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergencies (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  patient_name   TEXT,
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  location       GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_MakePoint(lng, lat)) STORED,
  village        TEXT,
  type           TEXT DEFAULT 'general'
                   CHECK (type IN ('cardiac', 'accident', 'delivery', 'general')),
  status         TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending', 'matched', 'en_route', 'done', 'cancelled')),
  severity       INT DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  responder_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  responder_name TEXT,
  eta_minutes    INT,
  source         TEXT DEFAULT 'app' CHECK (source IN ('app', 'sms', 'web')),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── responders_live ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS responders_live (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  vehicle_type TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  location     GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
                 CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
                 THEN ST_MakePoint(lng, lat) ELSE NULL END
               ) STORED,
  is_available BOOLEAN DEFAULT false,
  last_seen    TIMESTAMPTZ DEFAULT now()
);

-- ── rides ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  emergency_id   UUID REFERENCES emergencies(id) ON DELETE SET NULL,
  responder_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  responder_name TEXT,
  village        TEXT,
  distance_km    DOUBLE PRECISION DEFAULT 0,
  base_rate      INT DEFAULT 50,
  distance_bonus INT DEFAULT 0,
  total_inr      INT DEFAULT 50,
  status         TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  pickup_time    TIMESTAMPTZ DEFAULT now(),
  drop_time      TIMESTAMPTZ
);

-- ── relay_segments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_segments (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ride_id        UUID REFERENCES rides(id) ON DELETE SET NULL,
  emergency_id   UUID REFERENCES emergencies(id) ON DELETE CASCADE,
  segment_num    INT NOT NULL,
  responder_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  responder_name TEXT,
  vehicle_type   TEXT,
  from_village   TEXT,
  to_village     TEXT,
  from_lat       DOUBLE PRECISION,
  from_lng       DOUBLE PRECISION,
  to_lat         DOUBLE PRECISION,
  to_lng         DOUBLE PRECISION,
  distance_km    DOUBLE PRECISION,
  status         TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  handoff_time   TIMESTAMPTZ
);

-- ── triage_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS triage_logs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  emergency_id    UUID REFERENCES emergencies(id) ON DELETE CASCADE,
  ai_severity     INT CHECK (ai_severity BETWEEN 1 AND 5),
  first_aid_steps TEXT[] DEFAULT '{}',
  hospital_dept   TEXT,
  hindi_message   TEXT,
  vitals_json     JSONB DEFAULT '{}',
  doctor_notes    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── training_modules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_modules (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  language      TEXT DEFAULT 'hi' CHECK (language IN ('hi', 'mr', 'en')),
  duration_mins INT DEFAULT 10,
  is_required   BOOLEAN DEFAULT false,
  "order"       INT DEFAULT 0,
  video_url     TEXT,
  quiz_json     JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── training_completions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_completions (
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  module_id    UUID REFERENCES training_modules(id) ON DELETE CASCADE,
  quiz_score   INT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  type     TEXT DEFAULT 'system',
  message  TEXT NOT NULL,
  payload  JSONB DEFAULT '{}',
  channel  TEXT DEFAULT 'push' CHECK (channel IN ('push', 'sms', 'email')),
  sent_at  TIMESTAMPTZ DEFAULT now(),
  read     BOOLEAN DEFAULT false
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_emergencies_status     ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_emergencies_created_at ON emergencies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergencies_location   ON emergencies USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_responders_available   ON responders_live(is_available);
CREATE INDEX IF NOT EXISTS idx_responders_location    ON responders_live USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_rides_responder        ON rides(responder_id);
CREATE INDEX IF NOT EXISTS idx_rides_status           ON rides(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_triage_emergency       ON triage_logs(emergency_id);

-- ============================================================
-- CORE FUNCTION: find_nearest_responders (PostGIS)
-- ============================================================
CREATE OR REPLACE FUNCTION find_nearest_responders(
  lat        FLOAT,
  lng        FLOAT,
  radius_km  INT DEFAULT 15,
  lim        INT DEFAULT 5
)
RETURNS TABLE (
  user_id      UUID,
  name         TEXT,
  vehicle_type TEXT,
  distance_km  FLOAT,
  is_available BOOLEAN,
  rlat         DOUBLE PRECISION,
  rlng         DOUBLE PRECISION
) AS $$
  SELECT
    rl.user_id,
    rl.name,
    rl.vehicle_type,
    ST_DistanceSphere(rl.location, ST_MakePoint(lng, lat)) / 1000 AS distance_km,
    rl.is_available,
    rl.lat  AS rlat,
    rl.lng  AS rlng
  FROM responders_live rl
  WHERE
    rl.is_available = true
    AND rl.location IS NOT NULL
    AND ST_DWithin(
      rl.location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT lim;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- REALTIME: enable for live dashboard updates
-- ============================================================
ALTER TABLE emergencies    REPLICA IDENTITY FULL;
ALTER TABLE responders_live REPLICA IDENTITY FULL;
ALTER TABLE notifications  REPLICA IDENTITY FULL;
ALTER TABLE hospitals      REPLICA IDENTITY FULL;

-- Add tables to Supabase realtime publication
-- (Run in Supabase Dashboard → Database → Replication)
-- ALTER PUBLICATION supabase_realtime ADD TABLE emergencies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE responders_live;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- ROW LEVEL SECURITY (enable for production)
-- ============================================================
-- ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE emergencies     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE responders_live ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rides           ENABLE ROW LEVEL SECURITY;
--
-- Example policy: responders can only see their own notifications
-- CREATE POLICY "own_notifications" ON notifications
--   FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- SEED DATA (optional — mirrors mockData.js for testing)
-- ============================================================
-- INSERT INTO hospitals (name, lat, lng, beds_available, total_beds, specializations, phone, district) VALUES
--   ('Shirur Rural Hospital',       18.8300, 74.3750, 12, 30, ARRAY['general','trauma'],                       '+912137222111', 'Pune'),
--   ('Daund Primary Health Centre', 18.4650, 74.5900,  4, 15, ARRAY['general','maternity'],                    '+912117222222', 'Pune'),
--   ('Baramati District Hospital',  18.1600, 74.5900, 28, 80, ARRAY['cardiac','trauma','maternity','general'], '+912112222333', 'Pune'),
--   ('Indapur Community Hospital',  18.1200, 75.0250,  6, 20, ARRAY['general'],                                '+912111222444', 'Pune'),
--   ('Junnar Sub-District Hospital',19.2100, 73.8900, 18, 40, ARRAY['general','trauma'],                       '+912132222555', 'Pune');
