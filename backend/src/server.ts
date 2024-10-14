import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { spawn, ChildProcess } from 'child_process';

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 8080;

app.use(cors());
app.use(express.json());

// Store bot processes
const botProcesses: { [key: string]: ChildProcess } = {};

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

        let status: string;
        let inactiveSince: string | undefined = botInactiveSince[logFilePath];

        if (!lastLine) {
            return { status: 'failed', postCount: lines.length };
        }

        // Check if the file size hasn't changed
        if (currentSize === lastSize) {
            const timeSinceLastModification = Date.now() - stats.mtimeMs;

            if (timeSinceLastModification > 60 * 1000 && hasError(lastLine)) {
                status = 'Error...';
                if (!inactiveSince) {
                    inactiveSince = updateInactiveSince(logFilePath);
                }
            } else {
                status = 'Processing...';
            }
        } else if (currentSize > lastSize) {
            // File is growing
            if (hasError(lastLine)) {
                status = 'Error...';
                if (!inactiveSince) {
                    inactiveSince = updateInactiveSince(logFilePath);
                }
            } else {
                status = 'Active';
                botInactiveSince[logFilePath] = undefined; // Clear inactive time if the bot is active
            }

            // Update the last known size
            lastFileSizes[logFilePath] = currentSize;

        } else if (lastLine.includes('Starting')) {
            status = 'Starting';
            botInactiveSince[logFilePath] = undefined; // Clear inactive time during startup
        } else {
            status = 'Processing...';
            if (!inactiveSince) {
                inactiveSince = updateInactiveSince(logFilePath);
            }
        }

        return { status, postCount: lines.length, inactiveSince };

    } catch (error) {
        console.error(`Error reading log file: ${logFilePath}`, error);
        return { status: 'Processing...', postCount: 0 };
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
                return {
                    name: botName,
                    status,
                    postCount,
                    inactiveSince,
                    isRunning: !!botProcesses[botName]
                };
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

app.post('/start-bot/:username', (req: any, res: any) => {
    const { username } = req.params;
    if (botProcesses[username]) {
        return res.status(400).json({ message: 'Bot is already running' });
    }

    const botProcess = spawn('node', ['-r', 'ts-node/register', path.join(__dirname, 'bot.ts')], {
        env: { ...process.env, BOT_USERNAME: username, BOT_PASSWORD: req.body.password }
    });

    botProcesses[username] = botProcess;

    botProcess.on('close', (code) => {
        console.log(`Bot ${username} exited with code ${code}`);
        delete botProcesses[username];
    });

    res.json({ message: 'Bot started successfully' });
});

app.post('/stop-bot/:username', (req: any, res: any) => {
    const { username } = req.params;
    const botProcess = botProcesses[username];

    if (!botProcess) {
        return res.status(404).json({ message: 'Bot is not running' });
    }

    botProcess.kill();
    delete botProcesses[username];

    res.json({ message: 'Bot stopped successfully' });
});

app.get('/bot-status/:username', (req, res) => {
    const { username } = req.params;
    const logPath = path.join(__dirname, '..', 'botLogs', `${username}.log`);
    const { status, postCount, inactiveSince } = getLatestStatus(logPath);

    res.json({
        name: username,
        status,
        postCount,
        inactiveSince,
        isRunning: !!botProcesses[username]
    });
});

app.get('/stream-logs/:username', (req, res) => {
    const { username } = req.params;
    const logPath = path.join(__dirname, '..', 'botLogs', `${username}.log`);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const sendEvent = (data: string) => {
        res.write(`data: ${data}\n\n`);
    };

    const tailProcess = spawn('tail', ['-f', logPath]);

    tailProcess.stdout.on('data', (data) => {
        sendEvent(data.toString());
    });

    req.on('close', () => {
        tailProcess.kill();
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

function hasError(line: string): boolean {
    return ['Error', 'timeout of', 'ERROR', 'crashed after', 'Session ended', 'Breaking forever'].some(error => line.includes(error));
}

function updateInactiveSince(logFilePath: string): string {
    const now = formatDate(new Date());
    botInactiveSince[logFilePath] = now;
    return now;
}
