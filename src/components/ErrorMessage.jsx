import React from 'react';
import { XCircle, X } from 'lucide-react'; // Sử dụng icon từ thư viện lucide-react

const ErrorMessage = ({ message, description, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 animate-fade-in-down">
            <div className="flex items-start">
                {/* Icon Lỗi */}
                <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>

                {/* Nội dung thông báo */}
                <div className="ml-3 flex-1">
                    <p className="text-sm font-semibold text-red-800">
                        {message}
                    </p>
                    {description && (
                        <p className="mt-1 text-sm text-red-700 leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>

                {/* Nút Đóng (Close) */}
                {onClose && (
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            type="button"
                            className="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded"
                            onClick={onClose}
                        >
                            <span className="sr-only">Đóng</span>
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ErrorMessage;