
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { analyzeFraud, parseRulesFromText, extractProfile, ContextData } from './services/geminiService';
import { memoryService } from './services/memoryService';
import { FraudPacket, TabType, FraudRule, HistoryEntry, HistoryStatus } from './types';
import { SYSTEM_INSTRUCTION, DEFAULT_PROFILE_BUILDER_PROMPT, INITIAL_RULES_TEXT, FRAUD_DICTIONARY } from './constants';

// View Components
import IngestionView from './components/views/IngestionView';
import SystemPromptView from './components/views/SystemPromptView';
import TuningView from './components/views/TuningView';
import LogsView from './components/views/LogsView';
import QueueView from './components/views/QueueView';
import ArchitectureView from './components/views/ArchitectureView';
import VerdictView from './components/views/VerdictView';
import AnalysisView from './components/views/AnalysisView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.INGESTION);
  const [isLoadingMemory, setIsLoadingMemory] = useState(true);
  
  // --- Persistent State Initialization ---
  const [systemPrompt, setSystemPrompt] = useState<string>(SYSTEM_INSTRUCTION);
  const [profileBuilderPrompt, setProfileBuilderPrompt] = useState<string>(DEFAULT_PROFILE_BUILDER_PROMPT);
  const [ruleDefinitionText, setRuleDefinitionText] = useState<string>(INITIAL_RULES_TEXT);
  const [rules, setRules] = useState<FraudRule[]>([...FRAUD_DICTIONARY]);
  
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
           setRules([...FRAUD_DICTIONARY]);
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
    setRules([...FRAUD_DICTIONARY]);
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

  const handleHistorySelect = (entry: HistoryEntry) => {
    setResult(entry.result);
    setAnalysisContext({ fileName: entry.fileName, profile: entry.profile });
    setActiveTab(TabType.VERDICT);
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

  const handleResetAudit = () => {
    setAudioFile(null);
    setContextFile(null);
    setContextData(null);
    setActiveTab(TabType.INGESTION);
  };

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
        {/* Navigation Sidebar */}
        <nav className="col-span-12 lg:col-span-1 flex flex-col gap-1">
          {[
            { id: TabType.INGESTION, icon: 'fa-upload', label: 'Ingest' },
            { id: TabType.DICTIONARY, icon: 'fa-sliders-h', label: 'Tuning' },
            { id: TabType.SYSTEM_PROMPT, icon: 'fa-terminal', label: 'Prompt' },
            { id: TabType.HISTORY, icon: 'fa-clock-rotate-left', label: 'Logs' },
            { id: TabType.FOLLOW_UP, icon: 'fa-flag', label: 'Queue', count: followUpHistory.length },
            { id: TabType.ARCHITECTURE, icon: 'fa-network-wired', label: 'Architecture' },
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

        {/* Main Content Area */}
        <div className="col-span-12 lg:col-span-11 max-w-5xl mx-auto w-full">
          {error && (
             <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400">
                <i className="fas fa-exclamation-triangle"></i>
                <span className="text-xs font-bold">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto hover:text-white"><i className="fas fa-times"></i></button>
             </div>
          )}

          {activeTab === TabType.INGESTION && (
            <IngestionView 
              rawInfoText={rawInfoText}
              setRawInfoText={setRawInfoText}
              audioFile={audioFile}
              setAudioFile={setAudioFile}
              contextFile={contextFile}
              setContextFile={setContextFile}
              contextData={contextData}
              setContextData={setContextData}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              aiInstructions={aiInstructions}
              setAiInstructions={setAiInstructions}
              handleExtractProfile={handleExtractProfile}
              handleStartAnalysis={handleStartAnalysis}
              handleClearAll={handleClearAll}
              isExtractingProfile={isExtractingProfile}
              isAnalyzing={isAnalyzing}
              dragActive={dragActive}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              audioInputRef={audioInputRef}
              contextInputRef={contextInputRef}
              handleAudioFile={handleAudioFile}
              handleContextFile={handleContextFile}
            />
          )}

          {activeTab === TabType.SYSTEM_PROMPT && (
            <SystemPromptView
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              saveAsDefault={saveAsDefault}
              restoreDefaults={restoreDefaults}
              profileBuilderPrompt={profileBuilderPrompt}
              setProfileBuilderPrompt={setProfileBuilderPrompt}
            />
          )}

          {activeTab === TabType.DICTIONARY && (
            <TuningView
              naturalLanguageInput={naturalLanguageInput}
              setNaturalLanguageInput={setNaturalLanguageInput}
              handleNLConvertToLogic={handleNLConvertToLogic}
              isSyncingRules={isSyncingRules}
              ruleDefinitionText={ruleDefinitionText}
              setRuleDefinitionText={setRuleDefinitionText}
              saveRulesAsDefault={saveRulesAsDefault}
              restoreRulesDefault={restoreRulesDefault}
              handleSyncTextToTable={handleSyncTextToTable}
              rules={rules}
              updateRuleValue={updateRuleValue}
              cyclePriority={cyclePriority}
            />
          )}

          {activeTab === TabType.HISTORY && (
            <LogsView
              history={normalHistory}
              historyFilter={historyFilter}
              setHistoryFilter={setHistoryFilter}
              historySort={historySort}
              setHistorySort={setHistorySort}
              historyFavoritesOnly={historyFavoritesOnly}
              setHistoryFavoritesOnly={setHistoryFavoritesOnly}
              toggleFavorite={toggleFavorite}
              setEntryStatus={setEntryStatus}
              deleteEntry={deleteEntry}
              onSelect={handleHistorySelect}
            />
          )}

          {activeTab === TabType.FOLLOW_UP && (
            <QueueView
              history={followUpHistory}
              queueFilter={queueFilter}
              setQueueFilter={setQueueFilter}
              queueSort={queueSort}
              setQueueSort={setQueueSort}
              toggleFavorite={toggleFavorite}
              setEntryStatus={setEntryStatus}
              deleteEntry={deleteEntry}
              onSelect={handleHistorySelect}
            />
          )}

          {activeTab === TabType.ARCHITECTURE && (
            <ArchitectureView 
              history={history}
              rules={rules}
              followUpHistory={followUpHistory}
            />
          )}

          {activeTab === TabType.ANALYSIS && (
            <AnalysisView />
          )}

          {activeTab === TabType.VERDICT && result && (
            <VerdictView
              result={result}
              analysisContext={analysisContext}
              rules={rules}
              handleDeleteSignal={handleDeleteSignal}
              resetAudit={handleResetAudit}
            />
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
