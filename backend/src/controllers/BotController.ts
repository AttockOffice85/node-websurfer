// src/controllers/bots_controller.ts
import { Request, Response } from 'express';
import fs from 'fs';
import * as promiseFs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { botProcesses, dynamicWait, formatDate } from '../utils';
import { startBot, stopBot } from '../..';

// Store the last known file sizes
const lastFileSizes: { [key: string]: number } = {};
const botInactiveSince: { [logFilePath: string]: string | undefined } = {};

// Path to the data JSON files
const usersDataPath = path.join(process.cwd(), 'src', 'data', 'users-data.json');
const companiesDataPath = path.join(process.cwd(), 'src', 'data', 'companies-data.json');

/* -------------------------------------------------------------------------- */
/*                            Controller functions                            */
/* -------------------------------------------------------------------------- */

/* ------------------------------ GET REQUESTS ------------------------------ */

export const getAllBots = (req: Request, res: Response) => {
    const logDir = path.join(__dirname, '..', '..', 'botLogs');

    fs.readFile(usersDataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading users data file');
        }

        try {
            const users = JSON.parse(data).users;
            const botsStatus = users.map((user: { username: string; ip_address: string; ip_port: string }) => {
                const email = user.username;
                const botName = email.split('@')[0];
                const logFilePath = path.join(logDir, `${botName}.log`);
                const ip_address = user.ip_address;
                const ip_port = user.ip_port;

                let status: string = '! log file';
                let postCount: any = 0;
                let inactiveSince: string | undefined = '';

                if (fs.existsSync(logFilePath)) {
                    ({ status, postCount, inactiveSince } = getLatestStatus(logFilePath));
                } else {
                    console.warn(`Log file not found for bot: ${botName}`);
                }

                return {
                    name: botName,
                    ip_address,
                    ip_port,
                    status,
                    postCount,
                    inactiveSince,
                    isRunning: !!botProcesses[botName]
                };
            });

            res.json(botsStatus);
        } catch (parseError) {
            console.error(parseError);
            res.status(500).send('Error parsing users data file');
        }
    });
};

export const getBotLogs = (req: Request, res: Response) => {
    const username = req.params.username;
    const logPath = path.join(__dirname, '..', '..', 'botLogs', `${username}.log`);

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
};

export const getBotStatus = (req: Request, res: Response) => {
    const { username } = req.params;
    const logPath = path.join(__dirname, '..', '..', 'botLogs', `${username}.log`);
    const { status, postCount, inactiveSince } = getLatestStatus(logPath);

    res.json({
        name: username,
        status,
        postCount,
        inactiveSince,
        isRunning: !!botProcesses[username]
    });
};

export const streamBotLogs = (req: Request, res: Response) => {
    const { username } = req.params;
    const logPath = path.join(__dirname, '..', '..', 'botLogs', `${username}.log`);

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
};

/* ------------------------------ POST REQUEST ------------------------------ */

export const addBot = async (req: any, res: any) => {
    const { email, password, ip_address, ip_port, ip_username, ip_password, platforms } = req.body;

    await dynamicWait(200, 400);

    if (!platforms || !platforms['linkedin']) {
        // return res.status(400).send({ error: 'LinkedIn platform is required.' });
    }

    const platformsArray = Object.keys(platforms).filter((platform) => platforms[platform] === true);

    try {
        const result = await handleBotStart(
            email,
            password,
            ip_address,
            ip_port,
            ip_username,
            ip_password,
            platformsArray,
            true
        );

        if (result.error) {
            return res.status(500).send({ error: result.error });
        }
        return res.send({ status: result.status });
    } catch (error) {
        console.error('Error starting bot:', error);
        return res.status(500).send({ error: 'Failed to add bot' });
    }
};

export const addCompany = async (req: any, res: any) => {
    const { company_name, company_link } = req.body;

    if (!company_name || !company_link) {
        return res.status(400).json({ error: 'Company name and link are required' });
    }

    try {
        const data = await promiseFs.readFile(companiesDataPath, 'utf-8');
        const companiesData = JSON.parse(data);

        const companyExists = companiesData.companies.some((company: { name: string; link: string }) =>
            company.name.toLowerCase() === company_name.toLowerCase() ||
            company.link === company_link
        );

        if (companyExists) {
            return res.status(409).json({ error: 'Company already exists' });
        }

        companiesData.companies.push({ name: company_name, link: company_link });
        await promiseFs.writeFile(companiesDataPath, JSON.stringify(companiesData, null, 2));

        res.status(201).json({ status: 'Company added successfully; bots will visit after completing one lifecycle.' });
    } catch (error) {
        console.error('Error adding company:', error);
        res.status(500).json({ error: 'An error occurred while adding the company' });
    }
};

export const startExistingBot = async (req: any, res: any) => {
    const { username } = req.body;
    const result = await handleBotStart(username, undefined, undefined, undefined, undefined, undefined, undefined, false);
    if (result.error) {
        return res.status(500).send({ error: result.error });
    }
    res.send({ status: result.status });
};

export const stopExistingBot = (req: any, res: any) => {
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
};

/* -------------------------------------------------------------------------- */
/*                              Helper functions                              */
/* -------------------------------------------------------------------------- */

const handleBotStart = async (
    email: string,
    password?: string,
    ip_address?: string,
    ip_port?: string,
    ip_username?: string,
    ip_password?: string,
    platforms: string[] = [],
    isNewUser = false
): Promise<{ status: string; error?: string }> => {
    let username: string = email.includes('@') ? email.split('@')[0] : email;

    if (botProcesses[username]) {
        return { status: 'Bot is already running' };
    }

    try {
        if (isNewUser) {
            const usersData = JSON.parse(await promiseFs.readFile(usersDataPath, 'utf8'));

            const existingUser = usersData.users.find((user: any) => user.username === email);
            if (existingUser) {
                startBot(username);
                return { status: `User: ${username} already exists. Bot started.` };
            }

            const newUser = {
                username: email,
                password: password || 'defaultPassword',
                platforms,
                ip_address: ip_address || '',
                ip_port: ip_port || '',
                ip_username: ip_username || '',
                ip_password: ip_password || ''
            };

            usersData.users.push(newUser);
            await promiseFs.writeFile(usersDataPath, JSON.stringify(usersData, null, 2));

            const confirmedUser = usersData.users.find((user: any) => user.username === email);
            if (confirmedUser) {
                console.log("User added successfully:", confirmedUser);
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
};

function getErrorStatus(line: string): string | null {
    const errors = ['Error', 'timeout of', 'ERROR', 'crashed after', 'Session ended', 'Breaking forever', 'Stopped', 'Manually stopped', 'Captcha/Code', 'IP Config', 'paused', 'Entered hibernation'];
    const matchedError = errors.find(error => line.includes(error));
    return matchedError || null;
}

function updateInactiveSince(logFilePath: string): string {
    const now = formatDate(new Date());
    botInactiveSince[logFilePath] = now;
    return now;
}

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
            const errorStatus = getErrorStatus(lastLine);

            if (errorStatus) {
                status = errorStatus;
                if (!inactiveSince) {
                    inactiveSince = updateInactiveSince(logFilePath);
                }
            } else {
                status = 'Active';
                botInactiveSince[logFilePath] = undefined;
            }

            lastFileSizes[logFilePath] = currentSize;
        } else if (lastLine.includes('Starting')) {
            status = 'Starting';
            botInactiveSince[logFilePath] = undefined;
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