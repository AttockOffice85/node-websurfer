import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors'; // Import the CORS middleware

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Route to get all bot names
app.get('/all-bots', (req, res) => {
    const logDir = path.join(__dirname, '..', 'botLogs'); // Adjust path to botLogs folder
    fs.readdir(logDir, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading bot logs directory');
        }
        // Filter to get only .log files and remove the .log extension
        const botNames = files
            .filter(file => file.endsWith('.log'))
            .map(file => file.replace('.log', ''));
        res.json(botNames); // Send the list of bot names as JSON
    });
});

// Existing route to fetch logs for a specific bot
app.get('/logs/:username', (req, res) => {
    const username = req.params.username;
    const logPath = path.join(__dirname, '..', 'botLogs', `${username}.log`)
    fs.readFile(logPath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(404).send('Log file not found');
            } else {
                console.error(err);
                res.status(500).send('Error reading log file');
            }
            return;
        }
        res.setHeader('Content-Type', 'text/plain');
        res.send(data);
    });
});

// Test route
app.get('/', (req, res) => {
    res.send("Hello world");
});

app.listen(port, () => {
    console.log(`Log server listening at http://localhost:${port}`);
});