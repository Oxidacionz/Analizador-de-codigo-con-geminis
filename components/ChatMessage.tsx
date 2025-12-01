import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, ChatMessage as IChatMessage } from '../types';
import { Bot, User, FileCode, AlertCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: IChatMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === Role.MODEL;

  return (
    <div className={`flex w-full ${isModel ? 'bg-transparent' : 'bg-[#2b2d30]'} p-6 border-b border-[#3c4043]/50`}>
      <div className="max-w-4xl mx-auto flex gap-6 w-full">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isModel ? (
             <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
               <Bot size={20} />
             </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-200">
              <User size={20} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden space-y-2">
          <div className="font-medium text-sm text-gray-300 mb-1">
            {isModel ? 'Gemini' : 'Usuario'}
          </div>

          {message.isError && (
             <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm flex items-center gap-2">
               <AlertCircle size={16} />
               Hubo un error al generar la respuesta.
             </div>
          )}

          {/* Project Files Attachment Display */}
          {message.files && message.files.length > 0 && (
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3c4043] text-xs text-blue-200 border border-blue-500/30">
                <FileCode size={12} />
                <span>{message.files.length} archivos de proyecto analizados</span>
              </div>
              <div className="mt-2 max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.files.slice(0, 6).map((f, idx) => (
                  <div key={idx} className="bg-[#202124] p-2 rounded border border-[#3c4043] text-xs font-mono text-gray-400 truncate">
                    {f.path}
                  </div>
                ))}
                {message.files.length > 6 && (
                   <div className="bg-[#202124] p-2 rounded border border-[#3c4043] text-xs text-gray-500 italic">
                     + {message.files.length - 6} más...
                   </div>
                )}
              </div>
            </div>
          )}

          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({node, inline, className, children, ...props}: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      {...props}
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;