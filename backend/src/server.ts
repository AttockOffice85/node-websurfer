// backend/src/server.ts
import express from 'express';
import fs from 'fs';
import * as promiseFs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { spawn } from 'child_process';
import { startBot, stopBot } from '../index'; // Import startBot function from index.ts
import { botProcesses } from './utils';

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 8080;

app.use(cors());
app.use(express.json());

// Store the last known file sizes
const lastFileSizes: { [key: string]: number } = {};
const botInactiveSince: { [logFilePath: string]: string | undefined } = {};

// Path to the users data JSON file
const usersDataPath = path.join(process.cwd(), 'data', 'users-data.json');

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

            const errorStatus = getErrorStatus(lastLine);
            if (timeSinceLastModification > 60 * 100 && errorStatus) {
                status = errorStatus;
                if (!inactiveSince) {
                    inactiveSince = updateInactiveSince(logFilePath);
                }
            } else {
                status = 'Processing...';
            }
        } else if (currentSize > lastSize) {
            // File is growing
            const errorStatus = getErrorStatus(lastLine);

            if (errorStatus) {
                status = errorStatus;
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
            const errorStatus = getErrorStatus(lastLine);
            status = errorStatus || 'Processing...';
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
                const botInfo = {
                    name: botName,
                    status,
                    postCount,
                    inactiveSince,
                    isRunning: !!botProcesses[botName]
                };
                return botInfo;
            });
        res.json(botsStatus);
    });
});

app.get('/logs/:username', (req, res) => {
    const username = req.params.username;
    const logPath = path.join(__dirname, '..', 'botLogs', `${username}.log`);
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

app.post('/add-bot', async (req: any, res: any) => {
    const { email, password, apiKey } = req.body;
    const result = await handleBotStart(email, password, apiKey, true);
    if (result.error) {
        return res.status(500).send({ error: result.error });
    }
    res.send({ status: result.status });
});

app.post('/start-bot', async (req: any, res: any) => {
    const { username } = req.body;
    const result = await handleBotStart(username, undefined, undefined, false);  // No need for password/apiKey when starting an existing user
    if (result.error) {
        return res.status(500).send({ error: result.error });
    }
    res.send({ status: result.status });
});

app.post('/stop-bot', (req: any, res: any) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).send({ error: 'Username is required' });
    }

    try {
        stopBot(username);
        res.send({ status: `Bot ${username} stopped` });
    } catch (error) {
        console.error(`Failed to stop bot for ${username}:`, error);
        res.status(500).send({ error: 'Failed to stop bot' });
    }
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

// HELPER FUNCTIONS

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

function getErrorStatus(line: string): string | null {
    const errors = ['Error', 'timeout of', 'ERROR', 'crashed after', 'Session ended', 'Breaking forever', 'Stopped', 'Manually stopped'];
    const matchedError = errors.find(error => line.includes(error));
    return matchedError || null;
}

function updateInactiveSince(logFilePath: string): string {
    const now = formatDate(new Date());
    botInactiveSince[logFilePath] = now;
    return now;
}

async function handleBotStart(email: string, password?: string, apiKey?: string, isNewUser?: boolean): Promise<{ status: string; error?: string }> {
    let username: string = email;
    if (email.includes('@')) {
        username = email.split('@')[0];
    }

    // Check if the bot is already running
    if (botProcesses[username]) {
        return { status: 'Bot is already running' };
    }

    try {
        if (isNewUser) {
            // Read the users data file
            const usersData = JSON.parse(await promiseFs.readFile(usersDataPath, 'utf8'));

            // Check if the user already exists
            const existingUser = usersData.users.find((user: any) => user.username === email);
            if (existingUser) {
                // Start the bot if user exists but bot isn't running
                startBot(username);
                return { status: `User: ${username} already exists. Bot started.` };
            }

            // Add the new user to users-data.json
            const newUser = {
                username: email,
                password: password || 'defaultPassword',
                huggingFaceApiKey: apiKey || 'defaultApiKey',
            };
            usersData.users.push(newUser);

            // Write the updated users data back to the file
            await promiseFs.writeFile(usersDataPath, JSON.stringify(usersData, null, 2));

            // Confirm the new user was added by re-reading the file
            const updatedUsersData = JSON.parse(await promiseFs.readFile(usersDataPath, 'utf8'));
            const confirmedUser = updatedUsersData.users.find((user: any) => user.username === email);

            if (confirmedUser) {
                startBot(username);
            }
        } else {
            // Start the bot after confirming the new user has been added
            startBot(username);
        }
        return { status: `Bot ${isNewUser ? 'added and' : ''} started successfully` };
    } catch (error) {
        console.error(`Failed to start bot for ${username}:`, error);
        return { status: `Failed to ${isNewUser ? 'add and' : ''} start bot`, error: String(error) };
    }
}