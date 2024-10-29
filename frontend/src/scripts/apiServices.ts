// src/scripts/apiServices.ts
const apiUrl: string | undefined = process.env.REACT_APP_API_URL;

export const addNewBot = async (formData: {
    email: string;
    password: string;
    ip_address?: string;
    ip_port?: string;
    ip_username?: string;
    ip_password?: string;
    platforms: { linkedin: boolean; instagram: boolean; facebook: boolean };
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

export const addNewCompany = async (formData: {
    company_name: string;
    company_link: string;
}) => {
    if (!apiUrl) {
        throw new Error('API URL is not defined');
    }

    try {
        const response = await fetch(`${apiUrl}/add-company`, {
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
