
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  files?: ProjectFile[];
  isError?: boolean;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface ModelConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
  systemInstruction: string;
  modelName: string;
}

export const DEFAULT_CONFIG: ModelConfig = {
  temperature: 1,
  topK: 64,
  topP: 0.95,
  maxOutputTokens: 8192,
  // Updated System Instruction to enforce XML output for file generation
  systemInstruction: `You are an expert Senior Full Stack Engineer. 
  When the user asks to create, modify or analyze code, you MUST provide the file contents.
  
  CRITICAL: If you are generating code that belongs to a file, you MUST format it using this specific XML tag structure so the IDE can render it:
  
  <file path="path/to/filename.ext">
  ... content ...
  </file>
  
  Example:
  <file path="src/App.tsx">
  import React from 'react';
  export default function App() { return <div>Hello</div>; }
  </file>
  
  Also provide a brief explanation in markdown outside the tags. 
  If analyzing a project, act as a helpful architect.`,
  modelName: 'gemini-2.5-flash'
};

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' }, 
];