import React from 'react';
import { usePopupLogsHandbookStore } from '../../../store/usePopupStore';
import { logDescriptions } from '../../../scripts/types';

const LogsHandbookModal: React.FC = () => {
    const { isOpen, closePopup } = usePopupLogsHandbookStore();

    /* -------------------------------------------- X ------------------------------------------- */

    if (!isOpen) return null;

    /* ------------------------------------------------------------------------------------------ */
    /*                                              X                                             */
    /* ------------------------------------------------------------------------------------------ */

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-700 bg-opacity-50 z-50">
            <div className="bg-white px-6 py-4 rounded-lg shadow-lg w-full max-w-4xl">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 className="text-xl font-bold">Logs Handbook</h2>
                    <button
                        type="button"
                        onClick={closePopup}
                        className="bg-red-500 text-white px-4 py-1 rounded"
                    >
                        X
                    </button>
                </div>
                <div className="overflow-y-auto max-h-[500px] space-y-4">
                    {logDescriptions.map((log, index) => (
                        <div key={index} className="border-b pb-2">
                            <h3 className="text-lg font-semibold">{log.title}</h3>
                            <p className="text-gray-700">{log.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LogsHandbookModal;
