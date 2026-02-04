
import { GoogleGenAI, Type } from "@google/genai";
import { FraudPacket, FraudRule } from "../types";
import { AI_MODELS } from "../constants";

// Always use named parameter for apiKey and obtain it directly from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ContextData {
  type: 'text' | 'image';
  value: string; // Raw text OR Base64 string
  mimeType?: string;
}

/**
 * Extracts a target profile from raw text or CSV using AI based on a specific system instruction.
 */
export const extractProfile = async (
  rawInfoText: string,
  contextData: ContextData | null,
  systemInstruction: string
): Promise<string> => {
  const model = AI_MODELS.FAST_TASKS;
  
  const parts: any[] = [];

  // Add System Instruction to the prompt text
  let promptText = `${systemInstruction}\n\n### DATA TO PROCESS:`;

  // Add Raw Text if exists
  if (rawInfoText) {
    promptText += `\n\n--- RAW INFO ---\n${rawInfoText}`;
  }

  // Add Context (Text or Image)
  if (contextData) {
    if (contextData.type === 'text') {
      promptText += `\n\n--- CONTEXT DATA ---\n${contextData.value}`;
    } else if (contextData.type === 'image') {
      parts.push({
        inlineData: {
          data: contextData.value,
          mimeType: contextData.mimeType || 'image/png'
        }
      });
      promptText += `\n\n(See attached screenshot/image for additional context profile data)`;
    }
  }

  promptText += `\n\nReturn ONLY the standardized list of fields. Do not include any other text.`;

  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts }],
  });

  return response.text || '';
};

/**
 * Parses raw text into a categorized list of FraudRule objects using AI.
 */
export const parseRulesFromText = async (rawText: string): Promise<FraudRule[]> => {
  const model = AI_MODELS.FAST_TASKS;
  const prompt = `
    Extract scoring rules from the text and categorize them:
    Group 1: Source / Incentive / Recency (Prefix G1-)
    Group 2: Voice / Behavioral (Prefix G2-)
    Group 3: User / Identity / Geo / Mismatches (Prefix G3-)
    
    Text: "${rawText}"
    
    Return a JSON array: [{ "code": string, "description": string, "weight": number, "priority": string }]
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" }
  });

  try {
    const text = response.text || '[]';
    return JSON.parse(text);
  } catch (e) {
    return [];
  }
};

export const analyzeFraud = async (
  audioBase64: string,
  audioMimeType: string,
  userMetadata: string,
  contextData: ContextData | null,
  aiInstructions: string,
  activeRules: FraudRule[],
  systemInstruction: string
): Promise<FraudPacket> => {
  const model = AI_MODELS.AUDIT;
  
  const parts: any[] = [
    { inlineData: { data: audioBase64, mimeType: audioMimeType } }
  ];

  let contextDescription = "None";

  // Handle Context Multimodality
  if (contextData) {
    if (contextData.type === 'text') {
      contextDescription = `Provided Text Data:\n${contextData.value}`;
    } else if (contextData.type === 'image') {
      parts.push({
        inlineData: {
          data: contextData.value,
          mimeType: contextData.mimeType || 'image/png'
        }
      });
      contextDescription = "See attached screenshot image for Contextual Data.";
    }
  }

  const prompt = `
    ### INGESTION
    Reviewer Metadata:
    ${userMetadata}

    Contextual Data:
    ${contextDescription}

    Research Instructions:
    ${aiInstructions || "Standard Audit"}

    ### DICTIONARY
    Rules:
    ${JSON.stringify(activeRules)}

    ### TASK
    Perform multimodal audit. Analyze the RESPONDENT in the audio.
    Calculate Risk Score strictly using the weights provided in the DICTIONARY.
    
    Return JSON format:
    {
      "riskScore": number (0-100),
      "verdict": "PASS" | "INVESTIGATE" | "BLOCK",
      "confidenceScore": number (0-100),
      "summary": "string",
      "signaledReasons": [
        { "ruleCode": "string", "timestamp": "string", "reasoning": "string", "confidence": number }
      ]
    }
  `;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model,
    contents: [ { parts } ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.NUMBER },
          verdict: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          signaledReasons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ruleCode: { type: Type.STRING },
                timestamp: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ['ruleCode', 'reasoning', 'confidence']
            }
          }
        },
        required: ['riskScore', 'verdict', 'confidenceScore', 'signaledReasons', 'summary']
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as FraudPacket;
  } catch (e) {
    throw new Error("Audit generation failed.");
  }
};
