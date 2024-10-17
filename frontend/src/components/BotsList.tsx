import React, { useState, useEffect } from 'react';
import { Bot, botStatusExplanations } from '../scripts/types';
import { usePopupUserFormStore } from '../store/usePopupStore';
import UserModal from '../models/UserModal';
const apiUrl: string | undefined = process.env.REACT_APP_API_URL;

const BotsList: React.FC = () => {
    if (!apiUrl) {
        alert('no backend endpoint defined');
    }

    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [noOfInactiveBots, setNoOfInactiveBots] = useState<number>(0);
    const [noOfActiveBots, setNoOfActiveBots] = useState<number>(0);
    const { openPopup } = usePopupUserFormStore();

    useEffect(() => {
        const fetchBots = async () => {
            try {
                const response = await fetch(`${apiUrl}/all-bots`);
                if (!response.ok) {
                    throw new Error('Failed to fetch bots');
                }
                const data = await response.json();
                setBots(data);

                const botsInActiveArr = data.filter((bot: { status: string; }) => ['Error', 'timeout of', 'ERROR', 'crashed after', 'Session ended', 'Breaking forever', 'Stopped', 'Manually stopped'].includes(bot.status));

                setNoOfInactiveBots(botsInActiveArr.length);
                const botsActive = data.length - botsInActiveArr.length;
                setNoOfActiveBots(botsActive < 0 ? 0 : botsActive);

                setLoading(false);
            } catch (err) {
                setError('Failed to fetch bots');
                setLoading(false);
            }
        };

        fetchBots();
        const interval = setInterval(fetchBots, 5000);

        return () => clearInterval(interval);
    }, []);

    const startBot = async (botName: string) => {
        try {
            const response = await fetch(`${apiUrl}/start-bot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: botName }),
            });
            if (!response.ok) {
                throw new Error('Failed to start bot');
            }
            const updatedBots = await fetch(`${apiUrl}/all-bots`).then(res => res.json());
            setBots(updatedBots);
        } catch (err) {
            setError('Failed to start bot');
        }
    };

    const stopBot = async (botName: string) => {
        try {
            const response = await fetch(`${apiUrl}/stop-bot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: botName }),
            });
            if (!response.ok) {
                throw new Error('Failed to stop bot');
            }
            const updatedBots = await fetch(`${apiUrl}/all-bots`).then(res => res.json());
            setBots(updatedBots);
        } catch (err) {
            setError('Failed to stop bot');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
                return 'text-green-800';
            case 'Error':
            case 'timeout of':
            case 'ERROR':
            case 'crashed after':
            case 'Session ended':
            case 'Manually stopped':
            case 'Breaking forever':
            case 'Stopped':
                return 'text-red-800';
            case 'Starting':
                return 'text-yellow-800';
            case 'Processing...':
                return 'text-blue-800';
            default:
                return 'text-gray-800';
        }
    };

    if (loading) return <div className='text-center p-4'>Loading...</div>;
    if (error) return <div className='text-center p-4 text-red-500'>Error: {error}</div>;

    return (
        <div className='container mx-auto p-4'>
            <div className='flex justify-between items-center mb-3'>
                <h1 className='text-2xl font-bold'>Bots List</h1>
                <p className='bg-yellow-100 text-xs text-yellow-800 p-2 rounded-md'>
                    <strong>Notice:</strong> No need to refresh the page! Logs are automatically updated every 5 seconds.
                </p>
            </div>

            <div className="mt-4 mb-3 w-full flex justify-start items-center gap-6">
                <p className="flex justify-start items-baseline gap-2">
                    <strong>Inactive Bots: </strong>  <span className='text-red-500'>{noOfInactiveBots}</span>
                </p>
                <p className="flex justify-start items-baseline gap-2">
                    <strong>Active Bots: </strong>  <span className='text-green-500'>{noOfActiveBots}</span>
                </p>
                <div className="flex-1">
                    {/* Button to open the popup */}
                    <button onClick={openPopup} className="bg-blue-500 text-white px-4 py-1 float-right rounded">
                        Add New Bot
                    </button>
                </div>
            </div>

            <table className='min-w-full bg-white border border-gray-300 rounded-lg shadow-md'>
                <thead className='bg-gray-100 border-b'>
                    <tr>
                        <th className='px-4 py-3 text-start tracking-wider border-b'>Sr. #</th>
                        <th className='py-2 px-4 text-start border-b'>Bot Name</th>
                        <th className='py-2 px-4 text-start border-b'>Status</th>
                        <th className='hidden py-2 px-4 text-start border-b'>Post Count</th>
                        <th className='py-2 px-4 text-start border-b'>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {bots.map((bot, index) => (
                        <tr key={bot.name}>
                            <td className='px-4 py-2 whitespace-nowrap text-gray-700 border-b'>{index + 1}</td>
                            <td className='px-4 py-2 whitespace-nowrap text-blue-600 hover:underline cursor-pointer border-b'
                                onClick={() => window.open(`/logs/${bot.name}`, '_blank')}>
                                {bot.name}
                            </td>
                            <td className={`py-2 px-4 border-b font-semibold text-lg ${getStatusColor(bot.status)}`}>
                                {bot.status}
                            </td>
                            <td className='hidden py-2 px-4 border-b'>{bot.postCount}</td>
                            <td className='py-2 px-4 border-b'>
                                {bot.isRunning ? (
                                    <button onClick={() => stopBot(bot.name)} className='bg-red-500 text-white px-2 py-1 rounded'>
                                        Stop
                                    </button>
                                ) : (
                                    <button onClick={() => startBot(bot.name)} className='bg-green-500 text-white px-2 py-1 rounded'>
                                        Start
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="bot-status-explainations w-full border-t mt-6">
                <div className="mt-4 mb-3 w-full flex justify-start gap-6">
                    <p className="flex justify-start items-baseline border-b text-lg w-full gap-2">
                        <strong>Bot's Status Explained</strong>
                    </p>
                </div>
                <ul className="w-full">
                    {botStatusExplanations && botStatusExplanations.map(({ status, desc }, index) => (
                        <li key={index} className={`w-full flex justify-start items-baseline gap-2 py-1 border-b`}>
                            <p className="font-bold">{status}</p> <span>: </span>
                            <p className="font-semibold">{desc}</p>
                        </li>
                    ))
                    }
                </ul>
            </div>

            {/* Modals placement */}
            <UserModal />
            {/* Modals placement */}
        </div>
    );
};

export default BotsList;
