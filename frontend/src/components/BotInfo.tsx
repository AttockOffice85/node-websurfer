import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const BotInfo: React.FC = () => {
    const { username } = useParams<{ username: string }>(); // Get the username from the URL
    const [logData, setLogData] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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

        fetchLogs();
    }, [username]);

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Logs for {username}</h1>
            <p id='console-logs' className="bg-black/95 p-4 rounded-md border border-gray-300 overflow-x-auto">
                <pre className="text-xs text-white">
                    {logData}
                </pre>
            </p>
        </div>
    );
};

export default BotInfo;