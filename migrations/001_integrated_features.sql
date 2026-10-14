-- ============================================================
-- Migration 001: Integrated Features
-- Schema additions for farmer_locations, farmer_crops, crop_activities, ai_conversations, ai_messages
-- ============================================================

USE crop_advisory;

-- 1. FARMER_LOCATIONS — structured, verified farmer location storage
CREATE TABLE IF NOT EXISTS farmer_locations (
    location_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id     BIGINT UNSIGNED NOT NULL,
    latitude      DECIMAL(9,6),
    longitude     DECIMAL(9,6),
    accuracy      DECIMAL(10,2),
    pincode       VARCHAR(10),
    city          VARCHAR(100),
    district      VARCHAR(100),
    state         VARCHAR(100),
    country       VARCHAR(100) NOT NULL DEFAULT 'India',
    source        ENUM('gps','pincode') NOT NULL DEFAULT 'pincode',
    is_verified   BOOLEAN NOT NULL DEFAULT TRUE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_floc_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    INDEX idx_floc_farmer_active (farmer_id, is_active)
) ENGINE=InnoDB;

-- 2. FARMER_CROPS — normalized crops managed by farmers
CREATE TABLE IF NOT EXISTS farmer_crops (
    farmer_crop_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id             BIGINT UNSIGNED NOT NULL,
    crop_id               INT UNSIGNED,
    crop_name             VARCHAR(100) NOT NULL,
    variety               VARCHAR(100),
    area                  DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    sowing_date           DATE,
    expected_harvest_date DATE,
    current_stage         ENUM('sowing','vegetative','flowering','fruiting','harvesting','post_harvest') NOT NULL DEFAULT 'vegetative',
    status                ENUM('active','harvested','archived') NOT NULL DEFAULT 'active',
    notes                 TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_fcrop_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    CONSTRAINT fk_fcrop_ref_crop FOREIGN KEY (crop_id) REFERENCES crops(crop_id) ON DELETE SET NULL,
    INDEX idx_fcrop_farmer_status (farmer_id, status)
) ENGINE=InnoDB;

-- 3. CROP_ACTIVITIES — daily farm timeline activities
CREATE TABLE IF NOT EXISTS crop_activities (
    activity_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id       BIGINT UNSIGNED NOT NULL,
    farmer_crop_id  BIGINT UNSIGNED,
    activity_type   ENUM('sowing','irrigation','fertilizer','pesticide','weeding','pest_observation','disease_observation','rainfall','harvesting','inspection','custom') NOT NULL,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    activity_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata        JSON,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cact_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    CONSTRAINT fk_cact_farmer_crop FOREIGN KEY (farmer_crop_id) REFERENCES farmer_crops(farmer_crop_id) ON DELETE CASCADE,
    INDEX idx_cact_farmer_date (farmer_id, activity_date)
) ENGINE=InnoDB;

-- 4. AI_CONVERSATIONS — persisted AI chat threads
CREATE TABLE IF NOT EXISTS ai_conversations (
    conversation_id VARCHAR(64) PRIMARY KEY,
    farmer_id       BIGINT UNSIGNED NOT NULL,
    title           VARCHAR(150) NOT NULL DEFAULT 'Crop Advisory Chat',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_aiconv_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    INDEX idx_aiconv_farmer (farmer_id)
) ENGINE=InnoDB;

-- 5. AI_MESSAGES — individual chat messages in AI conversations
CREATE TABLE IF NOT EXISTS ai_messages (
    message_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL,
    farmer_id       BIGINT UNSIGNED NOT NULL,
    role            ENUM('user','assistant','system') NOT NULL,
    message         TEXT NOT NULL,
    metadata        JSON,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_aimsg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(conversation_id) ON DELETE CASCADE,
    CONSTRAINT fk_aimsg_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    INDEX idx_aimsg_conv_created (conversation_id, created_at)
) ENGINE=InnoDB;

-- 6. AUDIT_LOGS — audit trail for user and officer actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED,
    action     VARCHAR(100) NOT NULL,
    entity     VARCHAR(100) NOT NULL,
    entity_id  BIGINT UNSIGNED,
    meta       JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
