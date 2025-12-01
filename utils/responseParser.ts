import { ProjectFile } from '../types';

export interface ParsedResponse {
  text: string;
  files: ProjectFile[];
}

/**
 * Parses the AI response to extract code blocks that represent files.
 * It looks for patterns like:
 * 
 * ```javascript:src/index.js
 * ... code ...
 * ```
 * 
 * or XML format if requested:
 * <file path="src/index.js">
 * ... code ...
 * </file>
 */
export const parseAIResponse = (response: string): ParsedResponse => {
  const files: ProjectFile[] = [];
  let cleanText = response;

  // 1. Try to extract XML format (Robust)
  const xmlRegex = /<file\s+path=["']([^"']+)["'][^>]*>([\s\S]*?)<\/file>/g;
  let match;
  while ((match = xmlRegex.exec(response)) !== null) {
    const path = match[1];
    const content = match[2].trim(); // CDATA handling might be needed if strictly XML, but usually raw string in regex
    const extension = path.split('.').pop() || 'text';
    
    files.push({
      path,
      content,
      language: getLanguageFromExtension(extension)
    });
  }

  // 2. If no XML, try Markdown code blocks with filenames
  // Regex matches: ```language:filename OR ```filename
  const codeBlockRegex = /```(\w+)?(?::(\S+))?\n([\s\S]*?)```/g;
  
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const lang = match[1] || '';
    const filenameFromBlock = match[2]; // Captured from language:filename
    const content = match[3];

    // We only treat it as a file update if a filename is explicitly provided in the code block info
    // or if we can infer it from context (omitted for safety in this version)
    if (filenameFromBlock) {
       files.push({
         path: filenameFromBlock,
         content: content,
         language: lang || getLanguageFromExtension(filenameFromBlock.split('.').pop() || '')
       });
    }
  }

  return {
    text: cleanText,
    files
  };
};

const getLanguageFromExtension = (ext: string): string => {
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown'
  };
  return map[ext.toLowerCase()] || 'text';
};
