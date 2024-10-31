// backend/index.ts
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Logger from './src/services/logger';
import { botProcesses } from './src/utils';

dotenv.config();

function getUsersData() {
    const usersData = JSON.parse(fs.readFileSync('./src/data/users-data.json', 'utf-8'));
    return usersData.users;
}

const noOfBots: number = parseInt(process.env.NO_OF_BOTS || '1');

// New map to track bot status
const botStatus: { [key: string]: boolean } = {};

function runBot(user: any) {
    const botProcess = spawn('node', ['-r', 'ts-node/register', path.join(__dirname, 'bot')], {
        env: {
            ...process.env, BOT_USERNAME: user.username, BOT_PASSWORD: user.password,
            IP_ADDRESS: user.ip_address,
            IP_PORT: user.ip_port,
            IP_USERNAME: user.ip_username,
            IP_PASSWORD: user.ip_password,
        }
    });

    let botUserName = user.username.split('@')[0];

    botProcess.stdout.on('data', (data) => {
        console.log(`stdout.on: Bot ${botUserName}: ${data}`);
    });

    botProcess.stderr.on('data', (data) => {
        console.error(`stderr.on: Bot ${botUserName} error: ${data}`);
    });

    botProcess.on('close', (code) => {
        console.log(`on('close: Bot ${botUserName} exited with code ${code}`);
        delete botProcesses[botUserName]; // Remove from botProcesses on exit
        const logger = new Logger(botUserName);
        logger.log(`Stopped the bot: ${botUserName}`);

        // Check if the bot was not manually stopped before restarting
        if (botStatus[botUserName] !== false) {
            setTimeout(() => runBot(user), 30000);
        } else {
            logger.log(`Manually stopped. Not restarting.`);
            // Reset the status for future use
            delete botStatus[botUserName];
        }
    });

    botProcesses[botUserName] = botProcess; // Store the bot process
    botStatus[botUserName] = true; // Set the bot status to running
}
let retryNewUser = 0;
export async function startBot(username: string) {
    const users = getUsersData();
    console.log(users, "USERNAME: ", username);
    const user = users.find((u: { username: string; }) => u.username.split('@')[0] === username);
    if (user) {
        console.log(username, " :USERNAME: ", botProcesses[username]);
        if (!botProcesses[username]) { // Check if already running
            runBot(user);
            console.log(`Starting bot for ${username}`);
        } else {
            console.log(`Bot for ${username} is already running.`);
        }
    } else {
        console.log('Retrying: ', retryNewUser, " :User not found in the file: ", username)
        if (retryNewUser < 3) {
            retryNewUser++;
            new Promise(resolve => setTimeout(resolve, 2000));
            startBot(username);
        }
    }
    retryNewUser = 0;
}

export function stopBot(username: string, del: boolean = false) {
    if (botProcesses[username]) {
        botStatus[username] = false; // Set the bot status to stopped
        botProcesses[username].kill(); // Stop the bot process
        if (del) {
            // Remove the bot process and status from the tracking objects
            delete botProcesses[username]; // Remove from botProcesses
            delete botStatus[username]; // Remove from botStatus
        }
        console.log(`Manually ${del ? 'killed' : 'stopped'} the bot for ${username}`);
    } else {
        console.log(`Bot for ${username} is not running.`);
    }
}

function main() {
    const users = getUsersData();
    const botsToRun = Math.min(noOfBots, users.length);
    users.slice(0, botsToRun).forEach(runBot);
}

main();