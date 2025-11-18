
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    photoURL: string;
}

export type DocumentType = 'Lab Report' | 'Prescription' | 'Receipt' | 'Clinical Note' | 'Scan Report' | 'Insurance Policy' | 'Claim Document' | 'Unknown';

export interface ExtractedValue {
  value: number | string;
  unit: string;
  ref: string;
  isAbnormal?: boolean;
}

export interface BillingInfo {
    totalAmount: number;
    items: { name: string; amount: number }[];
}

export type ClaimStatus = 'Not Submitted' | 'Submitted' | 'Approved' | 'Denied' | 'Appealed';

export interface HealthDocument {
  id: string;
  userId: string;
  familyMemberId: string;
  fileName:string;
  fileUrl: string;
  uploadedAt: string;
  documentType: DocumentType;
  reportType: string;
  hospital: string;
  extractedValues?: Record<string, ExtractedValue>;
  diagnosis?: string[];
  medications?: string[];
  abnormalities?: string[];
  patientSummary: string;
  doctorSummary: string;
  timestamp: string;
  billingInfo?: BillingInfo;
  claimStatus?: ClaimStatus;
}

export interface Doctor {
  id: string;
  name: string;
  hospital: string;
  specialty?: string;
  accessLink: string;
  createdAt: string;
  familyMemberIds: string[];
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

export interface HealthInsight {
    id: string;
    category: 'Trend' | 'Interaction' | 'Reminder' | 'Observation' | 'Insurance';
    severity: 'Low' | 'Medium' | 'High';
    title: string;
    description: string;
    recommendation: string;
    vitals?: Record<string, { value: string | number; unit: string }>;
}

export interface InsurancePolicy {
    id: string;
    userId: string;
    providerName: string;
    policyNumber: string;
    deductible: { individual: number; family: number; individualMet: number; familyMet: number; };
    outOfPocketMax: { individual: number; family: number; individualMet: number; familyMet: number; };
    coPay: { primary: number; specialist: number; emergency: number; };
}
