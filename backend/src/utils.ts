import { ChildProcess } from 'child_process';

// Helper to generate a random ID
export function generateRandomID() {
    return Math.random().toString(36).substr(2, 9);
}


// Shared instance to store bot processes
export const botProcesses: { [key: string]: ChildProcess } = {};
