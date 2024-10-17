// src/scripts/apiServices.ts
const apiUrl: string | undefined = process.env.REACT_APP_API_URL;

export const addNewBot = async (formData: {
    email: string;
    password: string;
    apiKey?: string;
    country?: string;
    city?: string;
}) => {
    if (!apiUrl) {
        throw new Error('API URL is not defined');
    }

    try {
        const response = await fetch(`${apiUrl}/add-bot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add bot');
        }

        const data = await response.json();
        console.log('Bot added successfully:', data);
        return data;
    } catch (error) {
        console.error('Error adding bot:', error);
        throw error;
    }
};
