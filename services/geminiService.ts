
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { HealthDocument, HealthInsight } from '../types.ts';

// Initialize the Google GenAI client
// This now reads the API key from the environment variables provided by the build/deployment process.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY, vertexai: true });

// Helper to convert File to a Gemini-compatible format
const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

// --- REAL AI EXTRACTION ---
export const extractDataWithAI = async (file: File, userId: string): Promise<Omit<HealthDocument, 'id' | 'userId' | 'fileUrl' | 'uploadedAt' | 'fileName'>> => {
  console.log(`[Gemini Service] Starting AI extraction for file: ${file.name}`);

  const filePart = await fileToGenerativePart(file);

  const prompt = `Analyze the attached medical document. First, classify it into one of the following types: 'Lab Report', 'Prescription', 'Receipt', 'Clinical Note', 'Scan Report', 'Unknown'.
  
  Then, extract the key information based on its type and return it in the specified JSON format.
  - "documentType": The classification you determined.
  - "reportType": The specific title of the report (e.g., "Complete Blood Count", "Coronary Angiogram", "Pharmacy Bill").
  - "hospital": The name of the hospital, clinic, or pharmacy.
  - "timestamp": The primary date of the report or bill, in ISO 8601 format (YYYY-MM-DD).
  - "extractedValues": If it's a Lab Report, an object of key lab values.
  - "billingInfo": If it's a Receipt/Bill, an object with "totalAmount" and a list of "items".
  - "diagnosis": A list of diagnoses or impressions.
  - "medications": A list of prescribed medications.
  - "abnormalities": A list of key abnormal findings.
  - "patientSummary": A simple, one-paragraph summary for the patient.
  - "doctorSummary": A concise, clinical summary for a doctor.
  
  If a field is not present, return an empty string, empty array, or null.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      documentType: { type: Type.STRING, enum: ['Lab Report', 'Prescription', 'Receipt', 'Clinical Note', 'Scan Report', 'Unknown'], description: "Category of the document." },
      reportType: { type: Type.STRING, description: "Specific title of the document." },
      hospital: { type: Type.STRING, description: "Name of the hospital, clinic, or pharmacy." },
      timestamp: { type: Type.STRING, description: "Date of the report in YYYY-MM-DD format." },
      extractedValues: {
        type: Type.OBJECT,
        description: "For Lab Reports: Key-value pairs of lab results.",
        nullable: true,
      },
      billingInfo: {
        type: Type.OBJECT,
        nullable: true,
        description: "For Receipts/Bills: Contains total amount and itemized list.",
        properties: {
            totalAmount: { type: Type.NUMBER },
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                    }
                }
            }
        }
      },
      diagnosis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of diagnoses mentioned." },
      medications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of prescribed medications." },
      abnormalities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key abnormal findings." },
      patientSummary: { type: Type.STRING, description: "Simple summary for a non-medical user." },
      doctorSummary: { type: Type.STRING, description: "Clinical summary for a doctor." },
    },
  };

  try {
    const result: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [filePart, { text: prompt }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonText = result.text;
    console.log("[Gemini Service] Raw JSON response:", jsonText);
    const parsedData = JSON.parse(jsonText);

    if (!parsedData.timestamp || !Date.parse(parsedData.timestamp)) {
        parsedData.timestamp = new Date().toISOString();
    } else {
        parsedData.timestamp = new Date(parsedData.timestamp).toISOString();
    }

    if (parsedData.extractedValues) {
        for (const key in parsedData.extractedValues) {
            const item = parsedData.extractedValues[key];
            if (item.ref && typeof item.value === 'number') {
                const rangeMatch = item.ref.match(/([\d.]+)\s*-\s*([\d.]+)/);
                if (rangeMatch) {
                    const lower = parseFloat(rangeMatch[1]);
                    const upper = parseFloat(rangeMatch[2]);
                    if (item.value < lower || item.value > upper) {
                        item.isAbnormal = true;
                    }
                }
            }
        }
    }

    return parsedData;
  } catch (error) {
    console.error("Error calling Gemini API for extraction:", error);
    throw new Error("The AI failed to analyze the document. It might be unreadable or in an unsupported format. Please try a clearer image or a different file.");
  }
};

// --- AWARD-WINNING FEATURE: CROSS-DOCUMENT ANALYSIS ---
export const generateHealthInsights = async (documents: HealthDocument[]): Promise<HealthInsight[]> => {
    if (documents.length === 0) {
        return [];
    }

    const context = JSON.stringify(documents.map(d => ({
        date: d.timestamp,
        type: d.documentType,
        diagnoses: d.diagnosis,
        medications: d.medications,
        labValues: d.extractedValues,
        abnormalities: d.abnormalities,
    })), null, 2);

    const prompt = `You are a proactive AI health analyst. Analyze the following timeline of a patient's health documents.
    
    1.  **Extract Key Vitals**: From the MOST RECENT document that contains them, extract up to 4 key vital signs like 'Blood Pressure', 'Total Cholesterol', 'LDL', 'HDL', 'Hemoglobin', or 'Blood Sugar'. Format this as a 'vitals' object.
    2.  **Generate Insights**: Identify up to 2 critical insights, trends, or potential issues. For each insight, provide a category, severity, title, a simple description, and a recommendation.
    
    Categories: 'Trend', 'Interaction', 'Reminder', 'Observation'.
    Severity: 'Low', 'Medium', 'High'.
    
    Focus on:
    - **Trends**: Significant changes in lab values over time.
    - **Interactions**: Potential drug-to-drug interactions.
    - **Reminders**: Follow-up appointments mentioned in notes.
    - **Observations**: Connections between diagnoses and lab results.

    Patient's Health Data:
    ${context}

    Return a SINGLE JSON object with a 'vitals' object and an 'insights' array.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            vitals: {
                type: Type.OBJECT,
                description: "Latest key vital signs.",
                nullable: true,
            },
            insights: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: ['Trend', 'Interaction', 'Reminder', 'Observation'] },
                        severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        recommendation: { type: Type.STRING },
                    }
                }
            }
        }
    };

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: { responseMimeType: 'application/json', responseSchema: responseSchema },
        });
        const data = JSON.parse(result.text);
        const insights = data.insights || [];
        // Combine vitals into a special insight card
        if (data.vitals && Object.keys(data.vitals).length > 0) {
            return [{
                id: 'vitals-summary',
                category: 'Observation',
                severity: 'Low',
                title: 'Latest Health Vitals',
                description: 'A snapshot of your most recent key metrics.',
                recommendation: 'Monitor these values and discuss any concerns with your doctor.',
                vitals: data.vitals
            }, ...insights.map((insight: any) => ({ ...insight, id: `insight-${Math.random()}` }))]
        }
        return insights.map((insight: any) => ({ ...insight, id: `insight-${Math.random()}` }));
    } catch (error) {
        console.error("Error generating health insights:", error);
        return [];
    }
};

