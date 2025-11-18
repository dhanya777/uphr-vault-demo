
import { useState, useEffect, useCallback } from 'react';
import { HealthDocument, Doctor, User, HealthInsight, FamilyMember, InsurancePolicy } from '../types.ts';
import { extractDataWithAI, generateHealthInsights, generateDoctorVisitSummary, translateText as realTranslateText, getAIChatResponse as realGetAIChatResponse } from '../services/geminiService.ts';

// MOCK DATABASE
const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
    { id: 'fam-1', name: 'Dhanya', relationship: 'father', photoURL: 'https://i.pravatar.cc/150?u=dhanya' },
    { id: 'fam-2', name: 'Krishna', relationship: 'self', photoURL: 'https://i.pravatar.cc/150?u=krishna' },
    { id: 'fam-3', name: 'lee', relationship: 'Child', photoURL: 'https://i.pravatar.cc/150?u=anika' },
];

const MOCK_INSURANCE_POLICY: InsurancePolicy = {
    id: 'policy-1',
    userId: 'mock-user-id',
    providerName: 'United Health Shield',
    policyNumber: 'UHS-987654321',
    deductible: { individual: 5000, family: 15000, individualMet: 1200, familyMet: 3400 },
    outOfPocketMax: { individual: 25000, family: 50000, individualMet: 4500, familyMet: 8800 },
    coPay: { primary: 500, specialist: 1500, emergency: 5000 },
};

const MOCK_DOCUMENTS: HealthDocument[] = [
  {
    id: 'doc-1',
    userId: 'mock-user-id',
    familyMemberId: 'fam-1',
    fileName: 'dhanya_lipid_panel.pdf',
    fileUrl: '#',
    uploadedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
    documentType: 'Lab Report',
    reportType: 'Lipid Panel',
    hospital: 'City Health Clinic',
    extractedValues: {
      'Total Cholesterol': { value: 210, unit: 'mg/dL', ref: '<200', isAbnormal: true },
      'LDL': { value: 140, unit: 'mg/dL', ref: '<100', isAbnormal: true },
      'HDL': { value: 45, unit: 'mg/dL', ref: '>40', isAbnormal: false },
    },
    diagnosis: ['Hyperlipidemia'],
    medications: ['Atorvastatin 20mg'],
    abnormalities: ['High Total Cholesterol', 'High LDL'],
    patientSummary: 'Your cholesterol levels are a bit high, especially the "bad" LDL cholesterol. Your doctor has prescribed medication to help manage this.',
    doctorSummary: 'Patient diagnosed with hyperlipidemia. LDL at 140 mg/dL. Initiated on Atorvastatin 20mg daily. Advised on diet and lifestyle modifications.',
    timestamp: new Date('2024-01-14T09:00:00Z').toISOString(),
  },
  {
    id: 'doc-krishna-1',
    userId: 'mock-user-id',
    familyMemberId: 'fam-2',
    fileName: 'krishna_ct_scan.pdf',
    fileUrl: '#',
    uploadedAt: new Date('2024-02-10T11:00:00Z').toISOString(),
    documentType: 'Scan Report',
    reportType: 'Coronary Angiogram',
    hospital: 'Apollo Hospital',
    diagnosis: ['CAD-Borderline TVD'],
    medications: ['T. RIOSTAT-CV', 'T. OLMESARTAN'],
    abnormalities: ['Moderate stenosis in proximal LAD'],
    patientSummary: 'A CT scan of your heart shows some moderate narrowing in one of the main arteries. Your doctor has recommended medical management.',
    doctorSummary: 'Coronary Angiogram reveals moderate stenosis (40%) in proximal LAD and proximal OM. CAD-Borderline TVD. Medical management advised.',
    timestamp: new Date('2024-02-09T16:00:00Z').toISOString(),
    claimStatus: 'Approved',
  },
  {
    id: 'doc-krishna-2',
    userId: 'mock-user-id',
    familyMemberId: 'fam-2',
    fileName: 'krishna_pharmacy_bill.pdf',
    fileUrl: '#',
    uploadedAt: new Date('2024-02-11T12:00:00Z').toISOString(),
    documentType: 'Receipt',
    reportType: 'Pharmacy Bill',
    hospital: 'Apollo Pharmacy',
    patientSummary: 'This is a receipt for medications purchased for Krishna.',
    doctorSummary: 'Pharmacy receipt for prescribed medications.',
    timestamp: new Date('2024-02-10T18:00:00Z').toISOString(),
    billingInfo: { totalAmount: 2044.64, items: [{name: 'CDSTAT CL', amount: 511.88}, {name: 'FENOLIP 145', amount: 800.13}, {name: 'OLMEZEST BETA 50', amount: 732.63}] },
    claimStatus: 'Denied',
  },
];

