import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const BotInfo: React.FC = () => {
    const { username } = useParams<{ username: string }>(); // Get the username from the URL
    const [logData, setLogData] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement | null>(null);

    const fetchLogs = async () => {
        try {
            const response = await fetch(`http://localhost:8080/logs/${username}`); // Adjust the API URL
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            const data = await response.text();
            setLogData(data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch logs');
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchLogs();

        // Fetch logs every 3 seconds
        const intervalId = setInterval(() => {
            fetchLogs();
        }, 3000);

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, [username]);

    // Scroll to the bottom of the logs when logData updates
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight; // Scroll to the bottom
        }
    }, [logData]);

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-3">
                <h1 className="text-2xl font-bold">Logs for {username}</h1>
                <p className="bg-yellow-100 text-xs text-yellow-800 p-2 rounded-md">
                    <strong>Notice:</strong> No need to refresh the page! Logs are automatically updated every 3 seconds.
                </p>
            </div>
            <div id='console-logs' ref={logRef} className="bg-black/95 p-4 rounded-md border border-gray-300 overflow-x-auto">
                <pre className="text-xs text-white">
                    {logData}
                </pre>
            </div>
        </div>
    );
};

export default BotInfo;
