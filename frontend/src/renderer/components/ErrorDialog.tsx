/**
 * Error Dialog Component
 * Displays user-friendly error messages with retry options
 * Requirements: 14.1-14.5
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorMessageProvider, ErrorMessage } from '../services/ErrorMessageProvider';

export interface ErrorDialogProps {
  error: Error | null;
  onClose: () => void;
  onRetry?: () => void;
}

/**
 * ErrorDialog displays error messages in a user-friendly format
 * Requirement 14.1: Display error messages for transaction failures
 * Requirement 14.2: Allow User to retry failed operations
 * Requirement 14.3: Display connection error when Blockchain_Node connection is lost
 */
export const ErrorDialog: React.FC<ErrorDialogProps> = ({ error, onClose, onRetry }) => {
  const { t } = useTranslation();
  if (!error) return null;

  const errorMessage: ErrorMessage = ErrorMessageProvider.getErrorMessage(error);
  const isRetryable = ErrorMessageProvider.isRetryable(error);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center">
          <svg
            className="w-6 h-6 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-bold">{errorMessage.title}</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Main message */}
          <div className="mb-4">
            <p className="text-gray-800 whitespace-pre-line">{errorMessage.message}</p>
          </div>

          {/* Actionable advice */}
          {errorMessage.actionable && (
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">{t('errors.remedy')}</h3>
                  <p className="mt-1 text-sm text-blue-700 whitespace-pre-line">
                    {errorMessage.actionable}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Technical details (collapsible) */}
          {errorMessage.technicalDetails && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                {t('errors.technicalDetails')}
              </summary>
              <div className="mt-2 bg-gray-100 rounded p-3">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                  {errorMessage.technicalDetails}
                </pre>
              </div>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          {isRetryable && onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('common.retry')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