const ALL_DOCTORS_DIRECTORY: Omit<Doctor, 'accessLink' | 'createdAt' | 'familyMemberIds'>[] = [
    { id: 'dir-dr-101', name: 'Dr. Arun Kumar', hospital: 'Apollo Hospital', specialty: 'Cardiology' },
    { id: 'dir-dr-102', name: 'Dr. Priya Sharma', hospital: 'Fortis Hospital', specialty: 'Neurology' },
    { id: 'dir-dr-103', name: 'Dr. Raj Singh', hospital: 'Max Healthcare', specialty: 'Orthopedics' },
    { id: 'dir-dr-104', name: 'Dr. Anjali Mehta', hospital: 'Apollo Hospital', specialty: 'Pediatrics' },
    { id: 'dir-dr-105', name: 'Dr. Sameer Verma', hospital: 'Manipal Hospital', specialty: 'Oncology' },
    { id: 'dir-dr-106', name: 'Dr. Emily Carter', hospital: 'Unity General Hospital', specialty: 'General Medicine' },
];

let doctorsDB: Doctor[] = [
    {
        id: 'dir-dr-106',
        name: 'Dr. Emily Carter',
        hospital: 'Unity General Hospital',
        specialty: 'General Medicine',
        accessLink: `${window.location.origin}${window.location.pathname}#/doctor-view/doctoken-1678886400000`,
        createdAt: new Date('2024-03-15T10:00:00Z').toISOString(),
        familyMemberIds: ['fam-1', 'fam-2'],
    }
];

let documentsDB = [...MOCK_DOCUMENTS];
let familyMembersDB = [...MOCK_FAMILY_MEMBERS];
let insurancePolicyDB = MOCK_INSURANCE_POLICY;

