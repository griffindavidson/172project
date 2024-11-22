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

app.post('/USERS', (req, res) => {
    const { name, email, password } = req.body();
    const query = 'INSERT INTO USERS (name, email, password) VALUES (?, ?, ?)';
    db.query(query, [name, email, password], (err, results) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send({ message: 'User added', userId: results.insertId});
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});