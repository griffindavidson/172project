const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/db');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

// Middleware
app.use(session({
    secret: 'cmpe172soupersecret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// Login Page

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM Users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Store user info in session
        req.session.user = {
            id: user.user_id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            isHost: user.is_host
        };

        res.json({ message: 'Login successful' });
    });
});

// Signup route
app.post('/api/signup', async (req, res) => {
    const { firstName, lastName, email, password, isHost } = req.body;

    try {
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const query = `
            INSERT INTO Users (first_name, last_name, email, password_hash, is_host)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(query, [firstName, lastName, email, passwordHash, isHost], (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already exists' }); //<-- if we want we can use email as PK
                }
                return res.status(500).json({ error: err.message });
            }

            // Auto-login after signup
            req.session.user = {
                id: results.insertId,
                firstName,
                lastName,
                email,
                isHost
            };

            res.status(201).json({ message: 'User created successfully' });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Current session info
app.get('/api/user-session', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

// ======= User Routes =======

// USER INSERT METHOD
app.post('/api/Users', (req, res) => {
    const { first_name, last_name, email, password_hash, is_host } = req.body;
    const query = `
        INSERT INTO Users (first_name, last_name, email, password_hash, is_host)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.query(query, [first_name, last_name, email, password_hash, is_host], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({
                message: 'User created successfully',
                user_id: results.insertId
            });
        }
    });
});

// USER GET METHOD
app.get('/api/Users', (req, res) => {
    const query = `
        SELECT user_id, first_name, last_name, email, is_host, created_at
        FROM Users
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// USER DELETE METHOD
app.delete('/api/Users', (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).send("Missing ID Field");
    }

    // Ensure the logged-in user is not deleting their own account
    const loggedInUserId = req.session.user?.id; // Fetch from session
    if (parseInt(id, 10) === parseInt(loggedInUserId, 10)) {
        return res.status(403).send({ error: "You cannot delete your own account while logged in." });
    }

    const query = 'DELETE FROM Users WHERE user_id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.log("Database Error:", err);
            return res.status(500).send({ error: "Internal Server Error" });
        }

        if (results.affectedRows > 0) {
            res.status(200).send({ message: "User deleted successfully" });
        } else {
            res.status(404).send({ error: "User not found" });
        }
    });
});


// need to add a USER ALTER METHOD here

// ======= Space Routes =======

// SPACE INSERT METHOD
app.post('/api/spaces', (req, res) => {
    const { host_id, space_name, description, capacity } = req.body;
    const query = `
        INSERT INTO Spaces (host_id, space_name, description, capacity)
        VALUES (?, ?, ?, ?)
    `;
    db.query(query, [host_id, space_name, description, capacity], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({
                message: 'Space created successfully',
                space_id: results.insertId
            });
        }
    });
});

// SPACE GET METHOD
app.get('/api/spaces', (req, res) => {
    const query = `
        SELECT CONCAT(u.first_name, " ", u.last_name) as host, s.space_name, s.description, s.capacity, s.is_approved,
            s.created_at, s.modified_at
        FROM Spaces s
        JOIN Users u ON s.host_id = u.user_id
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// SPACE DELETE METHOD here

// SPACE ALTER METHOD here

// ======= Operating Hours Routes =======

// OPERATING HOURS INSERT METHOD
app.post('/api/operating-hours', (req, res) => {
    const { space_id, day_of_week, open_time, close_time, is_closed } = req.body;
    const query = `
        INSERT INTO OperatingHours (space_id, day_of_week, open_time, close_time, is_closed)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.query(query, [space_id, day_of_week, open_time, close_time, is_closed], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({
                message: 'Operating hours created successfully',
                operating_hours_id: results.insertId
            });
        }
    });
});

// OPERATING HOURS GET METHOD
app.get('/api/operating-hours', (req, res) => {
    const query = `
        SELECT o.operating_hours_id, s.space_name, o.day_of_week, o.open_time, o.close_time
        FROM OperatingHours o
        JOIN Spaces s ON s.space_id = o.space_id
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json( { error: err.message });
        } else {
            res.json(results);
        }
    });
});

// OPERATING HOURS DELETE METHOD

// OPERATING HOURS ALTER METHOD

// ======= Reservation Routes =======

// RESERVATIONS INSERT METHOD
app.post('/api/reservations', (req, res) => {
    const { space_id, user_id, start_time, end_time, created_by } = req.body;
    const query = `
        INSERT INTO Reservations
        (space_id, user_id, start_time, end_time, status, created_by, last_modified_by)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `;
    db.query(query, [space_id, user_id, start_time, end_time, created_by, created_by], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({
                message: 'Reservation created successfully',
                reservation_id: results.insertId
            });
        }
    });
});

// RESERVATIONS GET METHOD
app.get('/api/reservations/', (req, res) => {
    const query = `
        SELECT CONCAT(u.first_name, " ", u.last_name) AS name, s.space_name, r.reservation_id,
            r.start_time, r.end_time, r.status, r.created_at, r.modified_at,
            CONCAT(cb.first_name, " ", cb.last_name) AS created_by_name,
            CONCAT(lmb.first_name, " ", lmb.last_name) AS last_modified_by_name
        FROM Reservations r
        JOIN Spaces s ON r.space_id = s.space_id
        JOIN Users u ON r.user_id = u.user_id
        LEFT JOIN Users cb ON r.created_by = cb.user_id -- Join for created_by user's name
        LEFT JOIN Users lmb ON r.last_modified_by = lmb.user_id -- Join for last_modified_by user's name
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// RESERVATIONS DELETE METHOD

// RESERVATIONS ALTER METHOD
app.patch('/api/reservations/:reservationId', (req, res) => {
    const { status, last_modified_by } = req.body;
    const query = `
        UPDATE Reservations
        SET status = ?, last_modified_by = ?, modified_at = CURRENT_TIMESTAMP
        WHERE reservation_id = ?
    `;
    db.query(query, [status, last_modified_by, req.params.reservationId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({
                message: 'Reservation updated successfully',
                affected_rows: results.affectedRows
            });
        }
    });
});

// ======= Space Rules Routes =======

// SPACE RULES INSERT METHOD
app.post('/api/space-rules', (req, res) => {
    const {
        space_id,
        min_duration_minutes,
        max_duration_minutes,
        max_advance_days,
        min_notice_hours,
        modification_deadline_hours
    } = req.body;

    const query = `
        INSERT INTO SpaceRules
        (space_id, min_duration_minutes, max_duration_minutes,
         max_advance_days, min_notice_hours, modification_deadline_hours)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [
        space_id,
        min_duration_minutes,
        max_duration_minutes,
        max_advance_days,
        min_notice_hours,
        modification_deadline_hours
    ], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({
                message: 'Space rules created successfully',
                rule_id: results.insertId
            });
        }
    });
});

// SPACE RULES GET METHOD
app.get('/api/space-rules', (req, res) => {
    const query = `
        SELECT sr.space_id, s.space_name, sr.min_duration_minutes, sr.max_duration_minutes, sr.created_at, sr.modified_at
        FROM SpaceRules sr
        JOIN Spaces s ON s.space_id = sr.space_id
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// SPACE RULES DELETE METHOD

// SPACE RULES ALTER METHOD

// ======= Start Server =======

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});