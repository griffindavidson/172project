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

// Helper function to handle database queries as promises
function queryDB(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

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
app.delete('/api/Users', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).send("Missing ID Field");
    }

    // Ensure the logged-in user is not deleting their own account
    const loggedInUserId = req.session.user?.id; // Fetch from session
    if (parseInt(id, 10) === parseInt(loggedInUserId, 10)) {
        return res.status(403).send({ error: "You cannot delete your own account while logged in." });
    }

    try {
        const affectedRows = await deleteUserCascade(id);

        if (affectedRows > 0) {
            res.status(200).send({ message: "User deleted successfully" });
        } else {
            res.status(404).send({ error: "User not found" });
        }
    } catch (err) {
        console.log("Database Error:", err);
        return res.status(500).send({ error: "Internal Server Error" });
    }
});

// Modified helper function specifically for user deletion
async function deleteUserCascade(userId) {
    try {
        // First delete all reservations created by or modified by this user
        await queryDB('DELETE FROM Reservations WHERE created_by = ? OR last_modified_by = ?', [userId, userId]);

        // Delete all reservations made by this user
        await queryDB('DELETE FROM Reservations WHERE user_id = ?', [userId]);

        // Delete all operating hours for spaces owned by this user
        await queryDB(`
            DELETE oh FROM OperatingHours oh
            JOIN Spaces s ON oh.space_id = s.space_id
            WHERE s.host_id = ?
        `, [userId]);

        // Delete all space rules for spaces owned by this user
        await queryDB(`
            DELETE sr FROM SpaceRules sr
            JOIN Spaces s ON sr.space_id = s.space_id
            WHERE s.host_id = ?
        `, [userId]);

        // Delete all spaces owned by this user
        await queryDB('DELETE FROM Spaces WHERE host_id = ?', [userId]);

        // Finally delete the user and get the result
        const result = await queryDB('DELETE FROM Users WHERE user_id = ?', [userId]);
        return result.affectedRows;
    } catch (error) {
        throw error;
    }
}


