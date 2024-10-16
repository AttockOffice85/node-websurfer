export interface Bot {
    name: string;
    status: string;
    postCount: number;
    inactiveSince?: string;
    isRunning: boolean;
}