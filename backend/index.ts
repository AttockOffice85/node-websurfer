import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

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
        // Restart the bot after a delay
        setTimeout(() => runBot(user), 30000);
    });
}

function main() {
    const botsToRun = Math.min(noOfBots, users.length);
    users.slice(0, botsToRun).forEach(runBot);
}

main();