// backend/index.ts
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { botProcesses } from './src/utils';

dotenv.config();

const usersData = JSON.parse(fs.readFileSync('./data/users-data.json', 'utf-8'));
const users = usersData.users;
const noOfBots: number = parseInt(process.env.NO_OF_BOTS || '1');

function runBot(user: any) {
    const botProcess = spawn('node', ['-r', 'ts-node/register', path.join(__dirname, 'bot.ts')], {
        env: { ...process.env, BOT_USERNAME: user.username, BOT_PASSWORD: user.password }
    });

    let botUserName = user.username.split('@')[0];

    botProcess.stdout.on('data', (data) => {
        console.log(`Bot ${botUserName}: ${data}`);
    });

    botProcess.stderr.on('data', (data) => {
        console.error(`Bot ${botUserName} error: ${data}`);
    });

    botProcess.on('close', (code) => {
        console.log(`Bot ${botUserName} exited with code ${code}`);
        delete botProcesses[user.username]; // Remove from botProcesses on exit
        // Restart the bot after a delay
        // setTimeout(() => runBot(user), 30000);
    });

    botProcesses[botUserName] = botProcess; // Store the bot process
}

export function startBot(username: string) {
    const user = users.find((u: { username: string; }) => u.username === username);
    if (user) {
        if (!botProcesses[username]) { // Check if already running
            runBot(user);
            console.log(`Starting bot for ${username}`);
        } else {
            console.log(`Bot for ${username} is already running.`);
        }
    }
}

function main() {
    const botsToRun = Math.min(noOfBots, users.length);
    users.slice(0, botsToRun).forEach(runBot);
}

main();