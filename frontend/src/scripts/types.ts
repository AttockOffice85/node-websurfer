export interface Bot {
    name: string;
    status: string;
    postCount: number;
    inactiveSince?: string;
    isRunning: boolean;
    ip_address?: string;
    ip_port?: string;
}

export interface PopupState {
    isOpen: boolean;
    openPopup: () => void;
    closePopup: () => void;
}

export interface responseMessage {
    type: boolean; // if true Success, else Error
    status?: string;
    descrip?: string;
}

export const botStatusExplanations = [
    {
        status: 'Active',
        desc: 'Bot is live and working.',
    },
    {
        status: 'Processing...',
        desc: 'Bot working on the posts.',
    },
    {
        status: 'Captcha/Code | IP Config',
        desc: 'Manual verification/attention required.',
    },
    {
        status: 'Error',
        desc: 'A general error occurred during bot operation.',
    },
    {
        status: 'ERROR',
        desc: 'A critical error occurred, requiring immediate attention.',
    },
    {
        status: 'Manually stopped',
        desc: 'The bot was intentionally stopped by administrator.'
    },
    {
        status: 'crashed after',
        desc: 'The bot unexpectedly stopped working after a certain point.',
    },
    {
        status: 'Breaking forever',
        desc: 'The bot encountered a critical issue and has stopped permanently.',
    },
    {
        status: 'Session ended',
        desc: 'The bot\'s session has ended, possibly due to logout or session expiration.',
    },
    {
        status: 'timeout of',
        desc: 'The bot operation timed out, possibly due to slow network or unresponsive pages.',
    },
    {
        status: 'Stopped',
        desc: 'The bot has been stopped, either automatically or manually. And most probably will auto restart in 30-40 seconds.',
    },
    {
        status: 'Active | Processing + Start Btn',
        desc: 'The bot is in trouble, need immediate attention.',
    },
];