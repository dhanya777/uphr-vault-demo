
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import { HealthDocument, Doctor, ChatMessage, HealthInsight, DocumentType, FamilyMember, InsurancePolicy } from '../types.ts';
import Header from '../components/Header.tsx';
import Modal from '../components/Modal.tsx';
import { Spinner, UploadIcon, ClipboardCopyIcon, CheckCircleIcon, BriefcaseIcon, ChartBarIcon, TrashIcon, SparklesIcon, LightBulbIcon, BellIcon, AlertIcon, ReceiptIcon, PrescriptionIcon, DocumentTextIcon, PlusCircleIcon, SendIcon } from '../components/icons.tsx';
import { auth } from '../firebase.ts';
// NOTE: The following services will be created to interact with the backend.
// For now, we will use mock data and simulate the calls.
// import { getDocuments, uploadDocument, ... } from '../services/firebaseService.ts';

// This is a temporary mock API to simulate the backend while it's being built.
// In a real implementation, this would be replaced by calls to firebaseService.
import { useMockApi } from '../hooks/useMockApi.ts';


type Tab = 'Dashboard' | 'AI Assistant' | 'Health Journey' | 'Insurance Co-Pilot' | 'Upload Document';
type Language = 'English' | 'Hindi' | 'Telugu' | 'Tamil' | 'Kannada';

// --- Sub-components for each tab view ---

