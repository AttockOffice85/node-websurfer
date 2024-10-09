import React, { useState, useEffect } from 'react';

interface Bot {
    name: string;
    status: string;
    postCount: number;
    inactiveSince?: string;
}

const BotsList: React.FC = () => {
    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBots = async () => {
            try {
                const response = await fetch('http://localhost:8080/all-bots');
                if (!response.ok) {
                    throw new Error('Failed to fetch bots');
                }
                const data = await response.json();
                setBots(data);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch bots');
                setLoading(false);
            }
        };

        fetchBots();
        // Set up an interval to fetch bots every 5 seconds
        const interval = setInterval(fetchBots, 5000);

        // Clean up the interval on component unmount
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-3">
                <h1 className="text-2xl font-bold">Bots List</h1>
                <p className="bg-yellow-100 text-xs text-yellow-800 p-2 rounded-md">
                    <strong>Notice:</strong> No need to refresh the page! Logs are automatically updated every 5 seconds.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr. No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bot Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Posts</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {bots.map((bot, index) => (
                            <tr key={bot.name} className="hover:bg-gray-100 transition-colors duration-200">
                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{index + 1}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-blue-600 hover:underline cursor-pointer"
                                    onClick={() => window.open(`/logs/${bot.name}`, '_blank')}>
                                    {bot.name}
                                </td>
                                <td className={`px-4 py-2 whitespace-nowrap ${bot.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                                    <p className='flex items-center gap-4'>
                                        {bot.status}
                                        {bot.inactiveSince && <span className="text-[10px] italic"> (&nbsp;<strong>Since:</strong> {bot.inactiveSince}&nbsp;)</span>}
                                    </p>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{bot.postCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BotsList;