import { ProjectFile } from '../types';
import { EXTENSION_MAP, IGNORED_DIRS, IGNORED_FILES } from './fileProcessor';

interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export const parseGitHubUrl = (url: string): GitHubRepoInfo | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') return null;
    
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    return {
      owner: parts[0],
      repo: parts[1],
      branch: parts.length > 3 && parts[2] === 'tree' ? parts[3] : 'main' // Default to main if not specified
    };
  } catch (e) {
    return null;
  }
};

export const fetchGitHubRepoContents = async (
  url: string, 
  token?: string
): Promise<{ files: ProjectFile[], error?: string }> => {
  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    return { files: [], error: 'URL de GitHub inválida' };
  }

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    // 1. Get the Reference (Branch commit SHA) to ensure we get the tree
    const branchUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/branches/${repoInfo.branch}`;
    const branchRes = await fetch(branchUrl, { headers });
    
    if (!branchRes.ok) {
        // Try 'master' if 'main' fails and user didn't specify
        if (repoInfo.branch === 'main') {
            const masterUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/branches/master`;
            const masterRes = await fetch(masterUrl, { headers });
            if (masterRes.ok) {
                const data = await masterRes.json();
                repoInfo.branch = 'master'; // update branch
            } else {
                return { files: [], error: `No se pudo acceder al repositorio/rama. Verifica que sea público o el token sea válido.` };
            }
        } else {
            return { files: [], error: `No se encontró la rama ${repoInfo.branch}` };
        }
    }

    // 2. Fetch the Tree (Recursive)
    const treeUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.branch}?recursive=1`;
    const treeRes = await fetch(treeUrl, { headers });
    
    if (!treeRes.ok) {
      return { files: [], error: 'Error obteniendo el árbol de archivos. Límite de API excedido o repositorio privado.' };
    }

    const treeData = await treeRes.json();
    
    // 3. Filter Files
    // Limit to 50 files to prevent rate limiting and token overflow in this demo
    const MAX_FILES = 50; 
    let processedCount = 0;

    const filesToFetch = treeData.tree.filter((node: any) => {
      if (node.type !== 'blob') return false;
      if (processedCount >= MAX_FILES) return false;

      const pathParts = node.path.split('/');
      
      // Ignore directories
      if (pathParts.some((part: string) => IGNORED_DIRS.includes(part))) return false;
      
      // Ignore specific files
      const fileName = pathParts[pathParts.length - 1];
      if (IGNORED_FILES.includes(fileName)) return false;

      // Check extension
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      if (!EXTENSION_MAP[extension] && extension !== 'txt' && extension !== 'md' && extension !== 'env') return false;

      processedCount++;
      return true;
    });

    // 4. Fetch Content for filtered files
    // Use Promise.all with chunks or sequential to be nicer to API?
    // Parallel is faster but risky for rate limits without token.
    
    const files: ProjectFile[] = [];

    for (const node of filesToFetch) {
      // Use the blob URL which returns base64 content
      const blobRes = await fetch(node.url, { headers });
      if (blobRes.ok) {
        const blobData = await blobRes.json();
        // Decode Base64
        try {
          const content = atob(blobData.content.replace(/\n/g, ''));
          const extension = node.path.split('.').pop()?.toLowerCase() || '';
          
          files.push({
            path: node.path,
            content: content,
            language: EXTENSION_MAP[extension] || 'text'
          });
        } catch (e) {
          console.warn(`Error decoding ${node.path}`);
        }
      }
    }

    return { files };

  } catch (error) {
    console.error(error);
    return { files: [], error: 'Error de conexión con GitHub.' };
  }
};