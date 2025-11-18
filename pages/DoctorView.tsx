
import React, { useState, useEffect } from 'react';
import { useMockApi } from '../hooks/useMockApi.ts';
import DocumentCard from '../components/ReportCard.tsx';
import Modal from '../components/Modal.tsx';
import { Spinner, AlertIcon } from '../components/icons.tsx';
import { HealthDocument } from '../types.ts';

interface DoctorViewProps {
  token: string;
}

const DoctorView: React.FC<DoctorViewProps> = ({ token }) => {
  const { getDoctorViewData } = useMockApi(null); // No user context needed for doctor view
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<HealthDocument | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const data = await getDoctorViewData(token);
      if (data) {
        setDocuments(data.documents);
        setPatientName(data.patientName);
      } else {
        setError("Access denied. This link may be invalid or expired.");
      }
      setIsLoading(false);
    };
    fetchData();
  }, [token, getDoctorViewData]);

  const DoctorHeader = () => (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-xl font-bold text-gray-800">UPHR-Vault</h1>
          </div>
          <div className="text-sm font-medium text-gray-500">Read-Only Doctor Portal</div>
        </div>
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <>
        <DoctorHeader />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
          <Spinner className="h-10 w-10 text-blue-600" />
          <p className="mt-4 text-gray-600">Verifying access and loading patient records...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <DoctorHeader />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center p-4">
          <AlertIcon className="h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <DoctorHeader />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Health Timeline for {patientName}</h2>
          <p className="mt-1 text-gray-600">This is a read-only view of the patient's medical history.</p>
        </div>

        <div className="space-y-8">
          {documents.map(doc => (
            <DocumentCard key={doc.id} document={doc} onViewDetails={setSelectedDocument} isDoctorView={true} />
          ))}
        </div>
      </main>

      <Modal isOpen={!!selectedDocument} onClose={() => setSelectedDocument(null)} title={selectedDocument?.reportType || 'Document Details'}>
        {selectedDocument && (
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700">Doctor's Summary</h4>
              <p className="text-gray-600 mt-1">{selectedDocument.doctorSummary}</p>
            </div>
            {selectedDocument.extractedValues && Object.keys(selectedDocument.extractedValues).length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700">Extracted Values</h4>
                <ul className="mt-2 space-y-1">
                  {Object.entries(selectedDocument.extractedValues).map(([key, val]) => (
                    <li key={key} className={`flex justify-between p-2 rounded-md ${val.isAbnormal ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <span className="font-medium text-gray-800">{key}</span>
                      <span className={val.isAbnormal ? 'text-red-600 font-bold' : 'text-gray-700'}>
                        {val.value} {val.unit} <span className="text-gray-400 text-xs">(Ref: {val.ref})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
             <div>
              <h4 className="font-semibold text-gray-700">Diagnoses</h4>
              <p className="text-gray-600 mt-1">{selectedDocument.diagnosis?.join(', ') || 'None specified'}</p>
            </div>
             <div>
              <h4 className="font-semibold text-gray-700">Medications</h4>
              <p className="text-gray-600 mt-1">{selectedDocument.medications?.join(', ') || 'None specified'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DoctorView;
