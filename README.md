# 172project

## Instructions:

1. Verify Node and NPM installations:
    - `node -v`
    - `npm -v`

3. Have a suitable database created in mySQL (template below)

```-- Users table to store user information
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_host BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

-- Spaces table to store information about available spaces
CREATE TABLE Spaces (
    space_id SERIAL PRIMARY KEY,
    host_id INTEGER REFERENCES Users(user_id),
    space_name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_host
        FOREIGN KEY (host_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

-- Operating Hours table to store space availability
CREATE TABLE OperatingHours (
    operating_hours_id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES Spaces(space_id),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_space
        FOREIGN KEY (space_id)
        REFERENCES Spaces(space_id)
        ON DELETE CASCADE,
    UNIQUE(space_id, day_of_week)
);

-- Reservations table to store bookings
CREATE TABLE Reservations (
    reservation_id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES Spaces(space_id),
    user_id INTEGER REFERENCES Users(user_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES Users(user_id),
    last_modified_by INTEGER REFERENCES Users(user_id),
    CONSTRAINT fk_space
        FOREIGN KEY (space_id)
        REFERENCES Spaces(space_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

-- Space Rules table to store booking rules and constraints
CREATE TABLE SpaceRules (
    rule_id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES Spaces(space_id),
    min_duration_minutes INTEGER NOT NULL,
    max_duration_minutes INTEGER NOT NULL,
    max_advance_days INTEGER NOT NULL,
    min_notice_hours INTEGER NOT NULL,
    modification_deadline_hours INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_space
        FOREIGN KEY (space_id)
        REFERENCES Spaces(space_id)
        ON DELETE CASCADE,
    CONSTRAINT valid_duration 
        CHECK (min_duration_minutes < max_duration_minutes),
    CONSTRAINT valid_notice 
        CHECK (min_notice_hours >= 0)
);

-- Create indexes for common queries (this is optional)
CREATE INDEX idx_reservations_space_time 
ON Reservations(space_id, start_time, end_time);

CREATE INDEX idx_reservations_user 
ON Reservations(user_id);

CREATE INDEX idx_spaces_host 
ON Spaces(host_id);
```

4. Clone repository
5. install required packages:
   -  `npm install express mysql2 dotenv body-parser`

6. add .env file: `.env`
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=<your mySQL password>
   DB_NAME=<your db name>
   ```
7. Start project with `node app.js`