const HealthSnapshotView: React.FC<{
  insights: HealthInsight[];
  isLoading: boolean;
  selectedFamilyMember: FamilyMember | null;
  language: Language;
  translate: (text: string, lang: Language) => Promise<string>;
}> = ({ insights, isLoading, selectedFamilyMember, language, translate }) => {
    const [translatedInsights, setTranslatedInsights] = useState<HealthInsight[]>([]);
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        const translateInsights = async () => {
            setIsTranslating(true);
            if (language === 'English') {
                setTranslatedInsights(insights);
                setIsTranslating(false);
                return;
            }
            const newTranslatedInsights = await Promise.all(
                insights.map(async (insight) => ({
                    ...insight,
                    title: await translate(insight.title, language),
                    description: await translate(insight.description, language),
                    recommendation: await translate(insight.recommendation, language),
                }))
            );
            setTranslatedInsights(newTranslatedInsights);
            setIsTranslating(false);
        };
        translateInsights();
    }, [insights, language, translate]);

    const vitalsInsight = translatedInsights.find(i => i.id === 'vitals-summary');
    const otherInsights = translatedInsights.filter(i => i.id !== 'vitals-summary');

    const VitalsCard: React.FC<{ insight: HealthInsight }> = ({ insight }) => (
        <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-bold text-gray-800 mb-3">{insight.title}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {insight.vitals && Object.entries(insight.vitals).map(([key, val]) => (
                    <div key={key}>
                        <p className="text-sm text-gray-500">{key}</p>
                        <p className="text-xl font-bold text-green-800">{val.value} <span className="text-sm font-normal text-gray-600">{val.unit}</span></p>
                    </div>
                ))}
            </div>
        </div>
    );

    const InsightCard: React.FC<{ insight: HealthInsight }> = ({ insight }) => {
        const severityColor = { Low: 'text-blue-500', Medium: 'text-yellow-500', High: 'text-red-500' }[insight.severity];
        return (
            <div className="flex items-start gap-3">
                <div className={`mt-1 ${severityColor}`}><AlertIcon className="h-5 w-5" /></div>
                <div>
                    <h4 className="font-semibold text-gray-800">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Health Snapshot for {selectedFamilyMember?.name}</h2>
            </div>
            {(isLoading || isTranslating) ? (
                <div className="text-center py-10"><Spinner className="h-8 w-8 mx-auto text-green-600" /></div>
            ) : insights.length > 0 ? (
                <div className="space-y-6">
                    {vitalsInsight && <VitalsCard insight={vitalsInsight} />}
                    {otherInsights.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            <h3 className="font-bold text-gray-800">Critical Insights</h3>
                            {otherInsights.map(insight => <InsightCard key={insight.id} insight={insight} />)}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
                    <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No Health Snapshot Available</h3>
                    <p className="mt-1 text-sm text-gray-500">Upload documents for {selectedFamilyMember?.name} to generate a snapshot.</p>
                </div>
            )}
        </div>
    );
};

const UploadDocumentView: React.FC<{
  isUploading: boolean;
  fileToUpload: File | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string;
  setSelectedFamilyMemberId: (id: string) => void;
}> = ({ isUploading, fileToUpload, onFileChange, onUpload, familyMembers, selectedFamilyMemberId, setSelectedFamilyMemberId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="max-w-lg mx-auto text-center">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Upload Medical Document</h2>
      <p className="text-gray-600 mb-6">Upload a document and assign it to a family member. Our AI will extract key information and add it to their health timeline.</p>
      
      <div className="space-y-4">
        <div>
            <label htmlFor="family-member-select" className="block text-sm font-medium text-gray-700 text-left mb-1">Select Family Member</label>
            <select
              id="family-member-select"
              value={selectedFamilyMemberId}
              onChange={e => setSelectedFamilyMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              {familyMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            className="hidden"
            accept="application/pdf,image/*"
            />
            <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
            >
            Choose File
            </button>
            {fileToUpload && <p className="mt-4 text-sm text-gray-500">Selected: {fileToUpload.name}</p>}
        </div>
      </div>

      <button
        disabled={isUploading || !fileToUpload}
        onClick={onUpload}
        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:bg-green-300"
      >
        {isUploading ? <Spinner className="h-5 w-5" /> : <UploadIcon className="h-5 w-5" />}
        {isUploading ? 'AI is Analyzing...' : 'Upload & Process'}
      </button>
    </div>
  );
};

const AiAssistantView: React.FC<{
    getHealthInsights: (docs: HealthDocument[]) => Promise<HealthInsight[]>;
    getAIChatResponse: (message: string, documents: HealthDocument[]) => Promise<string>;
    onPrepareForVisit: (docs: HealthDocument[]) => void;
    documents: HealthDocument[];
    selectedFamilyMember: FamilyMember | null;
}> = ({ getHealthInsights, getAIChatResponse, onPrepareForVisit, documents, selectedFamilyMember }) => {
    const [insights, setInsights] = useState<HealthInsight[]>([]);
    const [isLoadingInsights, setIsLoadingInsights] = useState(true);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiReplying, setIsAiReplying] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoadingInsights(true);
            const fetchedInsights = await getHealthInsights(documents);
            setInsights(fetchedInsights.filter(i => i.id !== 'vitals-summary'));
            setIsLoadingInsights(false);
        };
        if (documents.length > 0) {
            fetchInsights();
        } else {
            setIsLoadingInsights(false);
            setInsights([]);
        }
    }, [getHealthInsights, documents]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isAiReplying) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: chatInput,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };

        setChatHistory(prev => [...prev, userMessage]);
        setChatInput('');
        setIsAiReplying(true);

        const aiResponseText = await getAIChatResponse(chatInput, documents);

        const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            text: aiResponseText,
            sender: 'ai',
            timestamp: new Date().toISOString(),
        };

        setChatHistory(prev => [...prev, aiMessage]);
        setIsAiReplying(false);
    };

    const InsightIcon = ({ category }: { category: HealthInsight['category'] }) => {
        switch (category) {
            case 'Trend': return <ChartBarIcon className="h-6 w-6 text-blue-500" />;
            case 'Interaction': return <AlertIcon className="h-6 w-6 text-red-500" />;
            case 'Reminder': return <BellIcon className="h-6 w-6 text-yellow-500" />;
            case 'Observation': return <LightBulbIcon className="h-6 w-6 text-purple-500" />;
            case 'Insurance': return <BriefcaseIcon className="h-6 w-6 text-indigo-500" />;
            default: return <SparklesIcon className="h-6 w-6 text-gray-500" />;
        }
    };

    const InsightCard: React.FC<{ insight: HealthInsight }> = ({ insight }) => {
        const severityColor = { Low: 'border-blue-500', Medium: 'border-yellow-500', High: 'border-red-500' }[insight.severity];
        return (
            <div className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${severityColor}`}>
                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <InsightIcon category={insight.category} />
                        <div>
                            <h4 className="font-bold text-gray-800">{insight.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-dashed">
                        <p className="text-sm text-gray-800"><span className="font-semibold">Recommendation:</span> {insight.recommendation}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">AI Health Assistant for {selectedFamilyMember?.name}</h2>
                    <p className="text-gray-600">Proactive insights and conversational AI.</p>
                </div>
                <button 
                    onClick={() => onPrepareForVisit(documents)}
                    disabled={documents.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:bg-blue-300"
                >
                    <BriefcaseIcon className="h-5 w-5" />
                    Prepare for Doctor's Visit
                </button>
            </div>

            {isLoadingInsights ? (
                <div className="text-center py-10"><Spinner className="h-8 w-8 mx-auto text-green-600" /></div>
            ) : insights.length > 0 ? (
                <div className="space-y-4">
                    {insights.map(insight => <InsightCard key={insight.id} insight={insight} />)}
                </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                    <SparklesIcon className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No insights yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Upload more documents for the AI to find trends and insights.</p>
                </div>
            )}

            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Chat with your Assistant</h3>
                <div className="border rounded-lg h-[32rem] flex flex-col bg-gray-50">
                    <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                        {chatHistory.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400">Ask a question about {selectedFamilyMember?.name}'s health records.</div>
                        ) : (
                            chatHistory.map(msg => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>}
                                <div className={`max-w-lg px-4 py-2 rounded-xl ${msg.sender === 'user' ? 'bg-green-600 text-white' : 'bg-white shadow-sm'}`}>
                                <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                            ))
                        )}
                        {isAiReplying && (
                            <div className="flex items-end gap-2 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>
                            <div className="max-w-lg px-4 py-2 rounded-xl bg-white shadow-sm">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                </div>
                            </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="border-t p-4 flex items-center bg-white">
                        <input type="text" placeholder="Ask anything..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isAiReplying} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" />
                        <button type="submit" disabled={isAiReplying || !chatInput.trim()} className="ml-4 p-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 disabled:bg-green-300 transition-colors flex-shrink-0">
                            <SendIcon className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const HealthJourneyView: React.FC<{ documents: HealthDocument[], onViewDetails: (doc: HealthDocument) => void, selectedFamilyMember: FamilyMember | null }> = ({ documents, onViewDetails, selectedFamilyMember }) => {
  
  const getIcon = (docType: DocumentType) => {
    switch (docType) {
      case 'Lab Report': return <DocumentTextIcon className="h-6 w-6 text-green-700" />;
      case 'Receipt': return <ReceiptIcon className="h-6 w-6 text-blue-700" />;
      case 'Prescription': return <PrescriptionIcon className="h-6 w-6 text-purple-700" />;
      default: return <DocumentTextIcon className="h-6 w-6 text-gray-700" />;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Health Journey for {selectedFamilyMember?.name}</h2>
      <p className="text-gray-600 mb-8">A visual timeline of health events. Click on any point to see the details.</p>
      
      {documents.length > 0 ? (
        <div className="relative pl-4">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true"></div>
          <div className="space-y-12">
            {documents.map((doc) => (
              <div key={doc.id} className="relative">
                <div className="absolute left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-green-600 rounded-full"></div>
                <div className="ml-16">
                  <button 
                    onClick={() => onViewDetails(doc)} 
                    className="w-full text-left p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200"
                    aria-label={`View details for ${doc.reportType} on ${new Date(doc.timestamp).toLocaleDateString()}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        {getIcon(doc.documentType)}
                      </div>
                      <div>
                        <p className="font-bold text-green-800">{doc.reportType}</p>
                        <p className="text-sm text-gray-500">{new Date(doc.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-gray-600 mt-1">{doc.hospital}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Upload documents for {selectedFamilyMember?.name} to see their health journey here!</p>
        </div>
      )}
    </div>
  );
};

