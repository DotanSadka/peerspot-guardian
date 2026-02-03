
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { analyzeFraud, parseRulesFromText, extractProfile, ContextData } from './services/geminiService';
import { memoryService } from './services/memoryService';
import { FraudPacket, TabType, FraudRule, HistoryEntry, HistoryStatus } from './types';
import { SYSTEM_INSTRUCTION } from './constants';
import RiskMeter from './components/RiskMeter';

const DEFAULT_PROFILE_BUILDER_PROMPT = `Act as the PeerSpot "Target Profile Builder" Data Parser. 

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

const INITIAL_RULES_TEXT = `Scoring & Decision Algorithm

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

const INITIAL_RULES_FROM_TEXT: FraudRule[] = [
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.INGESTION);
  const [isLoadingMemory, setIsLoadingMemory] = useState(true);
  
  // --- Persistent State Initialization ---
  const [systemPrompt, setSystemPrompt] = useState<string>(SYSTEM_INSTRUCTION);
  const [profileBuilderPrompt, setProfileBuilderPrompt] = useState<string>(DEFAULT_PROFILE_BUILDER_PROMPT);
  const [ruleDefinitionText, setRuleDefinitionText] = useState<string>(INITIAL_RULES_TEXT);
  const [rules, setRules] = useState<FraudRule[]>([...INITIAL_RULES_FROM_TEXT]);
  
  // --- Ingestion State ---
  const [rawInfoText, setRawInfoText] = useState<string>('');
  const [isExtractingProfile, setIsExtractingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<string>('');
  const [aiInstructions, setAiInstructions] = useState<string>('');

  // --- Tuning State ---
  const [naturalLanguageInput, setNaturalLanguageInput] = useState<string>('');
  const [isSyncingRules, setIsSyncingRules] = useState(false);

  // --- Media & Context ---
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [contextFile, setContextFile] = useState<File | null>(null);
  const [contextData, setContextData] = useState<ContextData | null>(null);

  // --- History ---
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Analysis & Context
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FraudPacket | null>(null);
  const [analysisContext, setAnalysisContext] = useState<{ fileName: string; profile: string } | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<{ audio: boolean; context: boolean }>({ audio: false, context: false });

  // Filters & Sorting (Logs)
  const [historyFilter, setHistoryFilter] = useState('');
  const [historySort, setHistorySort] = useState<'newest' | 'oldest'>('newest');
  const [historyFavoritesOnly, setHistoryFavoritesOnly] = useState(false);

  // Filters & Sorting (Queue)
  const [queueFilter, setQueueFilter] = useState('');
  const [queueSort, setQueueSort] = useState<'newest' | 'oldest'>('newest');

  const audioInputRef = useRef<HTMLInputElement>(null);
  const contextInputRef = useRef<HTMLInputElement>(null);

  // Load from Memory Service on Mount
  useEffect(() => {
    const loadMemory = async () => {
      try {
        const [
          savedHistory,
          savedSystemPrompt,
          savedProfilePrompt,
          savedRulesText,
          savedRulesJson
        ] = await Promise.all([
          memoryService.getHistory(),
          memoryService.getSetting('guardian_system_prompt', SYSTEM_INSTRUCTION),
          memoryService.getSetting('guardian_profile_builder_prompt', DEFAULT_PROFILE_BUILDER_PROMPT),
          memoryService.getSetting('guardian_rules_text', INITIAL_RULES_TEXT),
          memoryService.getSetting('guardian_rules_json', null)
        ]);

        setHistory(savedHistory || []);
        setSystemPrompt(savedSystemPrompt);
        setProfileBuilderPrompt(savedProfilePrompt);
        setRuleDefinitionText(savedRulesText);
        
        if (savedRulesJson) {
           setRules(savedRulesJson);
        } else {
           setRules([...INITIAL_RULES_FROM_TEXT]);
        }
      } catch (e) {
        console.error("Failed to load memory:", e);
      } finally {
        setIsLoadingMemory(false);
      }
    };
    loadMemory();
  }, []);

  // --- Helpers for Persistence ---
  const saveAsDefault = async (key: string, value: string) => {
    await memoryService.saveSetting(key, value);
    alert('Settings saved to Memory.');
  };

  const saveRulesAsDefault = async () => {
    await memoryService.saveSetting('guardian_rules_text', ruleDefinitionText);
    await memoryService.saveSetting('guardian_rules_json', rules);
    alert('Tuning configuration saved to Memory.');
  };

  const restoreDefaults = (key: string, fallback: string, setter: (val: string) => void) => {
    setter(fallback);
  };

  const restoreRulesDefault = () => {
    setRuleDefinitionText(INITIAL_RULES_TEXT);
    setRules([...INITIAL_RULES_FROM_TEXT]);
  };

  // --- Handlers ---
  const handleClearAll = () => {
    setAudioFile(null);
    setContextFile(null);
    setContextData(null);
    setRawInfoText('');
    setUserProfile('');
    setAiInstructions('');
    setError(null);
  };

  const handleAudioFile = (file: File | undefined) => {
    if (!file) return;
    const hasMediaExt = /\.(mp3|wav|m4a|aac|ogg|flac|webm|mp4|mov|avi|m4v)$/i.test(file.name);
    if (file.type.startsWith('audio/') || file.type.startsWith('video/') || hasMediaExt) {
      setAudioFile(file);
      setError(null);
    } else {
      setError("Unsupported audio/video format.");
    }
  };

  const handleContextFile = (file: File | undefined) => {
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isText = file.type === 'text/csv' || file.type === 'text/plain' || file.name.endsWith('.csv') || file.name.endsWith('.txt');

    if (isImage) {
      setContextFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setContextData({
          type: 'image',
          value: base64,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
      setError(null);
    } else if (isText) {
      setContextFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setContextData({
          type: 'text',
          value: e.target?.result as string
        });
      };
      reader.readAsText(file);
      setError(null);
    } else {
      setError("Unsupported format. Please use CSV, Text, or an Image/Screenshot of your document.");
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDrag = (e: React.DragEvent, type: 'audio' | 'context', active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: active }));
  };

  const handleDrop = (e: React.DragEvent, type: 'audio' | 'context') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (type === 'audio') {
        handleAudioFile(e.dataTransfer.files[0]);
      } else {
        handleContextFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleExtractProfile = async () => {
    if (!contextData && !rawInfoText.trim()) {
      setError("Please provide Context data (File/Screenshot) or paste info into RAW Info box.");
      return;
    }

    setIsExtractingProfile(true);
    setError(null);
    try {
      const result = await extractProfile(rawInfoText, contextData, profileBuilderPrompt);
      setUserProfile(result);
    } catch (e: any) {
      console.error(e);
      setError(`Profile extraction failed. Check API key or connection.`);
    } finally {
      setIsExtractingProfile(false);
    }
  };

  const handleDeleteSignal = (indexToRemove: number) => {
    if (!result) return;
    setResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        signaledReasons: prev.signaledReasons.filter((_, idx) => idx !== indexToRemove)
      };
    });
  };

  // --- Rule Sync Logic ---
  const handleSyncTextToTable = async () => {
    if (!ruleDefinitionText.trim()) return;
    setIsSyncingRules(true);
    try {
      const parsedRules = await parseRulesFromText(ruleDefinitionText);
      if (parsedRules.length > 0) setRules(parsedRules);
    } catch (e) { setError("Sync failed."); }
    finally { setIsSyncingRules(false); }
  };

  const generateTextFromRules = (currentRules: FraudRule[]) => {
    const groups = [1, 2, 3].map(g => currentRules.filter(r => r.code.startsWith(`G${g}`)));
    const headers = ["Source / Incentive / Recency", "Voice / Behavioral", "User / Identity / Geo"];
    let text = `Scoring & Decision Algorithm\n\n`;
    groups.forEach((group, i) => {
      text += `Group ${i + 1}: ${headers[i]}\n` + group.map(r => `- ${r.description}: ${r.weight > 0 ? '+' : ''}${r.weight}`).join('\n') + `\n\n`;
    });
    setRuleDefinitionText(text);
  };

  const handleNLConvertToLogic = async () => {
    if (!naturalLanguageInput.trim()) return;
    setIsSyncingRules(true);
    try {
      const parsedRules = await parseRulesFromText(naturalLanguageInput);
      if (parsedRules.length > 0) {
        setRules(parsedRules);
        generateTextFromRules(parsedRules);
        setNaturalLanguageInput('');
      }
    } catch (e) { setError("Logic conversion failed."); }
    finally { setIsSyncingRules(false); }
  };

  const updateRuleValue = (index: number, field: keyof FraudRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
    generateTextFromRules(newRules);
  };

  const cyclePriority = (index: number) => {
    const priorities: Array<FraudRule['priority']> = ['CRITICAL', 'HIGH', 'MED', 'LOW'];
    const current = rules[index].priority;
    const nextIndex = (priorities.indexOf(current) + 1) % priorities.length;
    updateRuleValue(index, 'priority', priorities[nextIndex]);
  };

  // --- History Logic ---
  const filteredHistory = useMemo(() => {
    let list = history.filter(h => 
      (h.fileName.toLowerCase().includes(historyFilter.toLowerCase()) || 
      h.profile.toLowerCase().includes(historyFilter.toLowerCase())) &&
      (!historyFavoritesOnly || h.isFavorite)
    );
    list.sort((a, b) => historySort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return list;
  }, [history, historyFilter, historySort, historyFavoritesOnly]);

  const followUpHistory = useMemo(() => {
    let list = history.filter(h => 
      h.status === 'follow_up' &&
      (h.fileName.toLowerCase().includes(queueFilter.toLowerCase()) || 
      h.profile.toLowerCase().includes(queueFilter.toLowerCase()))
    );
    list.sort((a, b) => queueSort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return list;
  }, [history, queueFilter, queueSort]);

  const normalHistory = useMemo(() => filteredHistory.filter(h => h.status === 'normal'), [filteredHistory]);

  const toggleFavorite = async (id: string) => {
    const updated = history.map(h => h.id === id ? { ...h, isFavorite: !h.isFavorite } : h);
    setHistory(updated);
    const entry = updated.find(h => h.id === id);
    if (entry) await memoryService.updateHistoryEntry(entry);
  };
  
  const setEntryStatus = async (id: string, status: HistoryStatus) => {
    const updated = history.map(h => h.id === id ? { ...h, status } : h);
    setHistory(updated);
    const entry = updated.find(h => h.id === id);
    if (entry) await memoryService.updateHistoryEntry(entry);
  };
  
  const deleteEntry = async (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await memoryService.deleteHistoryEntry(id);
  };

  // --- Analysis ---
  const handleStartAnalysis = async () => {
    if (!audioFile) { setError("Missing media."); return; }
    setIsAnalyzing(true); setError(null); setResult(null); setActiveTab(TabType.ANALYSIS);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioFile);
      });
      const base64 = await base64Promise;
      const data = await analyzeFraud(base64, audioFile.type || 'audio/mpeg', userProfile, contextData, aiInstructions, rules, systemPrompt);
      setResult(data);
      setAnalysisContext({ fileName: audioFile.name, profile: userProfile });
      
      const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        fileName: audioFile.name,
        profile: userProfile,
        result: data,
        isFavorite: false,
        status: 'normal'
      };
      
      setHistory(prev => [newEntry, ...prev]);
      // Async save to memory
      await memoryService.saveHistoryEntry(newEntry);
      
      setActiveTab(TabType.VERDICT);
    } catch (err: any) { setError(err.message); setActiveTab(TabType.INGESTION); }
    finally { setIsAnalyzing(false); }
  };

  const renderHistoryItem = (entry: HistoryEntry) => (
    <div key={entry.id} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 transition-all hover:border-indigo-500/50 group flex flex-col gap-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 overflow-hidden">
          <div className={`w-14 h-14 rounded-xl flex flex-shrink-0 items-center justify-center font-black text-xl shadow-inner ${entry.result.verdict === 'PASS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {Math.round(entry.result.riskScore)}
          </div>
          <div className="overflow-hidden">
            <h4 onClick={() => { setResult(entry.result); setAnalysisContext({ fileName: entry.fileName, profile: entry.profile }); setActiveTab(TabType.VERDICT); }} className="font-bold text-slate-200 group-hover:text-indigo-400 cursor-pointer truncate max-w-sm">{entry.fileName}</h4>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-slate-200 font-black uppercase tracking-widest">{new Date(entry.timestamp).toLocaleString()}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${entry.result.verdict === 'PASS' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                {entry.result.verdict}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => toggleFavorite(entry.id)} title="Favorite" className={`p-2 rounded-lg hover:bg-slate-800 ${entry.isFavorite ? 'text-amber-400' : 'text-slate-300'}`}>
            <i className={`${entry.isFavorite ? 'fas' : 'far'} fa-star`}></i>
          </button>
          <button onClick={() => setEntryStatus(entry.id, entry.status === 'follow_up' ? 'normal' : 'follow_up')} title="Flag for Follow-up" className={`p-2 rounded-lg hover:bg-slate-800 ${entry.status === 'follow_up' ? 'text-indigo-400' : 'text-slate-300'}`}>
            <i className="fas fa-flag"></i>
          </button>
          <button onClick={() => deleteEntry(entry.id)} title="Delete" className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-300 hover:text-rose-500">
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      {/* Profile Snapshot in Logs */}
      {entry.profile && (
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/30">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Profile Context</p>
          <p className="text-[11px] font-mono text-slate-400 line-clamp-3 whitespace-pre-wrap leading-relaxed">{entry.profile}</p>
        </div>
      )}
    </div>
  );

  // If loading memory, show a simple splash screen
  if (isLoadingMemory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-microchip text-4xl text-indigo-500 animate-pulse"></i>
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Connecting Memory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <header className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20 px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
              <i className="fas fa-shield-halved text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">PEERSPOT <span className="text-indigo-500">GUARDIAN</span></h1>
              <p className="text-[10px] text-slate-200 font-black uppercase tracking-[0.3em] leading-none">Security Division • v2.4.0</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-8 grid grid-cols-12 gap-8 lg:gap-12">
        {/* Further Narrow Sidebar Nav */}
        <nav className="col-span-12 lg:col-span-1 flex flex-col gap-1">
          {[
            { id: TabType.INGESTION, icon: 'fa-upload', label: 'Ingest' },
            { id: TabType.DICTIONARY, icon: 'fa-sliders-h', label: 'Tuning' },
            { id: TabType.SYSTEM_PROMPT, icon: 'fa-terminal', label: 'Prompt' },
            { id: TabType.HISTORY, icon: 'fa-clock-rotate-left', label: 'Logs' },
            { id: TabType.FOLLOW_UP, icon: 'fa-flag', label: 'Queue', count: followUpHistory.length },
            { id: TabType.VERDICT, icon: 'fa-gavel', label: 'Result', disabled: !result }
          ].map(tab => (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-2 px-1 py-5 rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-900 text-slate-400 disabled:opacity-20'}`}
            >
              <i className={`fas ${tab.icon} text-lg`}></i>
              <span className="font-bold text-[8px] uppercase tracking-widest">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute top-2 right-2 text-[8px] bg-rose-500 text-white px-1.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Centered Content Area */}
        <div className="col-span-12 lg:col-span-11 max-w-5xl mx-auto w-full">
          {activeTab === TabType.INGESTION && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-10 space-y-10 shadow-2xl relative">
                
                {/* Clear All Button */}
                <div className="absolute top-10 right-10 z-10">
                   <button 
                     onClick={handleClearAll}
                     className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-2"
                   >
                     <i className="fas fa-trash"></i> Clear All
                   </button>
                </div>

                {/* Media & Context Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Audio File</label>
                    <div 
                      onClick={() => audioInputRef.current?.click()}
                      onDragOver={(e) => handleDrag(e, 'audio', true)}
                      onDragLeave={(e) => handleDrag(e, 'audio', false)}
                      onDrop={(e) => handleDrop(e, 'audio')}
                      className={`relative h-32 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group shadow-inner ${dragActive.audio ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-indigo-600/50'}`}
                    >
                      {audioFile ? (
                        <div className="text-center p-4">
                          <i className={`fas ${audioFile.type.startsWith('video/') ? 'fa-video' : 'fa-music'} text-3xl text-indigo-500 mb-1`}></i>
                          <p className="text-[10px] font-black text-slate-200 line-clamp-1 px-4 uppercase tracking-tighter">{audioFile.name}</p>
                          <button onClick={(e) => { e.stopPropagation(); setAudioFile(null); }} className="mt-1 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400">Clear</button>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                            <i className="fas fa-plus text-slate-200 text-sm"></i>
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-200">Drag Audio Here</p>
                        </>
                      )}
                      <input type="file" ref={audioInputRef} onChange={(e) => e.target.files && handleAudioFile(e.target.files[0])} className="hidden" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Context (CSV/Text/Screenshot)</label>
                    <div 
                      onClick={() => contextInputRef.current?.click()}
                      onDragOver={(e) => handleDrag(e, 'context', true)}
                      onDragLeave={(e) => handleDrag(e, 'context', false)}
                      onDrop={(e) => handleDrop(e, 'context')}
                      className={`relative h-32 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group shadow-inner ${dragActive.context ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-emerald-600/50'}`}
                    >
                      {contextFile ? (
                        <div className="text-center p-4">
                          <i className={`fas ${contextData?.type === 'image' ? 'fa-image' : 'fa-file-lines'} text-3xl text-emerald-500 mb-1`}></i>
                          <p className="text-[10px] font-black text-slate-200 line-clamp-1 px-4 uppercase tracking-tighter">{contextFile.name}</p>
                          <button onClick={(e) => { e.stopPropagation(); setContextFile(null); setContextData(null); }} className="mt-1 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400">Remove</button>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                            <i className="fas fa-file-import text-slate-200 text-sm"></i>
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-200 text-center leading-tight">Drop CSV, Text<br/>or Screenshot</p>
                        </>
                      )}
                      <input type="file" ref={contextInputRef} onChange={(e) => e.target.files && handleContextFile(e.target.files[0])} className="hidden" accept=".csv,.txt,image/png,image/jpeg,image/webp" />
                    </div>

                    <div className="flex justify-center -mt-2 relative z-10">
                       <button 
                         onClick={handleExtractProfile}
                         disabled={isExtractingProfile || !contextData}
                         className="w-8 h-8 rounded-full bg-slate-800 hover:bg-indigo-500 border border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-white transition-all shadow-lg flex items-center justify-center disabled:opacity-0 disabled:scale-75 cursor-pointer"
                         title="Generate Profile from Context File"
                       >
                         <i className={`fas ${isExtractingProfile ? 'fa-spinner fa-spin' : 'fa-arrow-down'} text-xs`}></i>
                       </button>
                    </div>

                  </div>
                </div>

                {/* Profile Extraction Row */}
                <div className="space-y-4">
                   <div className="flex justify-between items-end ml-4">
                     <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200">Target Profile Builder</label>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                     {/* RAW Info Column */}
                     <div className="space-y-2 w-full self-stretch flex flex-col">
                       <p className="text-[10px] font-bold text-slate-200 italic ml-2">RAW Info:</p>
                       <textarea 
                         value={rawInfoText}
                         onChange={(e) => setRawInfoText(e.target.value)}
                         className="w-full h-56 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm text-slate-200 outline-none shadow-inner resize-none leading-relaxed focus:ring-1 focus:ring-indigo-500/50"
                         placeholder="Paste unstructured notes, chat logs, or other raw text here..."
                       />
                     </div>

                     {/* Center Arrow for Combined Extract */}
                     <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <button 
                          onClick={handleExtractProfile}
                          disabled={isExtractingProfile || (!contextData && !rawInfoText)}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100 group border border-white/10"
                          title="Extract Profile from RAW Info & Context"
                        >
                          <i className={`fas ${isExtractingProfile ? 'fa-spinner fa-spin' : 'fa-arrow-right'} text-white text-lg`}></i>
                        </button>
                     </div>

                     {/* Result Column */}
                     <div className="space-y-2 w-full self-stretch flex flex-col relative">
                        <p className="text-[10px] font-bold text-slate-200 italic ml-2">Profile:</p>
                        <textarea 
                          value={userProfile} 
                          onChange={(e) => setUserProfile(e.target.value)} 
                          className="w-full h-56 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm font-mono text-indigo-300 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner leading-relaxed" 
                          placeholder="Extracted data will appear here..."
                        />
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Directed Focus Instructions</label>
                  <textarea 
                    value={aiInstructions} 
                    onChange={(e) => setAiInstructions(e.target.value)} 
                    placeholder="E.g., 'Verify specifically for gift card fraud patterns'" 
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm text-slate-200 focus:ring-1 focus:ring-amber-500/50 outline-none shadow-inner resize-none" 
                  />
                </div>

                <div className="pt-8 border-t border-slate-800 flex justify-end">
                  <button onClick={handleStartAnalysis} disabled={!audioFile || isAnalyzing} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black py-5 px-16 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all flex items-center gap-4 disabled:opacity-50 tracking-[0.2em] uppercase text-xs">
                    {isAnalyzing ? <><i className="fas fa-dna fa-spin"></i> Analyzing</> : <>Run Multimodal Audit <i className="fas fa-bolt"></i></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === TabType.SYSTEM_PROMPT && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-12 shadow-2xl space-y-12">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white">Core System Prompt</h2>
                    <p className="text-slate-200 text-sm mt-2 font-medium">Define the core intelligence layer governing the Guardian AI audit logic.</p>
                  </div>
                  <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-[2rem] p-10 text-sm font-mono text-slate-200 focus:ring-1 focus:ring-indigo-500/50 outline-none leading-relaxed shadow-inner"
                  />
                  <div className="flex justify-end gap-4">
                    <button onClick={() => saveAsDefault('guardian_system_prompt', systemPrompt)} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Make as New Default</button>
                    <button onClick={() => restoreDefaults('guardian_system_prompt', SYSTEM_INSTRUCTION, setSystemPrompt)} className="text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Restore Defaults</button>
                  </div>
                </div>

                <div className="space-y-6 border-t border-slate-800 pt-10">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white">Target Profile Builder</h2>
                    <p className="text-slate-200 text-sm mt-2 font-medium">Instruction set for converting messy metadata into standardized profile fields.</p>
                  </div>
                  <textarea 
                    value={profileBuilderPrompt}
                    onChange={(e) => setProfileBuilderPrompt(e.target.value)}
                    className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-[2rem] p-10 text-sm font-mono text-slate-200 focus:ring-1 focus:ring-indigo-500/50 outline-none leading-relaxed shadow-inner"
                  />
                  <div className="flex justify-end gap-4">
                    <button onClick={() => saveAsDefault('guardian_profile_builder_prompt', profileBuilderPrompt)} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Make as New Default</button>
                    <button onClick={() => restoreDefaults('guardian_profile_builder_prompt', DEFAULT_PROFILE_BUILDER_PROMPT, setProfileBuilderPrompt)} className="text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Restore Defaults</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === TabType.DICTIONARY && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-12 shadow-2xl space-y-12">
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase tracking-tight ml-4">Signal Calibration</h2>
                  <div className="relative">
                    <textarea 
                      value={naturalLanguageInput} 
                      onChange={(e) => setNaturalLanguageInput(e.target.value)} 
                      placeholder="Describe rules in plain language..."
                      className="w-full h-32 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500/50 outline-none shadow-inner resize-none"
                    />
                    <button onClick={handleNLConvertToLogic} disabled={isSyncingRules || !naturalLanguageInput.trim()} className="absolute bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                      <i className="fas fa-magic"></i> Calibrate Signal
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Structural Logic Matrix</label>
                  <textarea value={ruleDefinitionText} onChange={(e) => setRuleDefinitionText(e.target.value)} className="w-full h-96 bg-slate-950 border border-slate-800 rounded-[2.5rem] p-10 text-sm font-mono text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner" />
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center ml-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200">Interactive Tuner</h2>
                    <div className="flex gap-4">
                       <button onClick={saveRulesAsDefault} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Make as New Default</button>
                       <button onClick={restoreRulesDefault} className="text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Restore Defaults</button>
                       <button onClick={handleSyncTextToTable} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Update Table</button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-[2rem] border border-slate-800/50 shadow-2xl">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 border-b border-slate-800">
                          <th className="px-8 py-6 w-48">Code</th>
                          <th className="px-8 py-6">Description</th>
                          <th className="px-8 py-6 text-center w-40">Impact</th>
                          <th className="px-8 py-6 text-center w-32">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 bg-slate-950/20">
                        {rules.map((rule, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/20 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-lg bg-slate-900 text-slate-200 text-[10px] font-black uppercase tracking-widest">{rule.code.split('-')[0]}</span>
                                <input 
                                  value={rule.code.split('-').slice(1).join('-')}
                                  onChange={(e) => updateRuleValue(idx, 'code', `${rule.code.split('-')[0]}-${e.target.value}`)}
                                  className="bg-transparent border-b border-transparent hover:border-indigo-500/30 focus:border-indigo-500 outline-none w-32 font-mono text-indigo-400 font-bold text-xs"
                                />
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <input value={rule.description} onChange={(e) => updateRuleValue(idx, 'description', e.target.value)} className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none w-full text-xs font-bold text-slate-200" />
                            </td>
                            <td className="px-8 py-6 text-center">
                              <div className="flex items-center justify-center gap-4">
                                <button onClick={() => updateRuleValue(idx, 'weight', rule.weight - 5)} className="w-8 h-8 rounded-full bg-slate-900 hover:bg-rose-500/20 text-slate-200 hover:text-rose-500 flex items-center justify-center transition-all">
                                  <i className="fas fa-minus text-[10px]"></i>
                                </button>
                                <span className={`w-10 text-center font-mono font-black text-sm ${
                                  rule.weight > 0 ? 'text-rose-400' : 
                                  rule.weight < 0 ? 'text-emerald-400' : 'text-indigo-400'
                                }`}>
                                  {rule.weight > 0 ? '+' : ''}{rule.weight}
                                </span>
                                <button onClick={() => updateRuleValue(idx, 'weight', rule.weight + 5)} className="w-8 h-8 rounded-full bg-slate-900 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-500 flex items-center justify-center transition-all">
                                  <i className="fas fa-plus text-[10px]"></i>
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                               <button onClick={() => cyclePriority(idx)} className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all border ${
                                  rule.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                  rule.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                               }`}>
                                 {rule.priority}
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === TabType.HISTORY && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-10">
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-12 shadow-2xl min-h-[600px] flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">Archives & Logs</h2>
                  <div className="flex gap-4 w-full md:w-auto items-center">
                    <button 
                      onClick={() => setHistoryFavoritesOnly(!historyFavoritesOnly)}
                      className={`h-10 px-4 rounded-xl border flex items-center gap-2 transition-all ${
                        historyFavoritesOnly 
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <i className={`${historyFavoritesOnly ? 'fas' : 'far'} fa-star text-xs`}></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Favorites</span>
                    </button>
                    <div className="relative flex-1 md:flex-none">
                       <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-200 text-xs"></i>
                       <input 
                        placeholder="Search logs..." 
                        value={historyFilter} 
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50 w-full"
                       />
                    </div>
                    <select value={historySort} onChange={(e) => setHistorySort(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-200 outline-none">
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  {normalHistory.length > 0 ? normalHistory.map(renderHistoryItem) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-800 space-y-4">
                       <i className="fas fa-folder-open text-5xl opacity-20"></i>
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Log Archive Empty</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === TabType.FOLLOW_UP && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-10">
              <div className="bg-indigo-950/10 rounded-[2.5rem] border border-indigo-500/20 p-12 shadow-2xl min-h-[600px] flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <i className="fas fa-flag text-white"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white">Review Queue</h2>
                      <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Flagged for manual follow-up</p>
                    </div>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                       <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-200 text-xs"></i>
                       <input 
                        placeholder="Search queue..." 
                        value={queueFilter} 
                        onChange={(e) => setQueueFilter(e.target.value)}
                        className="bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50 w-full placeholder:text-slate-500"
                       />
                    </div>
                    <select value={queueSort} onChange={(e) => setQueueSort(e.target.value as any)} className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-200 outline-none">
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  {followUpHistory.length > 0 ? followUpHistory.map(renderHistoryItem) : (
                    <div className="h-64 flex flex-col items-center justify-center text-indigo-500/20 space-y-4">
                       <i className="fas fa-clipboard-check text-5xl"></i>
                       <p className="text-[10px] font-black uppercase tracking-[0.4em]">Queue Cleared</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === TabType.ANALYSIS && (
            <div className="h-[700px] flex flex-col items-center justify-center text-center space-y-12">
              <div className="relative scale-150">
                <div className="w-24 h-24 border-[6px] border-slate-900 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-fingerprint text-indigo-500 text-2xl animate-pulse"></i></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white">SYSTEM ENGAGEMENT ACTIVE</h3>
                <p className="text-slate-200 text-xs font-bold uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">Multimodal analysis in progress. Comparing voice timbre and profile discrepancies...</p>
              </div>
            </div>
          )}

          {activeTab === TabType.VERDICT && result && (
            <div className="animate-in zoom-in-95 fade-in duration-700 space-y-12 pb-32">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <RiskMeter score={result.riskScore} verdict={result.verdict} />
                <div className="md:col-span-2 bg-slate-900/40 rounded-[3rem] border border-slate-800/50 p-12 flex flex-col justify-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <i className="fas fa-shield-virus text-[10rem]"></i>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-2.5 h-10 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>
                    <div className="flex flex-col gap-1">
                       <h2 className="text-3xl font-black uppercase tracking-tight text-white">Audit Verdict</h2>
                       <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">{analysisContext?.fileName || 'Unknown Source'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-[2rem] p-8 mb-10 relative shadow-inner">
                    <i className="fas fa-quote-left absolute -top-4 -left-2 text-slate-800 text-5xl opacity-40"></i>
                    <p className="text-lg leading-relaxed text-slate-200 italic font-medium">{result.summary}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-200">
                      <span>Neural confidence level</span>
                      <span className="text-indigo-400 font-bold">{Math.round(result.confidenceScore)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-1 border border-slate-900">
                      <div className="bg-gradient-to-r from-indigo-700 to-indigo-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.4)]" style={{ width: `${result.confidenceScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
                <div className="px-12 py-8 bg-slate-900/80 border-b border-slate-800/50 flex justify-between items-center">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-200 flex items-center gap-4">
                     <i className="fas fa-bolt-lightning text-amber-500"></i> Signals Identified
                   </h3>
                   <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full border border-indigo-500/30 uppercase tracking-widest">{result.signaledReasons.length} Flags Detected</span>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {result.signaledReasons.map((signal, idx) => {
                    const rule = rules.find(r => r.code === signal.ruleCode);
                    const score = rule ? rule.weight : 0;
                    const isBeneficial = score < 0; // Negative score is beneficial (good)
                    
                    return (
                    <div key={idx} className={`p-10 flex gap-10 hover:bg-slate-900/60 transition-all group border-l-4 ${isBeneficial ? 'border-emerald-500 hover:border-emerald-400' : 'border-transparent hover:border-indigo-500'}`}>
                       <div className={`w-16 h-16 rounded-[1.2rem] flex-shrink-0 flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110 shadow-2xl border ${
                         isBeneficial 
                         ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                         : (signal.confidence > 80 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20')
                       }`}>
                         {score > 0 ? '+' : ''}{score}
                       </div>
                       <div className="space-y-4 flex-1">
                         <div className="flex justify-between items-start">
                           <h4 className={`font-black tracking-tight text-xl transition-colors uppercase ${isBeneficial ? 'text-emerald-400' : 'text-slate-100 group-hover:text-indigo-400'}`}>
                              {signal.ruleCode}
                           </h4>
                           <div className="flex items-center gap-4">
                             {signal.timestamp && <span className="text-[10px] font-black bg-slate-950 px-3 py-1.5 rounded-xl text-slate-200 border border-slate-800 uppercase tracking-widest">{signal.timestamp}</span>}
                             <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border ${signal.confidence > 80 ? 'text-rose-500 border-rose-500/20' : 'text-amber-500 border-amber-500/20'}`}>{Math.round(signal.confidence)}% Precision</span>
                             <button 
                               onClick={() => handleDeleteSignal(idx)}
                               className="w-8 h-8 rounded-full bg-slate-950 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-colors border border-slate-800 hover:border-rose-500/30"
                               title="Remove this flag"
                             >
                               <i className="fas fa-trash-alt text-[10px]"></i>
                             </button>
                           </div>
                         </div>
                         <p className="text-slate-200 text-md leading-relaxed font-medium">{signal.reasoning}</p>
                       </div>
                    </div>
                  )})}
                  {result.signaledReasons.length === 0 && <div className="p-32 text-center text-slate-700 font-black uppercase tracking-[0.4em] text-sm italic opacity-20">Clear Communication Channel Detected</div>}
                </div>
              </div>

              <div className="flex justify-center gap-8 pt-4">
                 <button 
                  onClick={() => { setAudioFile(null); setContextFile(null); setContextData(null); setActiveTab(TabType.INGESTION); }} 
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-black py-5 px-12 rounded-[1.5rem] border border-slate-800 transition-all flex items-center gap-4 shadow-xl uppercase text-xs tracking-widest"
                 >
                   <i className="fas fa-rotate-left"></i> Reset Audit
                 </button>
              </div>

              {/* Read-Only Profile Context */}
              {analysisContext?.profile && (
                 <div className="max-w-4xl mx-auto w-full space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Full Profile Snapshot</label>
                    <textarea 
                      readOnly
                      value={analysisContext.profile}
                      className="w-full h-48 bg-slate-950/50 border border-slate-800/50 rounded-[2rem] p-8 text-sm font-mono text-indigo-300 outline-none shadow-inner leading-relaxed resize-none cursor-text" 
                    />
                 </div>
              )}

            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-900 p-10 text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-200 bg-slate-950/50">
        PeerSpot Guardian • Security Framework • High-Fidelity Audit Layer
      </footer>
    </div>
  );
};

export default App;
