const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/db');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Test Route
app.get('/', (req, res) => {
    res.send('Welcome to the Node.js Website!');
});

// User Routes
app.post('/api/users', (req, res) => {
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

app.get('/api/users', (req, res) => {
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

// Space Routes
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

app.get('/api/spaces', (req, res) => {
    const query = `
        SELECT s.*, u.first_name as host_first_name, u.last_name as host_last_name
        FROM Spaces s
        JOIN Users u ON s.host_id = u.user_id
        WHERE s.is_approved = true
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Operating Hours Routes
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

// Reservation Routes
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

app.get('/api/reservations/:userId', (req, res) => {
    const query = `
        SELECT r.*, s.space_name, u.first_name, u.last_name
        FROM Reservations r
        JOIN Spaces s ON r.space_id = s.space_id
        JOIN Users u ON r.user_id = u.user_id
        WHERE r.user_id = ?
    `;
    db.query(query, [req.params.userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Update reservation status
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

// Space Rules Routes
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

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});