-- Users table to store user information
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_host BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spaces table to store information about available spaces
CREATE TABLE Spaces (
    space_id SERIAL PRIMARY KEY,
    host_id BIGINT UNSIGNED,
    space_name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER,
    is_approved BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_spaces_host
        FOREIGN KEY (host_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

-- Operating Hours table to store space availability
CREATE TABLE OperatingHours (
    operating_hours_id SERIAL PRIMARY KEY,
    space_id BIGINT UNSIGNED,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT 0,
    CONSTRAINT fk_operatinghours_space
        FOREIGN KEY (space_id)
        REFERENCES Spaces(space_id)
        ON DELETE CASCADE,
    UNIQUE(space_id, day_of_week)
);

-- Reservations table to store bookings
CREATE TABLE Reservations (
    reservation_id SERIAL PRIMARY KEY,
    space_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT UNSIGNED,
    last_modified_by BIGINT UNSIGNED,
    CONSTRAINT fk_reservations_space
        FOREIGN KEY (space_id)
        REFERENCES Spaces(space_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reservations_user
        FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reservations_created_by
        FOREIGN KEY (created_by)
        REFERENCES Users(user_id),
    CONSTRAINT fk_reservations_last_modified_by
        FOREIGN KEY (last_modified_by)
        REFERENCES Users(user_id)
);

-- Space Rules table to store booking rules and constraints
CREATE TABLE SpaceRules (
    rule_id SERIAL PRIMARY KEY,
    space_id BIGINT UNSIGNED,
    min_duration_minutes INTEGER NOT NULL,
    max_duration_minutes INTEGER NOT NULL,
    max_advance_days INTEGER NOT NULL,
    min_notice_hours INTEGER NOT NULL,
    modification_deadline_hours INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_spacerules_space
        FOREIGN KEY (space_id)
        REFERENCES Spaces(space_id)
        ON DELETE CASCADE,
    CONSTRAINT valid_duration
        CHECK (min_duration_minutes < max_duration_minutes),
    CONSTRAINT valid_notice
        CHECK (min_notice_hours >= 0)
);

-- Create indexes for common queries (optional but recommended)
CREATE INDEX idx_reservations_space_time
ON Reservations(space_id, start_time, end_time);

CREATE INDEX idx_reservations_user
ON Reservations(user_id);

CREATE INDEX idx_spaces_host
ON Spaces(host_id);

CREATE INDEX idx_reservations_space_time_status
ON Reservations(space_id, start_time, end_time, status);
