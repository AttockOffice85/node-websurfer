import React, { useState, useEffect } from 'react';

const BotList: React.FC = () => {
    const [bots, setBots] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBots = async () => {
            try {
                const response = await fetch('http://localhost:8080/all-bots'); // Adjust the API URL
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
    }, []);

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Bot List</h1>
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
                            <tr key={bot} className="hover:bg-gray-100 transition-colors duration-200">
                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{index + 1}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-blue-600 hover:underline cursor-pointer"
                                    onClick={() => window.open(`/logs/${bot}`, '_blank')}>
                                    {bot}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">Active</td> {/* Placeholder for Status */}
                                <td className="px-4 py-2 whitespace-nowrap text-gray-700">5</td> {/* Placeholder for No. of Posts */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BotList;
