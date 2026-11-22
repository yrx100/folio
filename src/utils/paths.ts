import { EntryItem } from '../types';

export function leafName(fullPath: string): string {
  const parts = fullPath.split('\\').filter(Boolean);
  return parts[parts.length - 1] || fullPath;
}

export function folderItem(fullPath: string): EntryItem {
  return { path: fullPath, name: leafName(fullPath), dir: true, link: false };
}

export function parentPath(current: string, root: string): string {
  if (!current || current === root) return root;
  const idx = current.lastIndexOf('\\');
  if (idx < 0) return root;
  const parent = current.slice(0, idx);
  return parent.length < root.length ? root : parent;
}

export interface Crumb {
  name: string;
  path: string;
}

export function buildBreadcrumbs(root: string, current: string): Crumb[] {
  if (!root) return [];
  const crumbs: Crumb[] = [{ name: leafName(root), path: root }];
  const relative = current.slice(root.length).split('\\').filter(Boolean);
  for (const part of relative) {
    const prev = crumbs[crumbs.length - 1].path.replace(/\\$/, '');
    crumbs.push({ name: part, path: `${prev}\\${part}` });
  }
  return crumbs;
}

export function driveBadge(fullPath: string): string {
  const match = fullPath.match(/^([A-Za-z]:)/);
  return match ? match[1].toUpperCase() : 'DIR';
}

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}

export type FileCategory = 'folder' | 'pdf' | 'doc' | 'code' | 'media' | 'sheet' | 'archive' | 'other';

export function classifyEntry(item: Pick<EntryItem, 'name' | 'dir'>): { category: FileCategory; label: string; ext: string } {
  if (item.dir) return { category: 'folder', label: '文件夹', ext: '' };
  const ext = fileExtension(item.name);
  if (ext === 'pdf') return { category: 'pdf', label: 'PDF 文档', ext: 'PDF' };
  if (/^(md|markdown|txt|rtf|docx?|odt|pages)$/.test(ext)) return { category: 'doc', label: ext ? `${ext.toUpperCase()} 文档` : '文本文档', ext: ext.toUpperCase() };
  if (/^(xlsx?|csv|tsv|numbers)$/.test(ext)) return { category: 'sheet', label: `${ext.toUpperCase()} 表格`, ext: ext.toUpperCase() };
  if (/^(png|jpe?g|webp|gif|svg|bmp|ico|avif|psd|ai|fig|sketch)$/.test(ext)) return { category: 'media', label: `${ext.toUpperCase()} 图像`, ext: ext.toUpperCase() };
  if (/^(tsx?|jsx?|mjs|cjs|css|scss|less|html?|xml|json|ya?ml|toml|py|cs|cpp|c|h|rs|go|java|kt|swift|sh|ps1|sql)$/.test(ext)) {
    return { category: 'code', label: `${ext.toUpperCase()} 源码`, ext: ext.toUpperCase() };
  }
  if (/^(zip|rar|7z|tar|gz|bz2)$/.test(ext)) return { category: 'archive', label: `${ext.toUpperCase()} 压缩包`, ext: ext.toUpperCase() };
  return { category: 'other', label: ext ? `${ext.toUpperCase()} 文件` : '本地文件', ext: ext.toUpperCase() };
}

export function formatBytes(bytes?: number): string {
  if (bytes == null || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatTimestamp(ms?: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
