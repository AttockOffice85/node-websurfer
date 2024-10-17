import fs from 'fs';
import path from 'path';

class Logger {
    private botName: string;
    private logDir: string;
    private logFile: string;

    constructor(botUsername: string) {
        this.botName = botUsername;
        this.logDir = path.join(process.cwd(), 'botLogs');
        this.logFile = path.join(this.logDir, `${botUsername}.log`);

        // Create the botLogs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private getTimestamp(): string {
        const now = new Date();

        // Format date as DD-MMM-YYYY
        const day = String(now.getDate()).padStart(2, '0');
        const month = now.toLocaleString('en-US', { month: 'short' });
        const year = now.getFullYear();

        // Format time as HH:MM:SS AM/PM
        const hours = now.getHours() % 12 || 12;  // 12-hour format
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

        return `${day}-${month}-${year}:${hours}:${minutes}:${seconds}:${ampm}`;
    }

    log(message: string): void {
        const logEntry = `[${this.getTimestamp()}] ${message}\n`;
        fs.appendFileSync(this.logFile, logEntry);
        console.log(this.botName, ' :: ', logEntry.trim());  // Also log to console
    }

    error(message: string): void {
        const errorEntry = `[${this.getTimestamp()}] ERROR: ${message}\n`;
        fs.appendFileSync(this.logFile, errorEntry);
        console.error(this.botName, ' :: ', errorEntry.trim());  // Also log to console
    }
}

export default Logger;