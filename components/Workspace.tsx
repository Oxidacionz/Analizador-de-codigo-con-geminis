import React, { useState, useEffect } from 'react';
import { ProjectFile } from '../types';
import { Play, Code2, Monitor, Smartphone, Maximize2, FolderOpen, FileCode, ChevronRight, ChevronDown } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface WorkspaceProps {
  files: ProjectFile[];
}

type Tab = 'preview' | 'code';

const Workspace: React.FC<WorkspaceProps> = ({ files }) => {
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  
  // Update selected file if the file list changes and current selection is invalid or empty
  useEffect(() => {
    if (files.length > 0) {
      if (!selectedFile || !files.find(f => f.path === selectedFile.path)) {
        // Prefer index.html, App.tsx, index.js etc.
        const priority = ['index.html', 'App.tsx', 'index.tsx', 'main.py', 'index.js'];
        const match = files.find(f => priority.some(p => f.path.endsWith(p))) || files[0];
        setSelectedFile(match);
      } else {
        // Refresh content of selected file
        const updated = files.find(f => f.path === selectedFile.path);
        if (updated) setSelectedFile(updated);
      }
    }
  }, [files]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#3c4043]">
      {/* Workspace Header / Tabs */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[#3c4043] bg-[#202124]">
        <div className="flex items-center gap-1 bg-[#303134] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'preview' ? 'bg-[#444746] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Play size={14} className={activeTab === 'preview' ? "text-green-400" : ""} />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'code' ? 'bg-[#444746] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code2 size={14} className={activeTab === 'code' ? "text-blue-400" : ""} />
            Code
          </button>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
           <button className="p-1.5 hover:bg-[#3c4043] rounded transition-colors" title="Fullscreen">
             <Maximize2 size={16} />
           </button>
           <div className="h-4 w-[1px] bg-[#3c4043] mx-1"></div>
           <button className="flex items-center gap-1 px-2 py-1 hover:bg-[#3c4043] rounded text-xs transition-colors">
             <Monitor size={14} />
             <span className="hidden sm:inline">Desktop</span>
           </button>
        </div>
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'preview' ? (
          <div className="h-full w-full bg-white flex items-center justify-center relative">
            {/* Simple Preview Handling */}
            {files.some(f => f.path.endsWith('.html')) ? (
                 <iframe 
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                    srcDoc={files.find(f => f.path.endsWith('index.html'))?.content || files.find(f => f.path.endsWith('.html'))?.content}
                 />
            ) : (
                <div className="text-center text-gray-500">
                    <Monitor size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No index.html found to preview.</p>
                    <p className="text-sm mt-2">Switch to Code tab to inspect files.</p>
                </div>
            )}
            
            {/* Overlay hint */}
            <div className="absolute top-4 right-4 bg-black/70 text-white text-[10px] px-2 py-1 rounded pointer-events-none">
                Static Preview
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            {/* File Tree Sidebar */}
            <div className="w-60 bg-[#202124] border-r border-[#3c4043] flex flex-col">
                <div className="p-3 text-[11px] font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2">
                    <FolderOpen size={14} />
                    Project Files
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {files.map((file) => (
                        <div 
                            key={file.path}
                            onClick={() => setSelectedFile(file)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs cursor-pointer border-l-2 transition-colors ${
                                selectedFile?.path === file.path 
                                ? 'bg-[#3c4043] text-blue-300 border-blue-400' 
                                : 'text-gray-400 border-transparent hover:bg-[#303134] hover:text-gray-200'
                            }`}
                        >
                            <FileCode size={14} className={selectedFile?.path === file.path ? "text-blue-400" : "text-gray-500"} />
                            <span className="truncate">{file.path}</span>
                        </div>
                    ))}
                    {files.length === 0 && (
                        <div className="p-4 text-xs text-gray-500 italic text-center">
                            No files generated yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Code Editor Area */}
            <div className="flex-1 bg-[#1e1e1e] flex flex-col overflow-hidden">
                {selectedFile ? (
                    <>
                        <div className="h-9 bg-[#1e1e1e] border-b border-[#3c4043] flex items-center px-4 text-xs text-gray-400 select-none">
                            {selectedFile.path}
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar relative">
                             <SyntaxHighlighter
                                language={selectedFile.language || 'text'}
                                style={vscDarkPlus}
                                customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '13px', lineHeight: '1.5' }}
                                showLineNumbers={true}
                                lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
                            >
                                {selectedFile.content}
                            </SyntaxHighlighter>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                        Select a file to view content
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspace;