// need to add a USER ALTER METHOD here
app.patch('/api/Users/:id', async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, is_host } = req.body;

    try {
        const query = `
            UPDATE Users
            SET first_name = ?, last_name = ?, email = ?, is_host = ?
            WHERE user_id = ?
        `;
        const result = await queryDB(query, [first_name, last_name, email, is_host, id]);

        if (result.affectedRows > 0) {
            res.json({ message: 'User updated successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


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
        SELECT s.space_id, CONCAT(u.first_name, " ", u.last_name) as host,
            s.space_name, s.description, s.capacity, s.is_approved,
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

// Get specific space details
app.get('/api/spaces/:id', (req, res) => {
    if (isReservationRequest(req)) {
        // Specific query for reservation page
        const query = `
            SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) as host_name,
                   sr.min_duration_minutes, sr.max_duration_minutes,
                   sr.min_notice_hours, sr.max_advance_days
            FROM Spaces s
            JOIN Users u ON s.host_id = u.user_id
            LEFT JOIN SpaceRules sr ON s.space_id = sr.space_id
            WHERE s.space_id = ?
        `;

        db.query(query, [req.params.id], (err, results) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (results.length === 0) {
                res.status(404).json({ error: 'Space not found' });
            } else {
                res.json(results[0]);
            }
        });
    } else {
        // Original query for other pages
        const query = `
            SELECT s.space_id, s.host_id, s.space_name, s.description, s.capacity, s.is_approved,
                s.created_at, s.modified_at,
                CONCAT(u.first_name, ' ', u.last_name) as host_name
            FROM Spaces s
            JOIN Users u ON s.host_id = u.user_id
            WHERE s.space_id = ?
        `;

        db.query(query, [req.params.id], (err, results) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (results.length === 0) {
                res.status(404).json({ error: 'Space not found' });
            } else {
                res.json(results[0]);
            }
        });
    }
});

// SPACE DELETE METHOD here
async function deleteSpace(spaceId) {
    try {
        // Delete all reservations for this space
        await queryDB('DELETE FROM Reservations WHERE space_id = ?', [spaceId]);

        // Delete operating hours
        await queryDB('DELETE FROM OperatingHours WHERE space_id = ?', [spaceId]);

        // Delete space rules
        await queryDB('DELETE FROM SpaceRules WHERE space_id = ?', [spaceId]);

        // Finally delete the space
        await queryDB('DELETE FROM Spaces WHERE space_id = ?', [spaceId]);

        return { success: true, message: 'Space and all related data deleted successfully' };
    } catch (error) {
        throw new Error(`Error deleting space: ${error.message}`);
    }
}

app.delete('/api/spaces', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Missing ID Field" });
    }

    try {
        const result = await deleteSpace(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SPACE ALTER METHOD here
app.patch('/api/spaces/:id', async (req, res) => {
    const { id } = req.params;
    const { space_name, description, capacity, is_approved } = req.body;

    try {
        const query = `
            UPDATE Spaces
            SET space_name = ?, description = ?, capacity = ?, is_approved = ?,
                modified_at = CURRENT_TIMESTAMP
            WHERE space_id = ?
        `;
        const result = await queryDB(query, [space_name, description, capacity, is_approved, id]);

        if (result.affectedRows > 0) {
            res.json({ message: 'Space updated successfully' });
        } else {
            res.status(404).json({ error: 'Space not found' });
        }
    } catch (err) {
        console.error('Error updating space:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
        SELECT o.space_id, o.day_of_week, o.open_time, o.close_time, o.is_closed, s.space_name
        FROM OperatingHours o
        JOIN Spaces s ON s.space_id = o.space_id
        ORDER BY s.space_name, o.day_of_week
    `;

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

app.get('/api/operating-hours/:id', (req, res) => {
    const query = `
        SELECT o.space_id, o.day_of_week, o.open_time, o.close_time, o.is_closed, s.space_name
        FROM OperatingHours o
        JOIN Spaces s ON s.space_id = o.space_id
        WHERE o.space_id = ?
        ORDER BY s.space_name, o.day_of_week
    `;

    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// OPERATING HOURS DELETE METHOD
app.delete('/api/operating-hours', (req, res) => {
    const { spaceId, day } = req.body;

    if (!spaceId || day === undefined) {
        return res.status(400).json({ error: "Missing space ID or day" });
    }

    const query = 'DELETE FROM OperatingHours WHERE space_id = ? AND day_of_week = ?';
    db.query(query, [spaceId, day], (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if (results.affectedRows > 0) {
            res.json({ message: "Operating hours deleted successfully" });
        } else {
            res.status(404).json({ error: "Operating hours not found" });
        }
    });
});

// OPERATING HOURS ALTER METHOD
app.patch('/api/operating-hours/:spaceId/:day', async (req, res) => {
    const { spaceId, day } = req.params;
    const { open_time, close_time, is_closed } = req.body;

    try {
        const query = `
            UPDATE OperatingHours
            SET open_time = ?, close_time = ?, is_closed = ?
            WHERE space_id = ? AND day_of_week = ?
        `;
        const result = await queryDB(query, [open_time, close_time, is_closed, spaceId, day]);

        if (result.affectedRows > 0) {
            res.json({ message: 'Operating hours updated successfully' });
        } else {
            res.status(404).json({ error: 'Operating hours not found' });
        }
    } catch (err) {
        console.error('Error updating operating hours:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
app.get('/api/reservations', (req, res) => {
    const query = `
        SELECT CONCAT(u.first_name, " ", u.last_name) AS name, s.space_name, r.reservation_id,
            r.start_time, r.end_time, r.status, r.created_at, r.modified_at,
            CONCAT(cb.first_name, " ", cb.last_name) AS created_by_name,
            CONCAT(lmb.first_name, " ", lmb.last_name) AS last_modified_by_name
        FROM Reservations r
        JOIN Spaces s ON r.space_id = s.space_id
        JOIN Users u ON r.user_id = u.user_id
        LEFT JOIN Users cb ON r.created_by = cb.user_id
        LEFT JOIN Users lmb ON r.last_modified_by = lmb.user_id
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Get reservations for a specific space within a date range
app.get('/api/reservations/space/:spaceId', (req, res) => {
    const { spaceId } = req.params;
    const { start, end } = req.query;

    const query = `
        SELECT r.reservation_id, r.space_id, r.start_time, r.end_time, r.status,
            CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM Reservations r
        JOIN Users u ON r.user_id = u.user_id
        WHERE r.space_id = ?
        AND r.start_time >= ?
        AND r.end_time <= ?
        AND r.status != 'cancelled'
        ORDER BY r.start_time
    `;

    db.query(query, [spaceId, start, end], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// RESERVATIONS DELETE METHOD

async function deleteReservation(reservationId) {
    try {
        await queryDB('DELETE FROM Reservations WHERE reservation_id = ?', [reservationId]);
        return { success: true, message: 'Reservation deleted successfully' };
    } catch (error) {
        throw new Error(`Error deleting reservation: ${error.message}`);
    }
}

app.delete('/api/reservations', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Missing ID Field" });
    }

    try {
        const result = await deleteReservation(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// RESERVATIONS ALTER METHOD
app.patch('/api/reservations/:id', async (req, res) => {
    const { id } = req.params;
    const { status, last_modified_by } = req.body;

    try {
        const query = `
            UPDATE Reservations
            SET status = ?, last_modified_by = ?, modified_at = CURRENT_TIMESTAMP
            WHERE reservation_id = ?
        `;
        const result = await queryDB(query, [status, last_modified_by, id]);

        if (result.affectedRows > 0) {
            res.json({ message: 'Reservation updated successfully' });
        } else {
            res.status(404).json({ error: 'Reservation not found' });
        }
    } catch (err) {
        console.error('Error updating reservation:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
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
        SELECT sr.space_id, s.space_name, sr.min_duration_minutes, sr.max_duration_minutes,
               sr.created_at, sr.modified_at
        FROM SpaceRules sr
        JOIN Spaces s ON s.space_id = sr.space_id
        ORDER BY s.space_name
    `;

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

app.get('/api/space-rules/:id', (req, res) => {
    const query = `
        SELECT sr.space_id, s.space_name, sr.min_duration_minutes, sr.max_duration_minutes,
               sr.created_at, sr.modified_at
        FROM SpaceRules sr
        JOIN Spaces s ON s.space_id = sr.space_id
        WHERE sr.space_id = ?
    `;

    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'Space rules not found' });
        } else {
            res.json(results[0]);
        }
    });
});

// SPACE RULES DELETE METHOD

// SPACE RULES ALTER METHOD

app.patch('/api/space-rules/:id', async (req, res) => {
    const { id } = req.params;
    const { min_duration_minutes, max_duration_minutes } = req.body;

    try {
        const query = `
            UPDATE SpaceRules
            SET min_duration_minutes = ?, max_duration_minutes = ?,
                modified_at = CURRENT_TIMESTAMP
            WHERE space_id = ?
        `;
        const result = await queryDB(query, [min_duration_minutes, max_duration_minutes, id]);

        if (result.affectedRows > 0) {
            res.json({ message: 'Space rules updated successfully' });
        } else {
            res.status(404).json({ error: 'Space rules not found' });
        }
    } catch (err) {
        console.error('Error updating space rules:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ======= Start Server =======

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Helper function to check if request is from reservation page
function isReservationRequest(req) {
    const referer = req.get('Referer') || '';
    return referer.includes('reservation.html');
}