
export interface FraudRule {
  code: string;
  description: string;
  weight: number;
  priority: 'CRITICAL' | 'HIGH' | 'MED' | 'LOW';
}

export interface SignaledReason {
  ruleCode: string;
  timestamp?: string;
  reasoning: string;
  confidence: number;
}

export interface FraudPacket {
  riskScore: number;
  verdict: 'PASS' | 'INVESTIGATE' | 'BLOCK';
  confidenceScore: number;
  signaledReasons: SignaledReason[];
  summary: string;
}

export type HistoryStatus = 'normal' | 'follow_up';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  fileName: string;
  profile: string;
  result: FraudPacket;
  isFavorite: boolean;
  status: HistoryStatus;
}

export enum TabType {
  INGESTION = 'INGESTION',
  DICTIONARY = 'DICTIONARY',
  ANALYSIS = 'ANALYSIS',
  VERDICT = 'VERDICT',
  HISTORY = 'HISTORY',
  FOLLOW_UP = 'FOLLOW_UP',
  SYSTEM_PROMPT = 'SYSTEM_PROMPT'
}