const InsuranceCoPilotView: React.FC<{
    policy: InsurancePolicy | null;
    bills: HealthDocument[];
    onAnalyze: (bill: HealthDocument) => void;
    onDraftAppeal: (bill: HealthDocument) => void;
}> = ({ policy, bills, onAnalyze, onDraftAppeal }) => {
    if (!policy) {
        return (
            <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
                <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Insurance Co-Pilot</h3>
                <p className="mt-1 text-sm text-gray-500">Upload your insurance policy document to activate this feature.</p>
            </div>
        );
    }

    const ProgressBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => (
        <div>
            <div className="flex justify-between text-sm font-medium text-gray-600">
                <span>{label}</span>
                <span>₹{value.toLocaleString()} / ₹{max.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${(value / max) * 100}%` }}></div>
            </div>
        </div>
    );

    const getStatusChip = (status: HealthDocument['claimStatus']) => {
        const styles = {
            'Approved': 'bg-green-100 text-green-800',
            'Denied': 'bg-red-100 text-red-800',
            'Submitted': 'bg-blue-100 text-blue-800',
            'Appealed': 'bg-yellow-100 text-yellow-800',
            'Not Submitted': 'bg-gray-100 text-gray-800',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status || 'Not Submitted']}`}>{status}</span>;
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Insurance Co-Pilot</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-gray-50 mb-8">
                <div>
                    <h3 className="font-bold text-lg text-gray-800">{policy.providerName}</h3>
                    <p className="text-sm text-gray-500">Policy #: {policy.policyNumber}</p>
                </div>
                <div className="space-y-4">
                    <ProgressBar value={policy.deductible.individualMet} max={policy.deductible.individual} label="Individual Deductible" />
                    <ProgressBar value={policy.outOfPocketMax.individualMet} max={policy.outOfPocketMax.individual} label="Individual Out-of-Pocket Max" />
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-gray-800 mb-4">Your Medical Bills</h3>
                <div className="space-y-3">
                    {bills.length > 0 ? bills.map(bill => (
                        <div key={bill.id} className="p-4 border rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{bill.reportType} - ₹{bill.billingInfo?.totalAmount.toFixed(2)}</p>
                                <p className="text-sm text-gray-500">{new Date(bill.timestamp).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusChip(bill.claimStatus)}
                                {bill.claimStatus === 'Not Submitted' && <button onClick={() => onAnalyze(bill)} className="px-3 py-1 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Analyze</button>}
                                {bill.claimStatus === 'Denied' && <button onClick={() => onDraftAppeal(bill)} className="px-3 py-1 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Draft Appeal</button>}
                            </div>
                        </div>
                    )) : <p className="text-sm text-gray-500 text-center py-4">No bills found in your vault.</p>}
                </div>
            </div>
        </div>
    );
};


const PatientDashboard: React.FC<{ user: User }> = ({ user }) => {
  const { documents, doctors, familyMembers, insurancePolicy, isLoading, error, uploadAndProcessDocument, addFamilyMember, searchDoctors, addDoctor, revokeDoctor, getHealthInsights, getDoctorVisitSummary, analyzeBillWithInsurance, draftAppealLetter, translateText, getAIChatResponse } = useMockApi(user);
  
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>('');
  const [language, setLanguage] = useState<Language>('English');
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [selectedDocument, setSelectedDocument] = useState<HealthDocument | null>(null);
  const [isManageAccessModalOpen, setManageAccessModalOpen] = useState(false);
  const [isVisitSummaryModalOpen, setVisitSummaryModalOpen] = useState(false);
  const [isAddFamilyModalOpen, setAddFamilyModalOpen] = useState(false);
  const [isInsuranceModalOpen, setInsuranceModalOpen] = useState(false);
  const [insuranceModalContent, setInsuranceModalContent] = useState({ title: '', content: '' });
  const [isGenerating, setIsGenerating] = useState(false);

  const [visitSummary, setVisitSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [doctorSearchResults, setDoctorSearchResults] = useState<Omit<Doctor, 'accessLink' | 'createdAt' | 'familyMemberIds'>[]>([]);
  const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
  const [doctorToGrant, setDoctorToGrant] = useState<Omit<Doctor, 'accessLink' | 'createdAt' | 'familyMemberIds'> | null>(null);
  const [shareWithMemberIds, setShareWithMemberIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [newFamilyMemberName, setNewFamilyMemberName] = useState('');
  const [newFamilyMemberRel, setNewFamilyMemberRel] = useState<string>('Spouse');
  const [customRelationship, setCustomRelationship] = useState('');

  const [snapshotInsights, setSnapshotInsights] = useState<HealthInsight[]>([]);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(true);

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedFamilyMemberId) {
      setSelectedFamilyMemberId(familyMembers[0].id);
    }
  }, [familyMembers, selectedFamilyMemberId]);

  const filteredDocuments = useMemo(() => documents.filter(d => d.familyMemberId === selectedFamilyMemberId), [documents, selectedFamilyMemberId]);

  useEffect(() => {
    const fetchInsights = async () => {
        if (filteredDocuments.length > 0) {
            setIsSnapshotLoading(true);
            const insights = await getHealthInsights(filteredDocuments);
            setSnapshotInsights(insights);
            setIsSnapshotLoading(false);
        } else {
            setSnapshotInsights([]);
            setIsSnapshotLoading(false);
        }
    };
    fetchInsights();
  }, [filteredDocuments, getHealthInsights]);

  useEffect(() => {
    if (doctorSearchQuery.trim().length < 2) {
        setDoctorSearchResults([]);
        return;
    }
    const handler = setTimeout(async () => {
        setIsSearchingDoctors(true);
        const results = await searchDoctors(doctorSearchQuery);
        setDoctorSearchResults(results);
        setIsSearchingDoctors(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [doctorSearchQuery, searchDoctors]);

  const handleLogout = () => auth.signOut();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileToUpload(file);
    }
  };

  const handleUploadAndProcess = async () => {
    if (fileToUpload && selectedFamilyMemberId) {
      setIsUploading(true);
      await uploadAndProcessDocument(fileToUpload, selectedFamilyMemberId);
      setIsUploading(false);
      setFileToUpload(null);
      setActiveTab('Dashboard');
    }
  };

  const handleGrantAccess = async () => {
    if (!doctorToGrant || shareWithMemberIds.size === 0) return;
    await addDoctor(doctorToGrant, Array.from(shareWithMemberIds));
    setDoctorToGrant(null);
    setDoctorSearchQuery('');
    setDoctorSearchResults([]);
    setShareWithMemberIds(new Set());
  };

  const handleRevokeDoctor = async (doctorId: string) => {
    if (window.confirm("Are you sure you want to revoke this doctor's access?")) {
        await revokeDoctor(doctorId);
    }
  };

  const handlePrepareForVisit = async (docs: HealthDocument[]) => {
    setVisitSummaryModalOpen(true);
    setIsGeneratingSummary(true);
    const summary = await getDoctorVisitSummary(docs);
    setVisitSummary(summary);
    setIsGeneratingSummary(false);
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyMemberName.trim()) return;
    const finalRelationship = newFamilyMemberRel === 'Other' && customRelationship.trim() ? customRelationship.trim() : newFamilyMemberRel;
    await addFamilyMember(newFamilyMemberName, finalRelationship);
    setNewFamilyMemberName('');
    setNewFamilyMemberRel('Spouse');
    setCustomRelationship('');
    setAddFamilyModalOpen(false);
  };

  const handleAnalyzeBill = async (bill: HealthDocument) => {
    setInsuranceModalContent({ title: 'AI Pre-Claim Analysis', content: '' });
    setInsuranceModalOpen(true);
    setIsGenerating(true);
    const analysis = await analyzeBillWithInsurance(bill);
    setInsuranceModalContent(prev => ({ ...prev, content: analysis }));
    setIsGenerating(false);
  };

  const handleDraftAppeal = async (bill: HealthDocument) => {
    setInsuranceModalContent({ title: 'AI-Generated Appeal Letter Draft', content: '' });
    setInsuranceModalOpen(true);
    setIsGenerating(true);
    const draft = await draftAppealLetter(bill);
    setInsuranceModalContent(prev => ({ ...prev, content: draft }));
    setIsGenerating(false);
  };

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy link automatically:', err);
      alert('Automatic copy failed. Please copy the link manually.');
    }
  };

  const handleMemberIdCheckbox = (memberId: string) => {
    setShareWithMemberIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(memberId)) {
            newSet.delete(memberId);
        } else {
            newSet.add(memberId);
        }
        return newSet;
    });
  };

  const selectedFamilyMember = useMemo(() => familyMembers.find(m => m.id === selectedFamilyMemberId) || null, [familyMembers, selectedFamilyMemberId]);

  const renderContent = () => {
    if (isLoading) {
        return <div className="text-center py-10"><Spinner className="h-8 w-8 mx-auto text-green-600" /></div>
    }
    switch (activeTab) {
      case 'Dashboard':
        return <HealthSnapshotView insights={snapshotInsights} isLoading={isSnapshotLoading} selectedFamilyMember={selectedFamilyMember} translate={translateText} language={language} />;
      case 'Upload Document':
        return <UploadDocumentView 
          isUploading={isUploading}
          fileToUpload={fileToUpload}
          onFileChange={handleFileChange}
          onUpload={handleUploadAndProcess}
          familyMembers={familyMembers}
          selectedFamilyMemberId={selectedFamilyMemberId}
          setSelectedFamilyMemberId={setSelectedFamilyMemberId}
        />;
      case 'AI Assistant':
        return <AiAssistantView getHealthInsights={getHealthInsights} getAIChatResponse={getAIChatResponse} onPrepareForVisit={handlePrepareForVisit} documents={filteredDocuments} selectedFamilyMember={selectedFamilyMember} />;
      case 'Health Journey':
        return <HealthJourneyView documents={filteredDocuments} onViewDetails={setSelectedDocument} selectedFamilyMember={selectedFamilyMember} />;
      case 'Insurance Co-Pilot':
        return <InsuranceCoPilotView policy={insurancePolicy} bills={documents.filter(d => d.documentType === 'Receipt')} onAnalyze={handleAnalyzeBill} onDraftAppeal={handleDraftAppeal} />;
      default:
        return <HealthSnapshotView insights={snapshotInsights} isLoading={isSnapshotLoading} selectedFamilyMember={selectedFamilyMember} translate={translateText} language={language} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onShare={() => setManageAccessModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
      />
      
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 p-4 bg-white rounded-xl shadow-lg">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Family Hub</h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {familyMembers.map(member => (
                    <button key={member.id} onClick={() => setSelectedFamilyMemberId(member.id)} className={`flex-shrink-0 text-center p-2 rounded-lg transition-colors ${selectedFamilyMemberId === member.id ? 'bg-green-100' : 'hover:bg-gray-100'}`}>
                        <img src={member.photoURL} alt={member.name} className={`w-16 h-16 rounded-full mx-auto border-4 ${selectedFamilyMemberId === member.id ? 'border-green-500' : 'border-transparent'}`} />
                        <p className={`mt-2 text-sm font-semibold ${selectedFamilyMemberId === member.id ? 'text-green-800' : 'text-gray-700'}`}>{member.name}</p>
                        <p className="text-xs text-gray-500">{member.relationship}</p>
                    </button>
                ))}
                <button onClick={() => setAddFamilyModalOpen(true)} className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <PlusCircleIcon className="h-10 w-10" />
                    <span className="text-sm mt-1">Add New</span>
                </button>
            </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {renderContent()}
        </div>
      </main>

      <footer className="text-center py-4 text-sm text-gray-500">
        © {new Date().getFullYear()} UPHR-Vault. All rights reserved.
      </footer>

      <Modal isOpen={!!selectedDocument} onClose={() => setSelectedDocument(null)} title={selectedDocument?.reportType || 'Document Details'}>
        {selectedDocument && (
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700">Patient Summary</h4>
              <p className="text-gray-600 mt-1">{selectedDocument.patientSummary}</p>
            </div>
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
            {selectedDocument.billingInfo && (
                <div>
                    <h4 className="font-semibold text-gray-700">Billing Details</h4>
                    <div className="flex justify-between items-center mt-2 p-2 bg-gray-50 rounded-md">
                        <span className="font-medium">Total Amount:</span>
                        <span className="font-bold">₹{selectedDocument.billingInfo.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={isManageAccessModalOpen} onClose={() => { setManageAccessModalOpen(false); setDoctorToGrant(null); setDoctorSearchQuery(''); }}>
        <div className="space-y-6">
            {!doctorToGrant ? (
                <>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Grant New Access</h3>
                        <div className="relative">
                            <input type="text" placeholder="Search for a doctor by name or hospital..." value={doctorSearchQuery} onChange={e => setDoctorSearchQuery(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" />
                            {isSearchingDoctors && <Spinner className="h-5 w-5 absolute right-3 top-2.5 text-gray-400" />}
                            {doctorSearchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {doctorSearchResults.map(doc => (
                                        <button key={doc.id} onClick={() => setDoctorToGrant(doc)} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                                            <p className="font-semibold">{doc.name}</p>
                                            <p className="text-sm text-gray-500">{doc.hospital} - {doc.specialty}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Active Access</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {doctors.length > 0 ? doctors.map(doctor => (
                                <div key={doctor.id} className="p-3 border rounded-lg bg-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800">{doctor.name}</p>
                                            <p className="text-sm text-gray-500">{doctor.hospital}</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {doctor.familyMemberIds.map(id => {
                                                    const member = familyMembers.find(m => m.id === id);
                                                    return <span key={id} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">{member?.name.split(' ')[0]}</span>
                                                })}
                                            </div>
                                        </div>
                                        <button onClick={() => handleRevokeDoctor(doctor.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-3">
                                        <input type="text" readOnly value={doctor.accessLink} className="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded-md text-xs" />
                                        <button onClick={() => copyToClipboard(doctor.accessLink)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
                                            {copiedLink === doctor.accessLink ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <ClipboardCopyIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-sm text-gray-500 py-4">No doctors have been granted access yet.</p>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Share with {doctorToGrant.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">Select which family members' data you want to share with Dr. {doctorToGrant.name.split(' ').pop()}.</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md">
                        {familyMembers.map(member => (
                            <label key={member.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                                <input type="checkbox" onChange={() => handleMemberIdCheckbox(member.id)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                <img src={member.photoURL} alt={member.name} className="w-8 h-8 rounded-full mx-3" />
                                <span className="text-sm font-medium text-gray-700">{member.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-6">
                        <button onClick={() => setDoctorToGrant(null)} className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Back</button>
                        <button onClick={handleGrantAccess} disabled={shareWithMemberIds.size === 0} className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-green-300">Grant Access</button>
                    </div>
                </div>
            )}
        </div>
      </Modal>

      <Modal isOpen={isVisitSummaryModalOpen} onClose={() => setVisitSummaryModalOpen(false)} title="Doctor's Visit Brief">
        {isGeneratingSummary ? (
            <div className="text-center py-10">
                <Spinner className="h-8 w-8 mx-auto text-green-600" />
                <p className="mt-2 text-gray-600">AI is preparing your summary...</p>
            </div>
        ) : (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: visitSummary.replace(/### (.*)/g, '<h3 class="font-bold text-gray-800">$1</h3>').replace(/\n/g, '<br />') }}></div>
        )}
      </Modal>

      <Modal isOpen={isAddFamilyModalOpen} onClose={() => setAddFamilyModalOpen(false)} title="Add New Family Member">
        <form onSubmit={handleAddFamilyMember} className="space-y-4">
            <div>
                <label htmlFor="member-name" className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" id="member-name" value={newFamilyMemberName} onChange={e => setNewFamilyMemberName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
            </div>
            <div>
                <label htmlFor="member-relationship" className="block text-sm font-medium text-gray-700">Relationship</label>
                <select
                    id="member-relationship"
                    value={newFamilyMemberRel}
                    onChange={e => setNewFamilyMemberRel(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                    <option>Spouse</option>
                    <option>Child</option>
                    <option>Parent</option>
                    <option>Sibling</option>
                    <option>Grandparent</option>
                    <option>Grandchild</option>
                    <option>Other</option>
                </select>
            </div>
            {newFamilyMemberRel === 'Other' && (
                 <div>
                    <label htmlFor="custom-relationship" className="block text-sm font-medium text-gray-700">Custom Relationship (Optional)</label>
                    <input type="text" id="custom-relationship" value={customRelationship} onChange={e => setCustomRelationship(e.target.value)} placeholder="e.g., Guardian, Cousin" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" />
                </div>
            )}
            <button type="submit" className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all">
                Add Member
            </button>
        </form>
      </Modal>

      <Modal isOpen={isInsuranceModalOpen} onClose={() => setInsuranceModalOpen(false)} title={insuranceModalContent.title}>
        {isGenerating ? (
            <div className="text-center py-10">
                <Spinner className="h-8 w-8 mx-auto text-green-600" />
                <p className="mt-2 text-gray-600">AI is working its magic...</p>
            </div>
        ) : (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: insuranceModalContent.content.replace(/### (.*)/g, '<h3 class="font-bold text-gray-800">$1</h3>').replace(/\n/g, '<br />') }}></div>
        )}
      </Modal>
    </div>
  );
};

export default PatientDashboard;
