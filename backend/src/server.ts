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

// Path to the data JSON files
const usersDataPath = path.join(process.cwd(), 'data', 'users-data.json');
const companiesDataPath = path.join(process.cwd(), 'data', 'companies-data.json');

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
    // Path to bot logs directory
    const logDir = path.join(__dirname, '..', 'botLogs');

    // Read the users-data.json file
    fs.readFile(usersDataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading users data file');
        }

        try {
            const users = JSON.parse(data).users;
            const botsStatus = users.map((user: { username: string; ip_address: string; ip_port: string }) => {
                const email = user.username;
                const botName = email.split('@')[0]; // Extract the part before '@'
                const logFilePath = path.join(logDir, `${botName}.log`); // Construct the log file path
                const ip_address = user.ip_address;
                const ip_port = user.ip_port;

                // fun:: getLatestStatus works with usernames now
                let status: string = '! log file';
                let postCount: any = 0;
                let inactiveSince: string | undefined = '';

                // Check if the log file exists
                if (fs.existsSync(logFilePath)) {
                    // Get the latest status if the log file exists
                    ({ status, postCount, inactiveSince } = getLatestStatus(logFilePath));
                } else {
                    console.warn(`Log file not found for bot: ${botName}`);
                }

                const botInfo = {
                    name: botName,
                    ip_address,
                    ip_port,
                    status,
                    postCount,
                    inactiveSince,
                    isRunning: !!botProcesses[botName]
                };
                return botInfo;
            });

            res.json(botsStatus);
        } catch (parseError) {
            console.error(parseError);
            res.status(500).send('Error parsing users data file');
        }
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
    const { email, password, ip_address, ip_port, ip_username, ip_password } = req.body;
    const result = await handleBotStart(email, password, ip_address, ip_port, ip_username, ip_password, true);
    if (result.error) {
        return res.status(500).send({ error: result.error });
    }
    res.send({ status: result.status });
});

app.post('/add-company', async (req: any, res: any) => {
    const { company_name, company_link } = req.body;

    // Check for missing fields
    if (!company_name || !company_link) {
        return res.status(400).json({ error: 'Company name and link are required' });
    }

    try {
        // Read the existing companies data
        const data = await promiseFs.readFile(companiesDataPath, 'utf-8');
        const companiesData = JSON.parse(data);

        // Check if the company already exists
        const companyExists = companiesData.companies.some((company: { name: string; link: string }) =>
            company.name.toLowerCase() === company_name.toLowerCase() ||
            company.link === company_link
        );

        if (companyExists) {
            return res.status(409).json({ error: 'Company already exists' });
        }

        // Add the new company
        companiesData.companies.push({ name: company_name, link: company_link });

        // Write the updated data back to the file
        await promiseFs.writeFile(companiesDataPath, JSON.stringify(companiesData, null, 2));

        // Send a success response
        res.status(201).json({ status: 'Company added successfully; bots will visit after completing one lifecycle.' });
    } catch (error) {
        console.error('Error adding company:', error);
        res.status(500).json({ error: 'An error occurred while adding the company' });
    }
});

app.post('/start-bot', async (req: any, res: any) => {
    const { username } = req.body;
    const result = await handleBotStart(username, undefined, undefined, undefined, undefined, undefined, false);  // No need for password/apiKey when starting an existing user
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
    const errors = ['Error', 'timeout of', 'ERROR', 'crashed after', 'Session ended', 'Breaking forever', 'Stopped', 'Manually stopped', 'Captcha/Code', 'IP Config', 'paused'];
    const matchedError = errors.find(error => line.includes(error));
    return matchedError || null;
}

function updateInactiveSince(logFilePath: string): string {
    const now = formatDate(new Date());
    botInactiveSince[logFilePath] = now;
    return now;
}

async function handleBotStart(email: string, password?: string, ip_address?: string, ip_port?: string, ip_username?: string, ip_password?: string, isNewUser?: boolean): Promise<{ status: string; error?: string }> {
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
                ip_address: ip_address,
                ip_port: ip_port,
                ip_username: ip_username,
                ip_password: ip_password,
            };

            // Add the new user
            usersData.users.push(newUser);

            // Write the updated users data back to the file
            await promiseFs.writeFile(usersDataPath, JSON.stringify(usersData, null, 2));

            // Confirm the new user was added by re-reading the file
            const updatedUsersData = JSON.parse(await promiseFs.readFile(usersDataPath, 'utf8'));
            const confirmedUser = usersData.users.find((user: any) => user.username === email);

            if (confirmedUser) {
                console.log("User added successfully:", confirmedUser);
                // Start the bot after confirming the new user has been added
                startBot(username);
            } else {
                console.error("User not found after write operation.");
            }
        } else {
            startBot(username);
        }
        return { status: `Bot ${isNewUser ? 'added and' : ''} started successfully` };
    } catch (error) {
        console.error(`Failed to start bot for ${username}:`, error);
        return { status: `Failed to ${isNewUser ? 'add and' : ''} start bot`, error: String(error) };
    }
}