import React, { useState } from 'react';
import { usePopupUserFormStore } from '../../../store/usePopupStore';
import { userFormSchema } from '../../../zodSchemas/validationSchema';
import { BotsClient } from '../../../api/BotsClient';
import { responseMessage } from '../../../scripts/types';

const AddBotModal: React.FC = () => {
    const { isOpen, closePopup } = usePopupUserFormStore();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        ip_address: '',
        ip_port: '',
        ip_username: '',
        ip_password: ''
    });
    const [platforms, setPlatforms] = useState({
        linkedin: true, instagram: false, facebook: false,
    });
    const [zodErrors, setZodErrors] = useState<{ email?: string; password?: string }>({});
    const [resMsg, setResMsg] = useState<responseMessage | null>(null);
    const [disableSubmitBtn, setDisableSubmitBtn] = useState<boolean>(false);

    /* ------------------------------------------------------------------------------------------ */
    /*                                   Handle Change Of Fields                                  */
    /* ------------------------------------------------------------------------------------------ */

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handlePlatformChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setPlatforms((prev) => ({ ...prev, [name]: checked }));
    };

    /* ------------------------------------------------------------------------------------------ */
    /*                               Handle Add New Bot Form Submit                               */
    /* ------------------------------------------------------------------------------------------ */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDisableSubmitBtn(true);

        if (!platforms.linkedin) {
            setResMsg({ type: false, status: 'Error', descrip: 'LinkedIn is required.' });
            setDisableSubmitBtn(false);
            return;
        }

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
            return;
        }

        setZodErrors({});

        try {
            const response = await BotsClient.addNewBot({ ...formData, platforms });

            if ('error' in response) {
                setResMsg({ type: false, status: 'Error', descrip: response.error });
            } else {
                setResMsg({ type: true, status: 'Success', descrip: response.status });
            }
        } catch (error) {
            setResMsg({
                type: false,
                status: 'Error',
                descrip: 'An error occurred while adding the bot'
            });
            console.error('Error submitting form:', error);
        } finally {
            setTimeout(() => {
                closePopup();
                setFormData({
                    email: '',
                    password: '',
                    ip_address: '',
                    ip_port: '',
                    ip_username: '',
                    ip_password: ''
                });
                setPlatforms({ linkedin: true, instagram: false, facebook: false });
                setResMsg(null);
                setDisableSubmitBtn(false);
            }, 5000);
        }
    };

    /* -------------------------------------------- X ------------------------------------------- */

    if (!isOpen) return null;

    /* ------------------------------------------------------------------------------------------ */
    /*                                              X                                             */
    /* ------------------------------------------------------------------------------------------ */

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-700 bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
                <div className="flex justify-between items-end border-b py-1.5 mb-2.5">
                    <h2 className="text-xl font-bold m-0">Add New Bot...</h2>
                    <button
                        type="button"
                        onClick={closePopup}
                        className="bg-red-500 text-white px-4 py-1 rounded"
                    >
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
                    <h6 className="text-lg font-semibold">Bot's Info</h6>
                    <div className="mb-4">
                        <label className="block font-bold mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
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
                        <label className="block font-bold mb-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="border p-2 w-full"
                        />
                        {zodErrors.password && <p className="text-red-500">{zodErrors.password}</p>}
                    </div>

                    <div className="mb-4">
                        <span className="font-bold mr-2.5">Platforms:</span>
                        <div className="inline-flex justify-start items-center gap-2.5">
                            <span>
                                <input type="checkbox" name="linkedin" id="linkedin" checked={platforms.linkedin} onChange={handlePlatformChange} disabled />&nbsp;
                                <label htmlFor='linkedin' className='font-semibold text-sm'>LinkedIn</label>
                            </span>
                            <span>
                                <input type="checkbox" name="instagram" id="instagram" checked={platforms.instagram} onChange={handlePlatformChange} />&nbsp;
                                <label htmlFor='instagram' className='font-semibold text-sm'>Instagram</label>
                            </span>
                            <span>
                                <input type="checkbox" name="facebook" id="facebook" checked={platforms.facebook} onChange={handlePlatformChange} />&nbsp;
                                <label htmlFor='facebook' className='font-semibold text-sm'>Facebook</label>
                            </span>
                        </div>
                    </div>

                    <h6 className="text-lg font-semibold">
                        Proxy Info <strong className='italic text-xs'>(not required. bot will run on default IP address)</strong>
                    </h6>

                    <div className="flex justify-between gap-2 items-center">
                        <div className="mb-4 w-4/5">
                            <label className="block font-bold mb-1">IP Address</label>
                            <input
                                name="ip_address"
                                type="text"
                                value={formData.ip_address}
                                onChange={handleChange}
                                className="border p-2 w-full"
                            />
                        </div>
                        <div className="mb-4 w-1/5">
                            <label className="block font-bold mb-1">Port</label>
                            <input
                                name="ip_port"
                                type="text"
                                value={formData.ip_port}
                                onChange={handleChange}
                                className="border p-2 w-full"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between gap-2 items-center">
                        <div className="mb-4 w-3/5">
                            <label className="block font-bold mb-1">IP Username</label>
                            <input
                                name="ip_username"
                                type="text"
                                value={formData.ip_username}
                                onChange={handleChange}
                                className="border p-2 w-full"
                            />
                        </div>

                        <div className="mb-4 w-2/5">
                            <label className="block font-bold mb-1">IP Password</label>
                            <input
                                name="ip_password"
                                type="text"
                                value={formData.ip_password}
                                onChange={handleChange}
                                className="border p-2 w-full"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            type="submit"
                            disabled={disableSubmitBtn}
                            className={`bg-blue-500 text-white px-4 py-2 rounded ${disableSubmitBtn ? 'bg-blue-400 cursor-not-allowed' : ''}`}
                        >
                            Add and Start Bot
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddBotModal;