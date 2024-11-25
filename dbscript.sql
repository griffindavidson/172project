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
--    operating_hours_id SERIAL PRIMARY KEY, <-- No need since this is a weak entity
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
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'occupied')),
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
--    rule_id SERIAL PRIMARY KEY,  <-- will probably be Weak Entity
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

-- sample data to use for debugging and likely demonstrating

INSERT INTO Users (first_name, last_name, email, password_hash, is_host)
VALUES
('Alice', 'Smith', 'alice.smith@example.com', 'hashed_password1', TRUE),
('Bob', 'Johnson', 'bob.johnson@example.com', 'hashed_password2', FALSE),
('Charlie', 'Brown', 'charlie.brown@example.com', 'hashed_password3', TRUE);

INSERT INTO Spaces (host_id, space_name, description, capacity, is_approved)
VALUES
(1, 'Cozy Meeting Room', 'A small, comfortable room for meetings.', 10, TRUE),
(3, 'Large Conference Hall', 'Ideal for large gatherings and events.', 100, FALSE),
(1, 'Open Workspace', 'A shared workspace for teams.', 20, TRUE);

INSERT INTO OperatingHours (space_id, day_of_week, open_time, close_time, is_closed)
VALUES
(1, 0, '08:00:00', '18:00:00', FALSE),
(1, 6, '09:00:00', '15:00:00', FALSE),
(2, 1, '07:00:00', '19:00:00', FALSE),
(3, 2, '08:00:00', '17:00:00', FALSE);

INSERT INTO Reservations (space_id, user_id, start_time, end_time, status, created_by, last_modified_by)
VALUES
(1, 2, '2024-11-25 09:00:00', '2024-11-25 11:00:00', 'confirmed', 2, 2),
(3, 2, '2024-11-26 14:00:00', '2024-11-26 16:00:00', 'pending', 2, 2),
(1, 3, '2024-11-27 10:00:00', '2024-11-27 12:00:00', 'completed', 3, 3);

INSERT INTO SpaceRules (space_id, min_duration_minutes, max_duration_minutes, max_advance_days, min_notice_hours, modification_deadline_hours)
VALUES
(1, 30, 120, 30, 2, 24),
(2, 60, 240, 60, 4, 48),
(3, 15, 180, 14, 1, 12);

-- Space 1: "Cozy Meeting Room" - Standard business hours with shorter weekend hours
INSERT INTO OperatingHours (space_id, day_of_week, open_time, close_time, is_closed)
VALUES
-- Monday to Friday (0-4)
(1, 0, '08:00:00', '18:00:00', FALSE),  -- Monday
(1, 1, '08:00:00', '18:00:00', FALSE),  -- Tuesday
(1, 2, '08:00:00', '18:00:00', FALSE),  -- Wednesday
(1, 3, '08:00:00', '18:00:00', FALSE),  -- Thursday
(1, 4, '08:00:00', '18:00:00', FALSE),  -- Friday
(1, 5, '09:00:00', '15:00:00', FALSE),  -- Saturday
(1, 6, '09:00:00', '15:00:00', FALSE),  -- Sunday

-- Space 2: "Large Conference Hall" -
(2, 0, '07:00:00', '22:00:00', FALSE),  -- Monday
(2, 1, '07:00:00', '22:00:00', FALSE),  -- Tuesday
(2, 2, '07:00:00', '22:00:00', FALSE),  -- Wednesday
(2, 3, '07:00:00', '22:00:00', FALSE),  -- Thursday
(2, 4, '07:00:00', '23:00:00', FALSE),  -- Friday
(2, 5, '08:00:00', '23:00:00', FALSE),  -- Saturday
(2, 6, '09:00:00', '20:00:00', FALSE),  -- Sunday

-- Space 3: "Open Workspace" -
(3, 0, '07:00:00', '20:00:00', FALSE),  -- Monday
(3, 1, '07:00:00', '20:00:00', FALSE),  -- Tuesday
(3, 2, '07:00:00', '20:00:00', FALSE),  -- Wednesday
(3, 3, '07:00:00', '20:00:00', FALSE),  -- Thursday
(3, 4, '07:00:00', '20:00:00', FALSE),  -- Friday
(3, 5, '09:00:00', '17:00:00', FALSE),  -- Saturday
(3, 6, '09:00:00', '12:00:00', TRUE);   -- Sunday (Closed)