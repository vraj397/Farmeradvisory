-- ============================================================
-- Krishi Sahayak Platform — Supabase (PostgreSQL) Schema
-- ============================================================

-- SECTION A — Core identity & lookup tables

-- 1. FARMERS — core identity, phone-OTP based auth
CREATE TABLE IF NOT EXISTS farmers (
    farmer_id           BIGSERIAL PRIMARY KEY,
    phone_number        VARCHAR(15) NOT NULL UNIQUE,
    name                VARCHAR(100),
    preferred_language  VARCHAR(20) NOT NULL DEFAULT 'en',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. DISTRICTS — shared by profiles, weather cache, schemes, yield refs
CREATE TABLE IF NOT EXISTS districts (
    district_id    SERIAL PRIMARY KEY,
    district_name  VARCHAR(100) NOT NULL,
    state_name     VARCHAR(100) NOT NULL,
    CONSTRAINT uq_district_state UNIQUE (district_name, state_name)
);

-- 3. CROPS — lookup table (normalized)
CREATE TABLE IF NOT EXISTS crops (
    crop_id       SERIAL PRIMARY KEY,
    crop_name     VARCHAR(100) NOT NULL UNIQUE,
    crop_category VARCHAR(50) NOT NULL DEFAULT 'other'
);

-- 4. PESTS — normalized pest/disease catalogue
CREATE TABLE IF NOT EXISTS pests (
    pest_id         SERIAL PRIMARY KEY,
    pest_name       VARCHAR(150) NOT NULL,
    crop_id         INT REFERENCES crops(crop_id) ON DELETE SET NULL,
    category        VARCHAR(50) NOT NULL DEFAULT 'pest',
    standard_remedy TEXT
);
CREATE INDEX IF NOT EXISTS idx_pest_crop ON pests(crop_id);

-- SECTION B — Farmer setup

-- 5. FARM_PROFILES — a farmer can have multiple plots
CREATE TABLE IF NOT EXISTS farm_profiles (
    profile_id    BIGSERIAL PRIMARY KEY,
    farmer_id     BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    district_id   INT NOT NULL REFERENCES districts(district_id),
    latitude      DECIMAL(9,6),
    longitude     DECIMAL(9,6),
    land_size     DECIMAL(10,2) NOT NULL,
    land_unit     VARCHAR(20) NOT NULL DEFAULT 'acre',
    crop_id       INT NOT NULL REFERENCES crops(crop_id),
    water_source  VARCHAR(50) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_profile_farmer ON farm_profiles(farmer_id);
CREATE INDEX IF NOT EXISTS idx_profile_district ON farm_profiles(district_id);

-- SECTION C — Officers / Admin

-- 6. OFFICERS — field officers and platform admins
CREATE TABLE IF NOT EXISTS officers (
    officer_id     SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    phone_number   VARCHAR(15) NOT NULL UNIQUE,
    email          VARCHAR(150) UNIQUE,
    password_hash  VARCHAR(255),
    role           VARCHAR(50) NOT NULL DEFAULT 'field_officer',
    district_id    INT REFERENCES districts(district_id),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_officer_district ON officers(district_id);
CREATE INDEX IF NOT EXISTS idx_officer_role ON officers(role);

-- SECTION D — Advisory core

-- 7. ADVISORY_QUERIES — pest/disease + weather + general queries
CREATE TABLE IF NOT EXISTS advisory_queries (
    query_id          BIGSERIAL PRIMARY KEY,
    farmer_id         BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    profile_id        BIGINT REFERENCES farm_profiles(profile_id) ON DELETE SET NULL,
    district_id       INT REFERENCES districts(district_id),
    query_type        VARCHAR(50) NOT NULL,
    input_mode        VARCHAR(20) NOT NULL DEFAULT 'photo',
    photo_url         VARCHAR(255),
    audio_url         VARCHAR(255),
    ai_response       TEXT,
    ai_confidence     DECIMAL(5,2),
    detected_pest_id  INT REFERENCES pests(pest_id) ON DELETE SET NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_query_farmer ON advisory_queries(farmer_id);
CREATE INDEX IF NOT EXISTS idx_query_status ON advisory_queries(status);

-- 8. ESCALATIONS — human-in-the-loop fallback
CREATE TABLE IF NOT EXISTS escalations (
    escalation_id     BIGSERIAL PRIMARY KEY,
    query_id          BIGINT NOT NULL UNIQUE REFERENCES advisory_queries(query_id) ON DELETE CASCADE,
    officer_id        INT REFERENCES officers(officer_id) ON DELETE SET NULL,
    officer_response  TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    escalated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    first_response_at TIMESTAMPTZ,
    resolved_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_escalation_officer_status ON escalations(officer_id, status);

-- 9. WEATHER_CACHE — one row per district per day
CREATE TABLE IF NOT EXISTS weather_cache (
    cache_id        BIGSERIAL PRIMARY KEY,
    district_id     INT NOT NULL REFERENCES districts(district_id),
    weather_date    DATE NOT NULL,
    temperature_c   DECIMAL(5,2),
    humidity_pct    DECIMAL(5,2),
    rainfall_mm     DECIMAL(6,2),
    wind_speed_kmh  DECIMAL(5,2),
    raw_data        JSONB,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_weather_district_date UNIQUE (district_id, weather_date)
);

-- 10. REPORTS — generated PDF advisories
CREATE TABLE IF NOT EXISTS reports (
    report_id          BIGSERIAL PRIMARY KEY,
    farmer_id          BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    query_id           BIGINT REFERENCES advisory_queries(query_id) ON DELETE SET NULL,
    pdf_url            VARCHAR(255) NOT NULL,
    sent_via_whatsapp  BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_farmer ON reports(farmer_id);

-- SECTION E — Engagement (notifications, devices, broadcasts)

-- 11. DEVICE_TOKENS
CREATE TABLE IF NOT EXISTS device_tokens (
    token_id      BIGSERIAL PRIMARY KEY,
    farmer_id     BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    device_token  VARCHAR(255) NOT NULL UNIQUE,
    platform      VARCHAR(20) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_token_farmer ON device_tokens(farmer_id);

-- 12. BROADCASTS
CREATE TABLE IF NOT EXISTS broadcasts (
    broadcast_id  BIGSERIAL PRIMARY KEY,
    officer_id    INT NOT NULL REFERENCES officers(officer_id),
    district_id   INT NOT NULL REFERENCES districts(district_id),
    crop_id       INT REFERENCES crops(crop_id),
    title         VARCHAR(150) NOT NULL,
    message       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_broadcast_district ON broadcasts(district_id);

-- 13. OUTBREAK_ALERTS
CREATE TABLE IF NOT EXISTS outbreak_alerts (
    alert_id          BIGSERIAL PRIMARY KEY,
    district_id       INT NOT NULL REFERENCES districts(district_id),
    pest_id           INT NOT NULL REFERENCES pests(pest_id),
    query_count       INT NOT NULL,
    threshold_used    INT NOT NULL,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status            VARCHAR(20) NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_outbreak_lookup ON outbreak_alerts(district_id, pest_id, status);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    notification_id      BIGSERIAL PRIMARY KEY,
    farmer_id            BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    channel              VARCHAR(20) NOT NULL,
    notification_type    VARCHAR(50) NOT NULL,
    title                VARCHAR(150) NOT NULL,
    message              TEXT NOT NULL,
    related_query_id     BIGINT REFERENCES advisory_queries(query_id) ON DELETE SET NULL,
    related_broadcast_id BIGINT REFERENCES broadcasts(broadcast_id) ON DELETE SET NULL,
    related_outbreak_id  BIGINT REFERENCES outbreak_alerts(alert_id) ON DELETE SET NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'sent',
    sent_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at              TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notif_farmer_status ON notifications(farmer_id, status);

-- SECTION F — Intelligence layer (schemes, guidelines, yield)

-- 15. SCHEMES
CREATE TABLE IF NOT EXISTS schemes (
    scheme_id     SERIAL PRIMARY KEY,
    scheme_name   VARCHAR(150) NOT NULL,
    description   TEXT,
    state_name    VARCHAR(100),
    crop_id       INT REFERENCES crops(crop_id) ON DELETE SET NULL,
    apply_link    VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scheme_state ON schemes(state_name);

-- 16. FERTILIZER_GUIDELINES
CREATE TABLE IF NOT EXISTS fertilizer_guidelines (
    guideline_id     SERIAL PRIMARY KEY,
    crop_id          INT NOT NULL REFERENCES crops(crop_id) ON DELETE CASCADE,
    land_unit        VARCHAR(20) NOT NULL DEFAULT 'acre',
    fertilizer_name  VARCHAR(100) NOT NULL,
    dosage_per_unit  DECIMAL(8,2) NOT NULL,
    dosage_unit      VARCHAR(20) NOT NULL DEFAULT 'kg',
    growth_stage     VARCHAR(50),
    notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_fertilizer_crop ON fertilizer_guidelines(crop_id);

-- 17. YIELD_REFERENCES
CREATE TABLE IF NOT EXISTS yield_references (
    reference_id       SERIAL PRIMARY KEY,
    crop_id            INT NOT NULL REFERENCES crops(crop_id) ON DELETE CASCADE,
    district_id        INT NOT NULL REFERENCES districts(district_id) ON DELETE CASCADE,
    season             VARCHAR(20) NOT NULL,
    avg_yield_per_unit DECIMAL(10,2) NOT NULL,
    yield_unit         VARCHAR(20) NOT NULL DEFAULT 'quintal/acre',
    avg_market_price   DECIMAL(10,2),
    reference_year     INT NOT NULL,
    CONSTRAINT uq_yield_lookup UNIQUE (crop_id, district_id, season, reference_year)
);

-- 18. FEEDBACK
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id     BIGSERIAL PRIMARY KEY,
    farmer_id       BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    query_id        BIGINT REFERENCES advisory_queries(query_id) ON DELETE CASCADE,
    escalation_id   BIGINT REFERENCES escalations(escalation_id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL,
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feedback_farmer ON feedback(farmer_id);

-- SECTION G — Integrated Features (location, crops, activities, AI chat, audit)

-- 19. FARMER_LOCATIONS
CREATE TABLE IF NOT EXISTS farmer_locations (
    location_id   BIGSERIAL PRIMARY KEY,
    farmer_id     BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    latitude      DECIMAL(9,6),
    longitude     DECIMAL(9,6),
    accuracy      DECIMAL(10,2),
    pincode       VARCHAR(10),
    city          VARCHAR(100),
    district      VARCHAR(100),
    state         VARCHAR(100),
    country       VARCHAR(100) NOT NULL DEFAULT 'India',
    source        VARCHAR(20) NOT NULL DEFAULT 'pincode',
    is_verified   BOOLEAN NOT NULL DEFAULT TRUE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_floc_farmer_active ON farmer_locations(farmer_id, is_active);

-- 20. FARMER_CROPS
CREATE TABLE IF NOT EXISTS farmer_crops (
    farmer_crop_id        BIGSERIAL PRIMARY KEY,
    farmer_id             BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    crop_id               INT REFERENCES crops(crop_id) ON DELETE SET NULL,
    crop_name             VARCHAR(100) NOT NULL,
    variety               VARCHAR(100),
    area                  DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    sowing_date           DATE,
    expected_harvest_date DATE,
    current_stage         VARCHAR(30) NOT NULL DEFAULT 'vegetative',
    status                VARCHAR(20) NOT NULL DEFAULT 'active',
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fcrop_farmer_status ON farmer_crops(farmer_id, status);

-- 21. CROP_ACTIVITIES
CREATE TABLE IF NOT EXISTS crop_activities (
    activity_id     BIGSERIAL PRIMARY KEY,
    farmer_id       BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    farmer_crop_id  BIGINT REFERENCES farmer_crops(farmer_crop_id) ON DELETE CASCADE,
    activity_type   VARCHAR(50) NOT NULL,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    activity_date   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cact_farmer_date ON crop_activities(farmer_id, activity_date);

-- 22. AI_CONVERSATIONS
CREATE TABLE IF NOT EXISTS ai_conversations (
    conversation_id VARCHAR(64) PRIMARY KEY,
    farmer_id       BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL DEFAULT 'Crop Advisory Chat',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_aiconv_farmer ON ai_conversations(farmer_id);

-- 23. AI_MESSAGES
CREATE TABLE IF NOT EXISTS ai_messages (
    message_id      BIGSERIAL PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES ai_conversations(conversation_id) ON DELETE CASCADE,
    farmer_id       BIGINT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    message         TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_aimsg_conv_created ON ai_messages(conversation_id, created_at);

-- 24. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT,
    action     VARCHAR(100) NOT NULL,
    entity     VARCHAR(100) NOT NULL,
    entity_id  BIGINT,
    meta       JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO districts (district_name, state_name) VALUES
    ('Ahmedabad', 'Gujarat'),
    ('Anand', 'Gujarat'),
    ('Rajkot', 'Gujarat'),
    ('Palakkad', 'Kerala')
ON CONFLICT (district_name, state_name) DO NOTHING;

INSERT INTO crops (crop_name, crop_category) VALUES
    ('Wheat', 'cereal'),
    ('Cotton', 'cash_crop'),
    ('Groundnut', 'oilseed'),
    ('Bajra', 'cereal'),
    ('Tomato', 'vegetable')
ON CONFLICT (crop_name) DO NOTHING;

INSERT INTO pests (pest_name, crop_id, category, standard_remedy) VALUES
    ('Pink Bollworm', 2, 'pest', 'Use pheromone traps; spray recommended insecticide at first sighting.'),
    ('Late Blight', 5, 'disease', 'Apply copper-based fungicide; avoid overhead irrigation.'),
    ('Aphid Infestation', NULL, 'pest', 'Spray neem oil solution; introduce ladybird beetles if severe.')
ON CONFLICT DO NOTHING;

INSERT INTO schemes (scheme_name, description, state_name, apply_link) VALUES
    ('Pradhan Mantri Fasal Bima Yojana (PMFBY)', 'Comprehensive crop insurance coverage against non-preventable natural risks.', NULL, 'https://pmfby.gov.in'),
    ('PM-Kisan Samman Nidhi', 'Direct income support of ₹6,000 per year in 3 equal installments to farmer families.', NULL, 'https://pmkisan.gov.in'),
    ('Subsidized Micro-Irrigation Scheme', 'Up to 70% subsidy for small and marginal farmers on drip & sprinkler irrigation.', 'Gujarat', 'https://pmksy.gov.in'),
    ('Kisan Credit Card (KCC) Scheme', 'Affordable credit up to ₹3 lakh at 4% concessional interest rate with timely repayment.', NULL, 'https://www.myscheme.gov.in/schemes/kcc')
ON CONFLICT DO NOTHING;
