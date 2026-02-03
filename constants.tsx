
import { FraudRule } from './types';

export const FRAUD_DICTIONARY: FraudRule[] = [
  // { code: 'G2-ID-MIS', description: 'Name/Identity in audio does not match profile', weight: 15, priority: 'CRITICAL' },
  // { code: 'G2-AI-VOX', description: 'Synthetic/AI-generated voice detected', weight: 25, priority: 'CRITICAL' },
  // { code: 'G2-SCRIPT', description: 'Reading from a script / unnatural pauses', weight: 10, priority: 'HIGH' },
  // { code: 'G2-GENERIC', description: 'Highly generic answers / Avoiding detail', weight: 10, priority: 'HIGH' },
  // { code: 'G3-GEO-MIS', description: 'Background noise / Accent conflicts with Geo', weight: 10, priority: 'MED' },
  // { code: 'G1-INC-GC', description: 'Mention of gift card incentive in audio', weight: 5, priority: 'LOW' },
  { code: 'G1-ORG', description: 'Organic source used for review submission', weight: 5, priority: 'LOW' },
  { code: 'G1-AWS', description: 'Review came through PeerAnalyst or AWS typed channel', weight: 5, priority: 'LOW' },
  { code: 'G1-INT-COL', description: 'Interviewer collected review (call-based / human-collected)', weight: -50, priority: 'CRITICAL' },
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
- Analyze the RESPONDENT in the audio (ignore the AI interviewer).
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
