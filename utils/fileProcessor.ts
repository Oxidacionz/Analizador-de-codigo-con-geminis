import JSZip from 'jszip';
import { ProjectFile } from '../types';

// Map extensions to languages for syntax highlighting or filtering
export const EXTENSION_MAP: Record<string, string> = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'html': 'html',
  'css': 'css',
  'json': 'json',
  'md': 'markdown',
  'sql': 'sql',
  'java': 'java',
  'c': 'c',
  'cpp': 'cpp',
  'rs': 'rust',
  'go': 'go',
  'rb': 'ruby',
  'php': 'php',
  'txt': 'text',
  'xml': 'xml',
  'yaml': 'yaml',
  'yml': 'yaml',
  'sh': 'bash',
  'bat': 'batch'
};

export const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'vendor', 'target', '.idea', '.vscode'];
export const IGNORED_FILES = ['package-lock.json', 'yarn.lock', '.DS_Store', 'pnpm-lock.yaml'];

export const processZipFile = async (file: File): Promise<ProjectFile[]> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const files: ProjectFile[] = [];

  const entries = Object.entries(loadedZip.files);

  for (const [relativePath, zipEntry] of entries) {
    const entry = zipEntry as any;
    if (entry.dir) continue;

    // Check for ignored directories
    const pathParts = relativePath.split('/');
    if (pathParts.some(part => IGNORED_DIRS.includes(part))) continue;
    
    // Check for ignored files
    const fileName = pathParts[pathParts.length - 1];
    if (IGNORED_FILES.includes(fileName)) continue;

    // Determine extension
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Only process text files we understand or plain text
    if (!EXTENSION_MAP[extension] && extension !== 'txt' && extension !== 'md' && extension !== 'env') {
       // Skip binary files or unknown extensions to save tokens/memory
       continue;
    }

    try {
      const content = await entry.async('string');
      files.push({
        path: relativePath,
        content: content,
        language: EXTENSION_MAP[extension] || 'text'
      });
    } catch (err) {
      console.warn(`Failed to read file ${relativePath}`, err);
    }
  }

  return files;
};

export const formatProjectContext = (files: ProjectFile[]): string => {
  return files.map(f => `
--- BEGIN FILE: ${f.path} ---
${f.content}
--- END FILE: ${f.path} ---
`).join('\n');
};