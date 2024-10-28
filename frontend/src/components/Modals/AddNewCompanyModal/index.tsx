import React, { useState } from 'react';
import { usePopupCompanyFormStore } from '../../../store/usePopupStore';
import { companyFormSchema } from '../../../zodSchemas/validationSchema';
import { CompaniesClient } from '../../../api/CompaniesClient';
import { responseMessage } from '../../../scripts/types';

const AddNewCompanyModal: React.FC = () => {
    const { isOpen, closePopup } = usePopupCompanyFormStore();
    const [formData, setFormData] = useState({
        company_name: '',
        company_link: ''
    });
    const [zodErrors, setZodErrors] = useState<{ company_name?: string; company_link?: string }>({});
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

    /* ------------------------------------------------------------------------------------------ */
    /*                             Handle Add New Company Form Submit                             */
    /* ------------------------------------------------------------------------------------------ */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDisableSubmitBtn(true);

        const result = companyFormSchema.safeParse(formData);
        if (!result.success) {
            const formErrors: { company_name?: string; company_link?: string } = {};
            result.error.errors.forEach((error) => {
                formErrors[error.path[0] as 'company_name' | 'company_link'] = error.message;
            });
            setZodErrors(formErrors);
            setTimeout(() => {
                setDisableSubmitBtn(false);
            }, 5000);
            return;
        }

        setZodErrors({});

        try {
            const response = await CompaniesClient.addNewCompany(formData);

            if ('error' in response) {
                setResMsg({ type: false, status: 'Error', descrip: response.error });
            } else {
                setResMsg({ type: true, status: 'Success', descrip: response.status });
            }
        } catch (error) {
            setResMsg({
                type: false,
                status: 'Error',
                descrip: 'An error occurred while adding the company'
            });
            console.error('Error submitting form:', error);
        } finally {
            setTimeout(() => {
                closePopup();
                setFormData({ company_name: '', company_link: '' });
                setResMsg(null);
                setDisableSubmitBtn(false);
            }, 8000);
        }
    };

    /* -------------------------------------------- X ------------------------------------------- */

    if (!isOpen) return null;

    /* ------------------------------------------------------------------------------------------ */
    /*                                              X                                             */
    /* ------------------------------------------------------------------------------------------ */

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-700 bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
                <div className="flex justify-between items-end border-b py-1.5 mb-2.5">
                    <h2 className="text-xl font-bold m-0">Add New Company...</h2>
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
                    <h6 className="text-lg font-semibold">LinkedIn's Company Profile</h6>
                    <div className="mb-4">
                        <label className="block font-bold mb-1">Company Name</label>
                        <input
                            name="company_name"
                            type="text"
                            value={formData.company_name}
                            onChange={handleChange}
                            className="border p-2 w-full"
                        />
                        {zodErrors.company_name && (
                            <p className="text-red-500">{zodErrors.company_name}</p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block font-bold mb-1">Company Link</label>
                        <input
                            name="company_link"
                            type="text"
                            value={formData.company_link}
                            onChange={handleChange}
                            className="border p-2 w-full"
                        />
                        {zodErrors.company_link && (
                            <p className="text-red-500">{zodErrors.company_link}</p>
                        )}
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            type="submit"
                            disabled={disableSubmitBtn}
                            className={`bg-blue-500 text-white px-4 py-2 rounded ${disableSubmitBtn ? 'bg-blue-400 cursor-not-allowed' : ''}`}
                        >
                            Add new company
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddNewCompanyModal;