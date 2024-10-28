import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LogsClient } from '../../api/LogsClient';

const BotInfo: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [logData, setLogData] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    /* ------------------------------------------------------------------------------------------ */
    /*                                         Fetch Logs                                         */
    /* ------------------------------------------------------------------------------------------ */

    const fetchLogs = async () => {
        try {
            const response = await LogsClient.fetchUserLogs(username || '');
            setLogData(response.logData);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch logs');
            setLoading(false);
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                              X                                             */
    /* ------------------------------------------------------------------------------------------ */

    const handleClearLogs = async () => {
        try {
            await LogsClient.clearLogs(username || '');
            fetchLogs();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clear logs');
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                              X                                             */
    /* ------------------------------------------------------------------------------------------ */

    const handleDownloadLogs = async () => {
        try {
            const blob = await LogsClient.downloadLogs(username || '');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${username}-logs.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download logs');
        }
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                                     Call The Functions                                     */
    /* ------------------------------------------------------------------------------------------ */

    useEffect(() => {
        fetchLogs();
        const intervalId = setInterval(fetchLogs, 3000);
        return () => clearInterval(intervalId);
    }, [username]);

    /* ------------------------------------------------------------------------------------------ */
    /*                                    Scroll To Bottom Logs                                   */
    /* ------------------------------------------------------------------------------------------ */

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logData]);

    if (loading) return <div className='text-center p-4'>Loading...</div>;
    if (error) return <div className='text-center p-4 text-red-500'>Error: {error}</div>;

    return (
        <div className='container mx-auto p-4'>
            <div className='flex justify-between items-center mb-3'>
                <h1 className='text-2xl font-bold'>Logs for {username}</h1>
                <p className='bg-yellow-100 text-xs text-yellow-800 p-2 rounded-md'>
                    <strong>Notice:</strong> No need to refresh the page! Logs are automatically updated every 3 seconds.
                </p>
            </div>
            <div id='console-logs' ref={logRef} className='bg-black/95 p-4 rounded-md border border-gray-300 overflow-x-auto'>
                <pre className='text-xs text-white'>
                    {logData}
                </pre>
            </div>
        </div>
    );
};

export default BotInfo;
