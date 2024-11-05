import React, { useState, useEffect } from 'react';
import { Bot, botStatusExplanations } from '../../scripts/types';
import { usePopupCompanyFormStore, usePopupUserFormStore } from '../../store/usePopupStore';
import UserModal from '../../components/Modals/AddBotModal';
import AddNewCompanyModal from '../../components/Modals/AddNewCompanyModal';
import { BotsClient } from '../../api/BotsClient';

const BotsList: React.FC = () => {
    /* ------------------------------------------------------------------------------------------ */
    /*                            State To Store The Clicked Bot Status                           */
    /* ------------------------------------------------------------------------------------------ */
    const [clickedStatus, setClickedStatus] = useState<string | null>(null);
    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [noOfInactiveBots, setNoOfInactiveBots] = useState<number>(0);
    const [noOfActiveBots, setNoOfActiveBots] = useState<number>(0);
    const [botsAttentionReq, setBotsAttentionReq] = useState<number>(0);
    const { openPopup } = usePopupUserFormStore();
    const { openPopup: companyPopup } = usePopupCompanyFormStore();

    /* ------------------------------------------------------------------------------------------ */
    /*                    Function To Get The Explanation Of The Clicked Status                   */
    /* ------------------------------------------------------------------------------------------ */
    const handleStatusClick = (status: string) => {
        setClickedStatus(status);
        setTimeout(() => { setClickedStatus(null); }, 2500);
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                      Get Status Color                                      */
    /* ------------------------------------------------------------------------------------------ */

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
            case '! log file':
                return 'text-red-600';
            case 'Captcha/Code':
            case 'IP Config':
            case 'paused':
                return 'text-xl italic animate-pulse text-white bg-red-600';
            case 'Starting':
                return 'text-yellow-800';
            case 'Processing...':
            case 'Entered hibernation':
                return 'text-blue-800';
            default:
                return 'text-gray-800';
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                         Fetch Bots                                         */
    /* ------------------------------------------------------------------------------------------ */

    const fetchBotsData = async () => {
        try {
            const data = await BotsClient.fetchBots();
            setBots(data.bots);
            setNoOfInactiveBots(data.inactiveBots);
            setNoOfActiveBots(data.activeBots);
            setBotsAttentionReq(data.attentionRequired);
            setError(null);
        } catch (err) {
            setError("Failed to fetch bots");
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                      Handle Start Bot                                      */
    /* ------------------------------------------------------------------------------------------ */

    const handleStartBot = async (botName: string) => {
        try {
            const updatedBots = await BotsClient.startBot(botName);
            setBots(updatedBots);
        } catch (err) {
            setError("Failed to start bot");
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                       Handle Stop Bot                                      */
    /* ------------------------------------------------------------------------------------------ */

    const handleStopBot = async (botName: string) => {
        try {
            const updatedBots = await BotsClient.stopBot(botName);
            setBots(updatedBots);
        } catch (err) {
            setError("Failed to stop bot");
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                       Handle Delete Bot                                      */
    /* ------------------------------------------------------------------------------------------ */

    const handleDeleteBot = async (botName: string) => {
        // Show a confirmation dialog
        const confirmDelete = window.confirm(`Are you sure you want to delete the bot: "${botName}"?`);
        if (confirmDelete) { // Proceed if the user confirms
            try {
                setLoading(true);
                await handleStopBot(botName);
                setTimeout(async () => {
                    const updatedBots = await BotsClient.deleteBot(botName);
                    setBots(updatedBots);
                    setLoading(false);
                }, 3000);
            } catch (err) {
                setError("Failed to stop bot");
            }
        } else {
            console.log("Bot deletion cancelled."); // Optional: log cancellation
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                     Call The Functions                                     */
    /* ------------------------------------------------------------------------------------------ */

    useEffect(() => {
        fetchBotsData();
        const interval = setInterval(fetchBotsData, 5000);
        return () => clearInterval(interval);
    }, []);

    /* ------------------------------------------------------------------------------------------ */
    /*                                              X                                             */
    /* ------------------------------------------------------------------------------------------ */

    if (error) return <div className='text-center p-4 text-red-500'>Error: {error}</div>;

    return (
        <div className='container mx-auto p-4'>

            {/* Modals placement */}
            <UserModal />

            <AddNewCompanyModal />

            {loading && <div className='w-full fixed z-50 h-full top-0 left-0 right-0 bottom-0 bg-gray-300/85 flex justify-center items-center'><p className="text-xl italic capitalize"><span className='animate-pulse'>loading...</span></p></div>}
            {/* Modals placement */}

            <div className='flex justify-between items-center mb-3'>
                <h1 className='text-2xl font-bold'>Bots List</h1>
                <p className='bg-yellow-100 text-xs text-yellow-800 p-2 rounded-md'>
                    <strong>Notice:</strong> No need to refresh the page! Status are automatically updated every 5 seconds.
                </p>
            </div>

            <div className="mt-4 mb-3 w-full flex justify-start items-center gap-6">
                <p className="flex justify-start items-baseline gap-2">
                    <strong>Inactive Bots: </strong>  <span className='text-red-500'>{noOfInactiveBots}</span>
                </p>
                <p className="flex justify-start items-baseline gap-2">
                    <strong>Active Bots: </strong>  <span className='text-green-500'>{noOfActiveBots}</span>
                </p>
                <p className="flex justify-start items-baseline gap-2">
                    <strong>Bots require attention: </strong>  <span className='text-blue-500'>{botsAttentionReq}</span>
                </p>
                <div className="flex-1 flex justify-end items-center gap-3.5">
                    {/* Button to open the openPopup */}
                    <button onClick={openPopup} className="bg-blue-500 text-white px-4 py-1 float-right rounded">
                        Add New Bot
                    </button>
                    {/* Button to open the companyPopup */}
                    <button onClick={companyPopup} className="bg-blue-500 text-white px-4 py-1 float-right rounded">
                        Add New Company
                    </button>
                </div>
            </div>

            <table id='bot-entries' className='min-w-full bg-white border border-gray-300 rounded-lg shadow-md'>
                <thead className='bg-gray-100 border-b'>
                    <tr>
                        <th className='px-4 py-3 text-start tracking-wider border-b'>Sr. #</th>
                        <th className='py-2 px-4 text-start border-b'>Bot Name</th>
                        <th className='py-2 px-4 text-start border-b'>Status</th>
                        <th className='py-2 px-4 text-start border-b'>Platform</th>
                        <th className='hidden py-2 px-4 text-start border-b'>Post Count</th>
                        <th className='py-2 px-4 text-start border-b'>IP Address</th>
                        <th className='py-2 px-4 text-start border-b'>IP Port</th>
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
                            <td className={`py-2 px-4 border-b font-semibold text-lg capitalize ${getStatusColor(bot.status)} cursor-pointer hover:underline underline-offset-4 relative`}
                                onClick={() => handleStatusClick(bot.status)}>
                                {bot.status}
                                {bot.inactiveSince && (
                                    <span className="absolute pl-3 left-0 right-0 w-full top-0 bottom-0 flex items-center text-start text-xs italic bg-white/90 opacity-0 transition-opacity duration-300 hover:opacity-100 text-black">
                                        (&nbsp;<strong>Since:</strong> {bot.inactiveSince}&nbsp;)
                                    </span>
                                )}
                            </td>
                            <td className='py-2 px-4 border-b capitalize'>{bot.platform}</td>
                            <td className='hidden py-2 px-4 border-b'>{bot.postCount}</td>
                            <td className='py-2 px-4 border-b'>{bot.ip_address}</td>
                            <td className='py-2 px-4 border-b'>{bot.ip_port}</td>
                            <td className='py-2 px-4 border-b flex gap-2'>
                                {bot.isRunning ? (
                                    <button onClick={() => handleStopBot(bot.name)} className='bg-red-500 text-white px-2 py-1 rounded'>
                                        Stop
                                    </button>
                                ) : (
                                    <button onClick={() => handleStartBot(bot.name)} className='bg-green-500 text-white px-2 py-1 rounded'>
                                        Start
                                    </button>
                                )}
                                <button onClick={() => handleDeleteBot(bot.name)} className='bg-red-500 text-white px-2 py-1 rounded'>
                                    Delete
                                </button>
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
                    {botStatusExplanations?.map(({ status, desc }, index) => (
                        <li key={index} className={`w-full flex gap-2 py-1 border-b px-1.5 ${clickedStatus?.toLocaleLowerCase() === status.toLocaleLowerCase() ? 'bg-blue-500/75 scale-150 absolute top-0 left-0 right-0 bottom-0 z-50 justify-center items-center' : 'justify-start items-baseline'}`}>
                            <p className="font-bold">{status}</p> <span>: </span>
                            <p className="font-semibold">{desc}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default BotsList;