export const useMockApi = (user: User | null) => {
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [insurancePolicy, setInsurancePolicy] = useState<InsurancePolicy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      setTimeout(() => {
        const userDocuments = documentsDB.filter(r => r.userId === user.uid || r.userId === 'mock-user-id');
        setDocuments(userDocuments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setDoctors(doctorsDB);
        setFamilyMembers(familyMembersDB);
        setInsurancePolicy(insurancePolicyDB);
        setIsLoading(false);
      }, 1000);
    } else {
      setDocuments([]);
      setDoctors([]);
      setFamilyMembers([]);
      setInsurancePolicy(null);
      setIsLoading(false);
    }
  }, [user]);

  const uploadAndProcessDocument = async (file: File, familyMemberId: string): Promise<void> => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const extractedData = await extractDataWithAI(file, user.uid);
      const newDocument: HealthDocument = {
        ...extractedData,
        id: `doc-${Date.now()}`,
        userId: user.uid,
        familyMemberId: familyMemberId,
        fileName: file.name,
        fileUrl: '#',
        uploadedAt: new Date().toISOString(),
        claimStatus: extractedData.documentType === 'Receipt' ? 'Not Submitted' : undefined,
      };
      documentsDB.push(newDocument);
      setDocuments(prev => [newDocument, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e: any) {
      setError(e.message || "Failed to process document with AI.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const addFamilyMember = async (name: string, relationship: string): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const newMember: FamilyMember = {
                id: `fam-${Date.now()}`,
                name,
                relationship,
                photoURL: `https://i.pravatar.cc/150?u=${name.replace(/\s/g, '')}`
            };
            familyMembersDB.push(newMember);
            setFamilyMembers([...familyMembersDB]);
            resolve();
        }, 500);
    });
  };

  const searchDoctors = async (query: string): Promise<Omit<Doctor, 'accessLink' | 'createdAt' | 'familyMemberIds'>[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (!query) {
                resolve([]);
                return;
            }
            const lowerCaseQuery = query.toLowerCase();
            const results = ALL_DOCTORS_DIRECTORY.filter(
                doc => doc.name.toLowerCase().includes(lowerCaseQuery) || doc.hospital.toLowerCase().includes(lowerCaseQuery)
            );
            resolve(results);
        }, 300);
    });
  };

  const addDoctor = async (doctorProfile: Omit<Doctor, 'accessLink' | 'createdAt' | 'familyMemberIds'>, familyMemberIds: string[]): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const existingDoctor = doctorsDB.find(d => d.id === doctorProfile.id);
            if (existingDoctor) {
                existingDoctor.familyMemberIds = Array.from(new Set([...existingDoctor.familyMemberIds, ...familyMemberIds]));
            } else {
                const newDoctorWithAccess: Doctor = {
                    ...doctorProfile,
                    accessLink: `${window.location.origin}${window.location.pathname}#/doctor-view/doctoken-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    familyMemberIds,
                };
                doctorsDB.push(newDoctorWithAccess);
            }
            setDoctors([...doctorsDB]);
            resolve();
        }, 500);
    });
  };

  const revokeDoctor = async (doctorId: string): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            doctorsDB = doctorsDB.filter(d => d.id !== doctorId);
            setDoctors([...doctorsDB]);
            resolve();
        }, 500);
    });
  };

  const getDoctorViewData = async (token: string): Promise<{ documents: HealthDocument[], patientName: string } | null> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const doctor = doctorsDB.find(d => d.accessLink.endsWith(token));
        if (doctor) {
          const accessibleDocs = documentsDB.filter(doc => doctor.familyMemberIds.includes(doc.familyMemberId));
          resolve({
            documents: accessibleDocs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            patientName: "Dhanya's Family"
          });
        } else {
          resolve(null);
        }
      }, 1000);
    });
  };

  const getHealthInsights = useCallback(async (docs: HealthDocument[]): Promise<HealthInsight[]> => {
    if (docs.length === 0) return [];
    return generateHealthInsights(docs);
  }, []);

  const getDoctorVisitSummary = useCallback(async (docs: HealthDocument[]): Promise<string> => {
    return generateDoctorVisitSummary(docs);
  }, []);

  const analyzeBillWithInsurance = async (bill: HealthDocument): Promise<string> => {
      return new Promise(resolve => setTimeout(() => {
          resolve(`
### Pre-Claim Analysis for Bill #${bill.id.slice(-6)}
- **Total Bill Amount:** ₹${bill.billingInfo?.totalAmount.toFixed(2)}
- **Estimated Insurance Coverage:** ~₹${(bill.billingInfo?.totalAmount * 0.8).toFixed(2)} (Assuming 80% co-insurance)
- **Your Estimated Cost:** ~₹${(bill.billingInfo?.totalAmount * 0.2).toFixed(2)}
- **Alert:** No pre-authorization document was found for this service. Please verify with your provider if one was required.
          `);
      }, 1500));
  };

  const draftAppealLetter = async (deniedBill: HealthDocument): Promise<string> => {
      return new Promise(resolve => setTimeout(() => {
          resolve(`
### DRAFT: Appeal Letter for Claim #${deniedBill.id.slice(-6)}

**To:** United Health Shield Claims Department  
**From:** Dhanya Vangalapudi  
**Date:** ${new Date().toLocaleDateString()}  
**Policy Number:** ${insurancePolicyDB.policyNumber}  
**Claim Reference:** ${deniedBill.id.slice(-6)}  

Dear Claims Adjudicator,

I am writing to formally appeal the denial of my recent claim for pharmacy services on **${new Date(deniedBill.timestamp).toLocaleDateString()}**. The reason for denial was cited as "Service not medically necessary."

I believe this denial was in error. These medications were prescribed by my cardiologist, Dr. Arun Kumar, following a Coronary Angiogram on ${new Date('2024-02-09T16:00:00Z').toLocaleDateString()}, which revealed moderate stenosis. The prescribed medications, including Olmezest and Fenolip, are essential for managing my diagnosed Coronary Artery Disease (CAD-Borderline TVD) and preventing further cardiovascular events.

Please find the relevant clinical notes and the prescription from the visit attached for your review. I request a thorough re-evaluation of this claim based on the clear medical necessity of these treatments.

Thank you for your time and consideration.

Sincerely,  
Dhanya Vangalapudi
          `);
      }, 2000));
  };

  const translateText = useCallback(async (text: string, language: string): Promise<string> => {
    return realTranslateText(text, language);
  }, []);

  const getAIChatResponse = useCallback(async (message: string, documents: HealthDocument[]): Promise<string> => {
    return realGetAIChatResponse(message, documents);
  }, []);

  return { documents, doctors, familyMembers, insurancePolicy, isLoading, error, uploadAndProcessDocument, addFamilyMember, searchDoctors, addDoctor, revokeDoctor, getDoctorViewData, getHealthInsights, getDoctorVisitSummary, analyzeBillWithInsurance, draftAppealLetter, translateText, getAIChatResponse };
};
