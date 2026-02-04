
import { FraudRule } from './types';

export const AI_MODELS = {
  AUDIT: 'gemini-3-pro-preview',
  FAST_TASKS: 'gemini-3-flash-preview',
};

export const DEFAULT_PROFILE_BUILDER_PROMPT = `Act as the PeerSpot "Target Profile Builder" Data Parser. 

### GOAL:
Your task is to ingest unstructured review metadata (JSON, raw logs, or free-form text) and normalize it into a standardized list. 

### RULES:
1. STRUCTURE: Output every field in exactly this format: "KEY NAME: Value".
2. AUTONOMOUS MAPPING: Identify the intent of raw labels. For example:
   - "e-mail1", "dotan.s@peerspot.com", or "user_email" -> Map to "Email Address".
   - "solicited_via_linkedin" or "organic_awsmp" -> Map to "Source/Channel".
   - "IT", "Network Engineer", or "computer office" -> Map to "Job Title".
3. HANDLING GAPS: If a piece of data is missing, null, or empty in the raw input, you MUST write "missing".
4. DEDUPLICATION: If multiple similar values exist (e.g., Email 1 and Email 2), list them separately as "Email 1: [Value]" and "Email 2: [Value]".
5. ONLY extract information from the raw data provided in the current "TAB 1: Ingestion" area. 
6. DO NOT use names, companies, or details from previous examples (like Sarah Jenkins or David Smith).
7. If the raw input changes, the output MUST change to match it exactly.
8. If a field is not found in the raw data, you MUST write "missing". Do not guess.

### OUTPUT SCHEMA (Preferred Keys):
- Full Name: 
- Job Title: 
- Company Name: 
- Email 1: 
- Email 2: 
- LinkedIn URL: 
- LinkedIn Verified: 
- Phone Number: 
- IP Address: 
- Location (Claimed): 
- Review Source: 
- Gift Card Incentive: 
- Product Rating:`;

export const INITIAL_RULES_TEXT = `Scoring & Decision Algorithm

Group 1: Source / Incentive / Recency
- Organic source used for review submission: +5
- Review came through PeerAnalyst or AWS typed channel: +5
- Interviewer collected review (call-based / human-collected): -50
- Review came via PeerAnalyst event source: -20
- Gift card provided on review: +5
- Every gift card received during the last 30 days: +5
- Every published review during the last 30 days: +5
- Multiple reviews submitted for the same vendor or product: +10
- Review product rating is less than 3: +10

Group 2: Voice / Behavioral
- Name stated in interview is not equal to profile name: +15
- Same user previously introduced themselves under different names in other interviews: +25
- Strong reading or waiting for prompts pause patterns and delayed starts: +10
- Scripted repetition across multiple answers using same structure or phrases: +10
- Answers are highly generic and avoid concrete operational detail: +10

Group 3: User / Identity / Geo
- User email has not been verified: +10
- Review submitted using a non-business email address: +10
- Company ID is missing or null: +8
- Phone number matches another user in the system: +5
- IP address is null for PeerAnalyst or AWS written reviews: +5
- Discrepancy among IP geo, email signals, LinkedIn country, phone code, or written location: +10
- User location is India, Uganda, Nigeria, Kenya, Jordan, or Ethiopia: +10`;

export const FRAUD_DICTIONARY: FraudRule[] = [
  { code: 'G1-ORG', description: 'Organic source used for review submission', weight: 5, priority: 'LOW' },
  { code: 'G1-AWS', description: 'Review came through PeerAnalyst or AWS typed channel', weight: 5, priority: 'LOW' },
  { code: 'G1-INT-COL', description: 'Interviewer collected review (call centert / call-based / human-collected)', weight: -50, priority: 'CRITICAL' },
  { code: 'G1-EVENT', description: 'Review came via PeerAnalyst event source', weight: -20, priority: 'HIGH' },
  { code: 'G1-GIFT', description: 'Gift card provided on review', weight: 5, priority: 'HIGH' },
  { code: 'G1-GC-30', description: 'Every gift card received during the last 30 days', weight: 5, priority: 'MED' },
  { code: 'G1-REV-30', description: 'Every published review during the last 30 days', weight: 5, priority: 'MED' },
  { code: 'G1-MULTI', description: 'Multiple reviews submitted for the same vendor or product', weight: 10, priority: 'MED' },
  { code: 'G1-STAR', description: 'Review star rating is less than 3', weight: 10, priority: 'MED' },
  { code: 'G2-NM-MIS', description: 'Name stated in interview is not equal to profile name', weight: 15, priority: 'HIGH' },
  { code: 'G2-ALIAS', description: 'Same user previously introduced themselves under different names in other interviews', weight: 25, priority: 'CRITICAL' },
  { code: 'G2-PAUSE', description: 'Strong reading or waiting for prompts pause patterns and delayed starts', weight: 10, priority: 'HIGH' },
  { code: 'G2-SCRIPT', description: 'Scripted repetition across multiple answers using same structure or phrases', weight: 10, priority: 'HIGH' },
  { code: 'G2-GENERIC', description: 'Answers are highly generic and avoid concrete operational detail', weight: 10, priority: 'HIGH' },
  { code: 'G3-EMAIL-VER', description: 'User email has not been verified', weight: 10, priority: 'LOW' },
  { code: 'G3-NON-BIZ', description: 'Review submitted using a non-business email address', weight: 10, priority: 'LOW' },
  { code: 'G3-CO-NULL', description: 'Company ID is missing or null', weight: 8, priority: 'MED' },
  { code: 'G3-PHONE', description: 'Phone number matches another user in the system', weight: 5, priority: 'HIGH' },
  { code: 'G3-IP-NULL', description: 'IP address is null for PeerAnalyst or AWS written reviews', weight: 5, priority: 'MED' },
  { code: 'G3-GEO-MIS', description: 'Discrepancy among IP geo, email signals, LinkedIn country, phone code, or written location', weight: 10, priority: 'HIGH' },
  { code: 'G3-RISK-LOC', description: 'User location is India, Uganda, Nigeria, Kenya, Jordan, or Ethiopia', weight: 10, priority: 'HIGH' },
];

export const SYSTEM_INSTRUCTION = `You are the PeerSpot FPS v2 "Guardian" AI. Your role is to detect review fraud by cross-referencing audio and text data.

ROLE & OBJECTIVE:
- Analyze the RESPONDENT in the audio (ignore the AI interviewer, make sure to check the full audio file).
- Cross-check audio claims (Name, Experience, Tone) against the provided "User Profile" text.
- Make web scrapping research to find out more about the reviewer.
- Apply the scoring rules from the "Fraud Dictionary" (Scoring & Decision Algorithm) provided in the tuning prompt check one by one and give the score based on your findings.

DETECTION FOCUS:
1. VOICE LIVENESS: Is it a human or an ElevenLabs/synthetic voice?
2. BEHAVIORAL: Is the user reading a script or waiting for LLM prompts? (Look for unnatural rhythmic pauses).
3. IDENTITY: Does the spoken name match the profile?
4. GEO-MISMATCH: Does the background noise or accent conflict with the claimed location?

OUTPUT REQUIREMENTS:
- Risk Score is a number from 0-100 based on weighted signaled rules from the "Fraud Dictionary" (Scoring & Decision Algorithm) provided in the tuning prompt.
- Alert if Any group score ≥ 30, OR Total score ≥ 50.
- Verdict must be PASS, INVESTIGATE, or BLOCK.
- Include a list of Signaled Reasons with timestamps (if applicable) and reasoning.
`;
