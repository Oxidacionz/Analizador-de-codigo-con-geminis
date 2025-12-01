import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import Workspace from './components/Workspace';
import ChatPanel from './components/ChatPanel';
import { Role, ChatMessage as IChatMessage, ModelConfig, DEFAULT_CONFIG, ProjectFile } from './types';
import { 
  Send, Paperclip, Loader2, X, Github, Wand2, ArrowRight, ArrowLeft,
  Save, History, Download, Rocket, Share2, Key, PenLine, Search
} from 'lucide-react';
import { processZipFile, formatProjectContext } from './utils/fileProcessor';
import { fetchGitHubRepoContents, parseGitHubUrl } from './utils/githubUtils';
import { parseAIResponse } from './utils/responseParser';

type ViewMode = 'landing' | 'workspace';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // GitHub State
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [connectedRepo, setConnectedRepo] = useState<string | null>(null);
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Landing specific state
  const landingFileRef = useRef<HTMLInputElement>(null);

  // Auto-sync effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (autoSync && connectedRepo && githubUrl && githubToken && !isSyncingGithub) {
       interval = setInterval(() => {
         handleGithubSync(true);
       }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoSync, connectedRepo, githubUrl, githubToken, isSyncingGithub]);

  const updateFilesWithAIResponse = (responseFiles: ProjectFile[]) => {
      if (responseFiles.length === 0) return;

      setUploadedFiles(prevFiles => {
          const newFilesMap = new Map(prevFiles.map(f => [f.path, f]));
          
          responseFiles.forEach(newFile => {
              newFilesMap.set(newFile.path, newFile);
          });

          return Array.from(newFilesMap.values());
      });
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && uploadedFiles.length === 0) || isLoading) return;

    // Transition to workspace if in landing mode
    if (viewMode === 'landing') {
        setViewMode('workspace');
    }

    const currentText = inputText;
    setInputText('');

    const userMessage: IChatMessage = {
      id: uuidv4(),
      role: Role.USER,
      text: currentText,
      files: uploadedFiles.length > 0 && messages.length === 0 ? uploadedFiles : undefined 
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let promptContent = currentText;
      
      // Inject File Context
      if (uploadedFiles.length > 0) {
        // We only send the full context if it's the first message or if specifically requested.
        // For efficiency in this demo, we send it if message history is low or it's a fresh sync.
        // Ideally, we'd manage a context window.
        const fileContext = formatProjectContext(uploadedFiles);
        promptContent = `${currentText}\n\n[SYSTEM: Current Project Context (${uploadedFiles.length} files).]\n${fileContext}`;
      }

      const historyContents = messages.map(m => {
        return {
          role: m.role,
          parts: [{ text: m.text }]
        };
      });

      historyContents.push({
        role: 'user',
        parts: [{ text: promptContent }]
      });

      const response = await ai.models.generateContent({
        model: config.modelName,
        contents: historyContents,
        config: {
          temperature: config.temperature,
          topK: config.topK,
          topP: config.topP,
          maxOutputTokens: config.maxOutputTokens,
          systemInstruction: config.systemInstruction,
        }
      });

      const rawResponseText = response.text || "No response text.";
      
      // Parse response to find code updates
      const { text, files } = parseAIResponse(rawResponseText);
      
      // Update UI with files
      updateFilesWithAIResponse(files);

      const botMessage: IChatMessage = {
        id: uuidv4(),
        role: Role.MODEL,
        text: rawResponseText // We keep raw text for chat to show potential explanations, though ChatPanel cleans it
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Gemini Error:", error);
      const errorMessage: IChatMessage = {
        id: uuidv4(),
        role: Role.MODEL,
        text: "Error generating response. Please try again.",
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isZip = file.name.endsWith('.zip');
      
      setIsProcessing(true);
      setConnectedRepo(null);
      setAutoSync(false);
      
      try {
        if (isZip) {
          const files = await processZipFile(file);
          setUploadedFiles(files);
          if (viewMode === 'landing' && !inputText) {
             setInputText(`Uploaded ${file.name}. Analyze structure.`);
          }
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string;
            setUploadedFiles(prev => [...prev, { path: file.name, content: content, language: 'text' }]);
          };
          reader.readAsText(file);
        }
      } catch (error) {
        console.error("File Error", error);
        alert("Error al procesar el archivo.");
      } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleGithubConnect = async () => {
    if (!githubUrl) return;
    
    setIsSyncingGithub(true);
    setShowGithubInput(false);
    
    try {
      const { files, error } = await fetchGitHubRepoContents(githubUrl, githubToken);
      if (error) {
        alert(error);
        return;
      }
      setUploadedFiles(files);
      const repoInfo = parseGitHubUrl(githubUrl);
      const repoName = repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : githubUrl;
      setConnectedRepo(repoName);
      setLastSynced(new Date());
      
      if (viewMode === 'landing' && !inputText) {
        setInputText(`Connected to ${repoName}. Explain project structure.`);
      }
    } finally {
      setIsSyncingGithub(false);
    }
  };

  const handleGithubSync = async (silent = false) => {
    if (!githubUrl) return;
    if (!silent) setIsSyncingGithub(true);
    try {
        const { files, error } = await fetchGitHubRepoContents(githubUrl, githubToken);
        if (error) {
            if (!silent) alert("Sync Error: " + error);
        } else {
            setUploadedFiles(files);
            setLastSynced(new Date());
        }
    } finally {
        if (!silent) setIsSyncingGithub(false);
    }
  };

  const backToStart = () => {
      setViewMode('landing');
      setMessages([]);
      setUploadedFiles([]);
      setConnectedRepo(null);
  };

  // --------------------------------------------------------------------------
  // RENDER: Landing View
  // --------------------------------------------------------------------------
  if (viewMode === 'landing') {
      return (
        <div className="flex h-screen w-full bg-[#1e1e1e] overflow-hidden">
            {/* Sidebar remains available in landing for configuration */}
            <Sidebar 
                config={config} 
                setConfig={setConfig} 
                files={uploadedFiles}
                connectedRepo={connectedRepo}
                isSyncing={isSyncingGithub}
                onSync={() => handleGithubSync(false)}
                lastSynced={lastSynced}
                autoSync={autoSync}
                setAutoSync={setAutoSync}
                onRemoveContext={() => setUploadedFiles([])}
            />
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                 {/* Background ambient glow */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

                 <h1 className="text-4xl md:text-5xl text-[#e8eaed] mb-8 font-normal tracking-tight z-10 text-center">
                  Analyze your code with <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Gemini</span>
                </h1>

                {/* Main Input Card */}
                <div className="w-full max-w-2xl bg-[#303134] rounded-2xl border border-[#3c4043] p-4 shadow-xl z-10">
                    <div className="mb-2">
                        <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                            }
                        }}
                        placeholder="Load a project and ask questions..."
                        className="w-full bg-transparent text-white text-lg placeholder-gray-500 outline-none resize-none h-12"
                        />
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1e1e] border border-[#3c4043] text-gray-300 text-xs hover:bg-[#3c4043] transition-colors">
                            <span className="text-blue-400">❖</span> {config.modelName}
                        </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <input 
                                type="file" 
                                ref={landingFileRef}
                                className="hidden" 
                                accept=".zip,.txt,.js,.ts,.tsx,.py,.html,.css,.json,.md"
                                onChange={handleFileUpload}
                            />
                            <button 
                                onClick={() => landingFileRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#3c4043] transition-colors"
                                title="Upload ZIP"
                            >
                                <Paperclip size={20} />
                            </button>
                            <button 
                                onClick={() => setShowGithubInput(true)}
                                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#3c4043] transition-colors"
                                title="Connect GitHub"
                            >
                                <Github size={20} />
                            </button>
                            <button 
                                onClick={handleSendMessage}
                                disabled={!inputText && uploadedFiles.length === 0}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    inputText || uploadedFiles.length > 0
                                    ? 'bg-blue-200 text-blue-900 hover:bg-blue-300' 
                                    : 'bg-[#3c4043] text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                Analyze
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full max-w-4xl z-10 px-4">
                    <div className="bg-[#303134]/50 border border-[#3c4043] p-4 rounded-xl hover:bg-[#303134] transition-colors cursor-pointer group">
                        <div className="text-blue-400 mb-2 group-hover:scale-110 transition-transform origin-left"><Wand2 size={24} /></div>
                        <h3 className="text-white font-medium mb-1">Architecture Review</h3>
                        <p className="text-xs text-gray-400">Understand the system design and patterns.</p>
                    </div>
                    <div className="bg-[#303134]/50 border border-[#3c4043] p-4 rounded-xl hover:bg-[#303134] transition-colors cursor-pointer group">
                         <div className="text-purple-400 mb-2 group-hover:scale-110 transition-transform origin-left"><Github size={24} /></div>
                        <h3 className="text-white font-medium mb-1">Repo Inspector</h3>
                        <p className="text-xs text-gray-400">Scan a repo for bugs or security issues.</p>
                    </div>
                </div>

                {/* GitHub Modal reused */}
                {showGithubInput && (
                    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-[#202124] border border-[#5f6368] rounded-xl shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl text-white font-medium flex items-center gap-2">Import from GitHub</h3>
                                <button onClick={() => setShowGithubInput(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="https://github.com/owner/repo"
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    className="w-full bg-[#303134] border border-[#5f6368] rounded-lg p-3 text-white text-sm outline-none"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Token (Optional)"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    className="w-full bg-[#303134] border border-[#5f6368] rounded-lg p-3 text-white text-sm outline-none"
                                />
                                <button 
                                    onClick={handleGithubConnect}
                                    disabled={!githubUrl || isSyncingGithub}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    {isSyncingGithub ? <Loader2 className="animate-spin" /> : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // --------------------------------------------------------------------------
  // RENDER: Workspace View (IDE Mode)
  // --------------------------------------------------------------------------
  return (
    <div className="flex h-screen w-full bg-[#1e1e1e] overflow-hidden flex-col">
        {/* Top Header - Workspace Mode */}
        <header className="h-14 bg-[#1e1e1e] border-b border-[#3c4043] flex items-center justify-between px-4 shrink-0">
             {/* Left: Back Button */}
             <div className="flex items-center">
                <button 
                  onClick={backToStart} 
                  className="flex items-center gap-2 bg-[#303134] hover:bg-[#3c4043] text-gray-200 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to start
                </button>
             </div>

             {/* Center: Project Title */}
             <div className="flex items-center gap-2 group cursor-pointer absolute left-1/2 -translate-x-1/2">
                 <span className="text-sm font-medium text-gray-200">
                    {connectedRepo ? connectedRepo : 'Project Analyzer'}
                 </span>
                 <PenLine size={14} className="text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>

             {/* Right: Actions Toolbar */}
             <div className="flex items-center gap-2">
                 <button className="p-2 text-gray-400 hover:text-gray-200 rounded-full hover:bg-[#303134] transition-colors" title="Save Analysis">
                    <Save size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-gray-200 rounded-full hover:bg-[#303134] transition-colors" title="History">
                    <History size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-gray-200 rounded-full hover:bg-[#303134] transition-colors" title="Export Report">
                    <Download size={18} />
                 </button>
                 
                 {/* GitHub Sync Button */}
                 <button 
                    onClick={() => handleGithubSync(false)} 
                    disabled={!connectedRepo || isSyncingGithub}
                    className="p-2 text-gray-400 hover:text-gray-200 rounded-full hover:bg-[#303134] transition-colors disabled:opacity-50"
                    title={connectedRepo ? "Sync Repository" : "No repo connected"}
                 >
                     <div className={isSyncingGithub ? "animate-spin" : ""}>
                        <Github size={18} />
                     </div>
                 </button>

                 <button className="p-2 text-gray-400 hover:text-blue-400 rounded-full hover:bg-[#303134] transition-colors" title="Run / Check">
                    <Rocket size={18} />
                 </button>
                 
                 <div className="w-[1px] h-5 bg-[#3c4043] mx-1"></div>

                 <button className="p-2 text-gray-400 hover:text-gray-200 rounded-full hover:bg-[#303134] transition-colors" title="Share">
                    <Share2 size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-yellow-400 rounded-full hover:bg-[#303134] transition-colors" title="API Key">
                    <Key size={18} />
                 </button>
             </div>
        </header>

        {/* Main Split Content */}
        <div className="flex-1 flex overflow-hidden">
             {/* Left: Chat Assistant (Fixed width) */}
             <div className="w-[400px] min-w-[320px] flex-shrink-0 border-r border-[#3c4043]">
                 <ChatPanel 
                    messages={messages} 
                    inputText={inputText}
                    setInputText={setInputText}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                 />
             </div>

             {/* Right: Code Workspace */}
             <div className="flex-1 min-w-0">
                 <Workspace files={uploadedFiles} />
             </div>
        </div>
    </div>
  );
}

export default App;