// --- AWARD-WINNING FEATURE: DOCTOR VISIT PREPARATION ---
export const generateDoctorVisitSummary = async (documents: HealthDocument[]): Promise<string> => {
    const context = JSON.stringify(documents.map(d => ({
        date: d.timestamp,
        type: d.documentType,
        hospital: d.hospital,
        summary: d.doctorSummary,
        diagnoses: d.diagnosis,
        medications: d.medications,
    })), null, 2);

    const prompt = `You are an expert medical assistant AI. Based on the patient's entire health history provided below, generate a "Doctor's Visit Brief".
    The brief should be in Markdown format and include these sections:
    
    ### Key Health Summary
    A one-paragraph overview of the patient's main conditions and history.
    
    ### Recent Events (Last 6 Months)
    A bulleted list of major events, diagnoses, or new medications from the last 6 months.
    
    ### Key Discussion Points
    A bulleted list of 3-4 important topics or questions the patient should discuss with their doctor, based on trends, new symptoms, or upcoming follow-ups mentioned in the data.
    
    Patient's Health Data:
    ${context}
    `;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: prompt }] },
        });
        return result.text;
    } catch (error) {
        console.error("Error generating doctor visit summary:", error);
        return "Could not generate summary at this time. Please try again later.";
    }
};

// --- DYNAMIC TRANSLATION ---
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const prompt = `Translate the following English text to ${targetLanguage}. Respond only with the translated text, nothing else.\n\n${text}`;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: prompt }] },
        });
        return result.text;
    } catch (error) {
        console.error(`Error translating text to ${targetLanguage}:`, error);
        return `[Translation to ${targetLanguage} failed]`;
    }
};

// --- CONVERSATIONAL CHAT ---
export const getAIChatResponse = async (message: string, documents: HealthDocument[]): Promise<string> => {
    console.log(`[Gemini Chat] Received message: ${message}`);
    
    if (documents.length === 0) {
        return "I don't have any documents to analyze yet. Please upload a medical document first.";
    }

    const context = JSON.stringify(documents.map(r => ({
        reportType: r.reportType,
        date: r.timestamp,
        diagnosis: r.diagnosis,
        abnormalities: r.abnormalities,
        patientSummary: r.patientSummary,
        labValues: r.extractedValues
    })), null, 2);

    const prompt = `You are UPHR-Vault AI, a friendly and helpful assistant for explaining medical records.
    
    Here is the user's available medical data in JSON format:
    ${context}

    The user's question is: "${message}"

    Based ONLY on the provided medical data, answer the user's question in a simple, clear, and conversational tone.
    - If the question is about a specific value (like "hemoglobin"), find the latest report with that value and state the value, its unit, and the date of the report.
    - If the question is a general greeting, respond politely.
    - If you cannot answer the question with the given data, say "I'm sorry, but I can't find that information in your uploaded documents."
    - Do not provide medical advice. Always suggest consulting a doctor for medical advice.`;

    try {
        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: prompt }] },
        });
        return result.text;
    } catch (error) {
        console.error("Error calling Gemini API for chat:", error);
        return "I'm having trouble connecting to my AI brain right now. Please try again in a moment.";
    }
};
