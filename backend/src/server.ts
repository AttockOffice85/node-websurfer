import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use(cors());

// Store the last known file sizes
const lastFileSizes: { [key: string]: number } = {};

// Assuming we store inactiveSince values globally or higher in the scope
const botInactiveSince: { [logFilePath: string]: string | undefined } = {};

function getLatestStatus(logFilePath: string): { status: string, postCount: number, inactiveSince?: string } {
    try {
        const stats = fs.statSync(logFilePath);
        const currentSize = stats.size;
        const lastSize = lastFileSizes[logFilePath] || 0;

        const data = fs.readFileSync(logFilePath, 'utf8');
        const lines = data.split('\n').filter(Boolean);

        const lastLine = [...lines].reverse().find(line => /^\[\d{2}-[A-Za-z]{3}-\d{4}:\d{1,2}:\d{2}:\d{2}:(AM|PM)\]/.test(line));

        console.log("lastLine:::", lastLine);
        let status: string;
        let inactiveSince: string | undefined = botInactiveSince[logFilePath]; // Load previous inactiveSince if it exists

        if (!lastLine) {
            return { status: 'failed', postCount: lines.length };
        }

        // If file size hasn't changed
        if (currentSize === lastSize) {
            const timeSinceLastModification = Date.now() - stats.mtimeMs;

            // Check for long inactivity (> 1 minute)
            if (timeSinceLastModification > 60 * 1000) {
                if (lastLine.includes('Error') || lastLine.includes('timeout of') || lastLine.includes('ERROR') || lastLine.includes('crashed after') || lastLine.includes('Session ended')) {
                    status = 'Error Detected';
                    
                    // Only set inactiveSince if it wasn't set previously (i.e., when the bot first malfunctioned)
                    if (!inactiveSince) {
                        const now = new Date();
                        inactiveSince = formatDate(now);
                        botInactiveSince[logFilePath] = inactiveSince; // Store the first inactive time
                    }
                } else {
                    status = 'Active'; // No errors found
                }
            } else {
                status = 'Active'; // No change but file recently modified
            }

        } else if (currentSize > lastSize) {
            // File is growing, consider it active but check for errors
            if (lastLine.includes('Error') || lastLine.includes('timeout of') || lastLine.includes('ERROR') || lastLine.includes('Session ended')) {
                status = 'Error Detected';

                // Only set inactiveSince if it wasn't set previously
                if (!inactiveSince) {
                    const now = new Date();
                    inactiveSince = formatDate(now);
                    botInactiveSince[logFilePath] = inactiveSince;
                }
            } else {
                status = 'Active'; // No errors found
                botInactiveSince[logFilePath] = undefined; // Clear inactive time if the bot is active again
            }

            // Update the last known size
            lastFileSizes[logFilePath] = currentSize;

        } else if (lastLine.includes('Starting')) {
            status = 'Starting'; // Special case for initialization
            botInactiveSince[logFilePath] = undefined; // Clear inactive time during startup

        } else {
            status = 'Unknown'; // Handle cases where no clear status is found
            if (!inactiveSince) {
                const now = new Date();
                inactiveSince = formatDate(now);
                botInactiveSince[logFilePath] = inactiveSince;
            }
        }

        return { status, postCount: lines.length, inactiveSince };

    } catch (error) {
        console.error(`Error reading log file: ${logFilePath}`, error);
        return { status: 'Unknown', postCount: 0 };
    }
}

app.get('/all-bots', (req, res) => {
    const logDir = path.join(__dirname, '..', 'botLogs');
    fs.readdir(logDir, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading bot logs directory');
        }
        const botsStatus = files
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const botName = file.replace('.log', '');
                const { status, postCount, inactiveSince } = getLatestStatus(path.join(logDir, file));
                return { name: botName, status, postCount, inactiveSince };
            });
        res.json(botsStatus);
    });
});

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

app.get('/', (req, res) => {
    res.send("Hello world");
});

app.listen(port, () => {
    console.log(`Log server listening at http://localhost:${port}`);
});

function formatDate(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
        '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'
    ];

    const dayOfWeek = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    const formattedHours = String(hours).padStart(2, '0');

    return `${dayOfWeek}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}