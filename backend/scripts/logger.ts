import fs from 'fs';
import path from 'path';

class Logger {
    private logDir: string;
    private logFile: string;

    constructor(botUsername: string) {
        this.logDir = path.join(process.cwd(), 'botLogs');
        this.logFile = path.join(this.logDir, `${botUsername}.log`);

        // Create the botLogs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private getTimestamp(): string {
        return new Date().toISOString();
    }

    log(message: string): void {
        const logEntry = `[${this.getTimestamp()}] ${message}\n`;
        fs.appendFileSync(this.logFile, logEntry);
        console.log(logEntry.trim());  // Also log to console
    }

    error(message: string): void {
        const errorEntry = `[${this.getTimestamp()}] ERROR: ${message}\n`;
        fs.appendFileSync(this.logFile, errorEntry);
        console.error(errorEntry.trim());  // Also log to console
    }
}

export default Logger;