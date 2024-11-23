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

app.get('/api/USERS', (req, res) => {
    db.query('SELECT * FROM USERS', (err, results) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(results);
        }
    });
});



app.post('/api/USERS', (req, res) => {
    const { name, email, password } = req.body;
    const query = 'INSERT INTO USERS (name, email, password) VALUES (?, ?, ?)';
    db.query(query, [name, email, password], (err, results) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send({ message: 'User added', userId: results.insertId});
        }
    });
});

app.delete('/api/USERS', (req, res) => {
    const { name, email, password } = req.body;

    // validate that all fields are provided
    if (!name || !email || !password) {
        return res.status(400).send("Missing required fields");
    }

    const query = 'DELETE FROM USERS WHERE name = ? AND email = ? AND password = ?';
    db.query(query, [name, email, password], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        if (results.affectedRows > 0) {
            res.sendStatus(200); // sucess
        } else {
            res.status(404).send('User not found');
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});