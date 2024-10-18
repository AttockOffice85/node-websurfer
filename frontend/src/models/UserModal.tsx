// frontend\src\models\UserModal.tsx
import React, { useState } from 'react';
import { usePopupUserFormStore } from '../store/usePopupStore';
import { userFormSchema } from '../zodSchemas/validationSchema';
import { addNewBot } from '../scripts/apiServices';
import { responseMessage } from '../scripts/types';

const UserModal: React.FC = () => {
    const { isOpen, closePopup } = usePopupUserFormStore();
    const [formData, setFormData] = useState({ email: '', password: '', apiKey: '', country: '', city: '' });
    const [zodErrors, setZodErrors] = useState<{ email?: string; password?: string }>({});
    const [resMsg, setResMsg] = useState<responseMessage | null>(null); // Track the response message
    const [disableSubmitBtn, setDisableSubmitBtn] = useState<boolean>(false); // Track the response message

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDisableSubmitBtn(true);
        const result = userFormSchema.safeParse(formData);
        if (!result.success) {
            const formErrors: { email?: string; password?: string } = {};
            result.error.errors.forEach((error) => {
                formErrors[error.path[0] as 'email' | 'password'] = error.message;
            });
            setZodErrors(formErrors);
            setTimeout(() => {
                setDisableSubmitBtn(false);
            }, 5000);
        } else {
            setZodErrors({});
            try {
                const response = await addNewBot(formData);
                console.log('response::', response);

                // Use the exact message from the backend response
                if (response.error) {
                    setResMsg({ type: false, status: 'Error', descrip: response.error });
                } else {
                    setResMsg({ type: true, status: 'Success', descrip: response.status });
                }

            } catch (error) {
                setResMsg({ type: false, status: 'Error', descrip: 'An error occurred while adding the bot' });
                console.error('Error submitting form:', error);
            } finally {
                setTimeout(() => {
                    // if (resMsg && !resMsg.type) {
                    closePopup();
                    setFormData({ email: '', password: '', apiKey: '', country: '', city: '' });
                    setResMsg(null);
                    // }
                    setDisableSubmitBtn(false);
                }, 5000);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-700 bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
                <div className="flex justify-between items-end border-b py-1.5 mb-2.5">
                    <h2 className="text-xl font-bold m-0">Add New Bot...</h2>
                    <button type="button" onClick={closePopup} className="bg-red-500 text-white px-4 py-1 rounded">
                        X
                    </button>
                </div>

                {resMsg && (
                    <div className={`p-2 mb-4 rounded ${resMsg.type ? 'bg-green-200' : 'bg-red-200'}`}>
                        <p className="text-center text-sm font-semibold">
                            {resMsg.status}: {resMsg.descrip}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <h6 className="text-lg font-semibold">LinkedIn Info</h6>
                    <div className="mb-4">
                        <label className="block font-bold mb-1">Email</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="border p-2 w-full"
                        />
                        {zodErrors.email && <p className="text-red-500">{zodErrors.email}</p>}
                    </div>

                    <div className="mb-4">
                        <label className="block font-bold mb-1">Password</label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="border p-2 w-full"
                        />
                        {zodErrors.password && <p className="text-red-500">{zodErrors.password}</p>}
                    </div>

                    <h6 className="text-lg font-semibold">Other Info <strong className='italic text-xs'>(not required for now)</strong></h6>
                    <div className="mb-4">
                        <label className="block font-bold mb-1">API Key</label>
                        <input
                            name="apiKey"
                            type="text"
                            value={formData.apiKey}
                            onChange={handleChange}
                            className="border p-2 w-full bg-gray-200 cursor-not-allowed"
                            disabled
                        />
                    </div>

                    <div className="flex justify-between gap-2 items-center">
                        <div className="mb-4 w-3/5">
                            <label className="block font-bold mb-1">Country</label>
                            <input
                                name="country"
                                type="text"
                                value={formData.country}
                                onChange={handleChange}
                                className="border p-2 w-full bg-gray-200 cursor-not-allowed"
                                disabled
                            />
                        </div>

                        <div className="mb-4 w-2/5">
                            <label className="block font-bold mb-1">City</label>
                            <input
                                name="city"
                                type="text"
                                value={formData.city}
                                onChange={handleChange}
                                className="border p-2 w-full bg-gray-200 cursor-not-allowed"
                                disabled
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button type="submit" disabled={disableSubmitBtn} className={`bg-blue-500 text-white px-4 py-2 rounded ${disableSubmitBtn ? 'bg-blue-400 cursor-not-allowed' : ''}`}>
                            Add and Start Bot
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;