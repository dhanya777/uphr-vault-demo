
import React from 'react';
import { HealthDocument } from '../types.ts';
import { HospitalIcon, DocumentTextIcon, AlertIcon, ReceiptIcon, PrescriptionIcon } from './icons.tsx';

interface DocumentCardProps {
  document: HealthDocument;
  onViewDetails: (document: HealthDocument) => void;
  isDoctorView?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onViewDetails, isDoctorView = false }) => {
  const hasAbnormalities = document.abnormalities && document.abnormalities.length > 0;

  const getBorderColor = () => {
    switch (document.documentType) {
      case 'Lab Report':
        return hasAbnormalities ? 'border-red-500' : 'border-green-500';
      case 'Receipt':
        return 'border-blue-500';
      case 'Prescription':
        return 'border-purple-500';
      default:
        return 'border-gray-400';
    }
  };

  const getIcon = () => {
    switch (document.documentType) {
      case 'Lab Report':
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
      case 'Receipt':
        return <ReceiptIcon className="h-6 w-6 text-gray-500" />;
      case 'Prescription':
        return <PrescriptionIcon className="h-6 w-6 text-gray-500" />;
      default:
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const renderCardContent = () => {
    switch (document.documentType) {
      case 'Receipt':
        return (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Billing</h4>
            <div className="flex justify-between items-center mt-2 p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-800">Total Amount</span>
              <span className="text-xl font-bold text-blue-900">
                ₹{document.billingInfo?.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        );
      case 'Prescription':
        return (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Medications Prescribed</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {document.medications?.map((med, index) => (
                <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">{med}</span>
              ))}
            </div>
          </div>
        );
      case 'Lab Report':
        if (document.abnormalities && document.abnormalities.length > 0) {
          return (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Key Findings</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {document.abnormalities.map((ab, index) => (
                  <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">{ab}</span>
                ))}
              </div>
            </div>
          );
        }
        return null;
      default:
        return <p className="mt-4 text-sm text-gray-700 leading-relaxed">{isDoctorView ? document.doctorSummary : document.patientSummary}</p>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden fade-in">
      <div className={`p-5 border-l-4 ${getBorderColor()}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {getIcon()}
            <div>
              <p className="text-sm text-gray-500">{new Date(document.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <h3 className="text-lg font-bold text-gray-800 mt-1">{document.reportType}</h3>
            </div>
          </div>
          {document.documentType === 'Lab Report' && hasAbnormalities && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0">
              <AlertIcon className="h-4 w-4" />
              <span>Abnormal</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-600">
          <HospitalIcon className="h-4 w-4" />
          <span>{document.hospital}</span>
        </div>
        
        {renderCardContent()}
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <button
          onClick={() => onViewDetails(document)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Full Details
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;
