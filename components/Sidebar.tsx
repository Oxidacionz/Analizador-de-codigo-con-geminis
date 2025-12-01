import React from 'react';
import { ModelConfig, AVAILABLE_MODELS, ProjectFile } from '../types';
import { Settings, Sliders, MessageSquare, Box, Folder, FileCode, RefreshCw, Github, Trash2, Clock, Search } from 'lucide-react';

interface SidebarProps {
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  files: ProjectFile[];
  connectedRepo: string | null;
  isSyncing: boolean;
  onSync: () => void;
  lastSynced: Date | null;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  onRemoveContext: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    config, setConfig, files, connectedRepo, isSyncing, onSync, lastSynced, autoSync, setAutoSync, onRemoveContext
}) => {
  
  const handleChange = <K extends keyof ModelConfig>(key: K, value: ModelConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-72 bg-[#202124] border-r border-[#3c4043] flex flex-col h-full text-sm font-sans">
      <div className="p-4 border-b border-[#3c4043] flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold">
           PA
        </div>
        <div>
           <h1 className="text-md font-medium text-gray-200 leading-tight">Project Analyzer</h1>
           <p className="text-[10px] text-gray-400">Pro Edition</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Project Context Section */}
        <div className="p-4 border-b border-[#3c4043]">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Project Context</h2>
                {files.length > 0 && (
                    <button onClick={onRemoveContext} className="text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            {files.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-2 border border-dashed border-[#3c4043] rounded text-center">
                    No files loaded
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Repo/Source Header */}
                    <div className="bg-[#303134] rounded p-2 border border-[#3c4043]">
                        <div className="flex items-center gap-2 mb-2">
                             {connectedRepo ? <Github size={14} className="text-purple-400"/> : <Folder size={14} className="text-yellow-500"/>}
                             <span className="font-medium text-gray-200 truncate flex-1" title={connectedRepo || "Local Zip"}>
                                {connectedRepo ? connectedRepo : "Local Project"}
                             </span>
                        </div>
                        
                        {connectedRepo && (
                            <div className="flex flex-col gap-2 pt-2 border-t border-[#3c4043]/50">
                                <div className="flex items-center justify-between">
                                    <button 
                                        onClick={onSync}
                                        disabled={isSyncing}
                                        className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50"
                                    >
                                        <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                                        {isSyncing ? "Syncing..." : "Sync Now"}
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-gray-400 cursor-pointer select-none">Auto-sync</label>
                                        <div 
                                            onClick={() => setAutoSync(!autoSync)}
                                            className={`w-6 h-3 rounded-full relative cursor-pointer transition-colors ${autoSync ? 'bg-blue-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${autoSync ? 'left-3.5' : 'left-0.5'}`}></div>
                                        </div>
                                    </div>
                                </div>
                                {lastSynced && (
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                        <Clock size={10} />
                                        Last: {lastSynced.toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* File Tree Explorer */}
                    <div className="space-y-0.5 pl-1 max-h-48 overflow-y-auto">
                        <div className="text-[10px] text-gray-500 mb-1">{files.length} files loaded</div>
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#3c4043] group cursor-default">
                                <FileCode size={12} className="text-gray-500 group-hover:text-gray-300" />
                                <span className="text-xs text-gray-400 group-hover:text-gray-200 truncate">{file.path}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Model Settings Section */}
        <div className="p-4 space-y-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Run Settings</h2>
            
            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-gray-300 text-xs font-medium flex items-center gap-2">
                        Model
                    </label>
                    <select 
                        className="w-full bg-[#303134] border border-[#5f6368] rounded p-1.5 text-white text-xs focus:outline-none focus:border-blue-400"
                        value={config.modelName}
                        onChange={(e) => handleChange('modelName', e.target.value)}
                    >
                        {AVAILABLE_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-gray-300 text-xs font-medium flex items-center gap-2">
                        System Instructions
                    </label>
                    <textarea 
                        className="w-full h-24 bg-[#303134] border border-[#5f6368] rounded p-2 text-white focus:outline-none focus:border-blue-400 resize-none text-xs font-mono placeholder-gray-600"
                        value={config.systemInstruction}
                        onChange={(e) => handleChange('systemInstruction', e.target.value)}
                        placeholder="e.g. You are an expert backend engineer..."
                    />
                </div>

                <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Temperature</span>
                        <span>{config.temperature}</span>
                        </div>
                        <input 
                        type="range" min="0" max="2" step="0.1"
                        value={config.temperature}
                        onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                        className="w-full accent-blue-400 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="p-3 border-t border-[#3c4043] bg-[#202124]">
         <button className="w-full py-1.5 rounded bg-[#303134] hover:bg-[#3c4043] border border-[#5f6368] text-xs text-blue-300 transition-colors">
            Get API Key
         </button>
      </div>
    </div>
  );
};

export default Sidebar;