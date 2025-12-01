import React, { useRef, useEffect } from 'react';
import { ChatMessage as IChatMessage, Role } from '../types';
import { Bot, User, Send, Loader2, Sparkles, CornerDownLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
  messages: IChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, inputText, setInputText, onSendMessage, isLoading 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="h-12 border-b border-[#3c4043] flex items-center px-4 gap-2 bg-[#1e1e1e]">
        <Sparkles size={16} className="text-blue-400" />
        <span className="text-sm font-medium text-gray-200">Code assistant</span>
        <div className="flex-1" />
        <button className="text-gray-500 hover:text-gray-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg) => {
            const isModel = msg.role === Role.MODEL;
            return (
                <div key={msg.id} className={`flex gap-3 ${isModel ? '' : 'flex-row-reverse'}`}>
                     <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${isModel ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-600 text-gray-200'}`}>
                        {isModel ? <Bot size={14} /> : <User size={14} />}
                     </div>
                     <div className={`flex-1 max-w-[90%] text-sm leading-relaxed ${isModel ? 'text-gray-300' : 'text-gray-100 bg-[#303134] p-3 rounded-lg rounded-tr-none'}`}>
                        {isModel ? (
                            <div className="prose prose-invert prose-xs max-w-none">
                                <ReactMarkdown
                                    components={{
                                        // Hide code blocks in chat if we are in workspace mode, 
                                        // or just show a small reference, because they are in the right panel.
                                        // For now, we show them but maybe simplified.
                                        code({node, inline, className, children, ...props}: any) {
                                            return <code className={`${className} bg-[#303134] px-1 py-0.5 rounded text-blue-200`} {...props}>{children}</code>
                                        }
                                    }}
                                >
                                    {msg.text.replace(/```[\s\S]*?```/g, '_Updated files in workspace_')}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            msg.text
                        )}
                        
                        {/* Status indicators like "Analyzed errors..." */}
                        {isModel && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                                <span>Generated in 1.2s</span>
                            </div>
                        )}
                     </div>
                </div>
            )
        })}
        {isLoading && (
            <div className="flex gap-3">
                 <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mt-1">
                    <Loader2 size={14} className="animate-spin" />
                 </div>
                 <div className="flex-1 space-y-2">
                     <div className="h-2 w-24 bg-[#303134] rounded animate-pulse"></div>
                     <div className="h-2 w-16 bg-[#303134] rounded animate-pulse"></div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#1e1e1e]">
        <div className="relative bg-[#303134] border border-[#5f6368] rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all">
            <textarea 
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask follow-up..."
                className="w-full bg-transparent text-white text-sm px-4 py-3 outline-none resize-none max-h-32 rounded-2xl placeholder-gray-500"
                rows={1}
                disabled={isLoading}
            />
            <div className="flex justify-between items-center px-2 pb-2">
                 <div className="flex gap-1">
                    {/* Attach, Voice etc buttons could go here */}
                 </div>
                 <button 
                    onClick={onSendMessage}
                    disabled={!inputText.trim() || isLoading}
                    className="p-1.5 rounded-full bg-transparent hover:bg-[#3c4043] text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                 >
                    <CornerDownLeft size={16} />
                 </button>
            </div>
        </div>
        <div className="text-[10px] text-center text-gray-600 mt-2">
            AI Studio may display inaccurate info, including about people, so double-check its responses.
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
