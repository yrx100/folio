import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowUpRight,
  CaretRight,
  FolderOpen,
  Info,
  SidebarSimple,
} from '@phosphor-icons/react';
import { onHostEvent, rpc } from '@/bridge';
import {
  AiProposal,
  BootPayload,
  EntryItem,
  FilterMode,
  ModelProfiles,
  NotesMap,
  SettingsPage,
  SortMode,
  UiPreferences,
  UndoRecord,
} from '@/types';
import { buildBreadcrumbs, folderItem, parentPath } from '@/utils/paths';
import {
  applyThemeToDocument,
  loadPreferences,
  pushRecentRoot,
  savePreferences,
} from '@/utils/prefs';
import { hasSeenGuide, showGuide } from '@/utils/guide';
import { cn, SPRING_SNAPPY } from '@/lib/utils';
import { BrandMark } from '@/components/BrandMark';
import { FileCards } from '@/components/FileCards';
import { FileList } from '@/components/FileList';
import { FolderHeader } from '@/components/FolderHeader';
import { Inspector } from '@/components/Inspector';
import { SettingsDialog } from '@/components/SettingsDialog';
import { Sidebar } from '@/components/Sidebar';
import { TitleBar } from '@/components/TitleBar';
import { Welcome } from '@/components/Welcome';
import { WorkspaceToolbar } from '@/components/WorkspaceToolbar';
import { Button } from '@/components/ui/button';
import { ToastBar } from '@/components/ui/toast-bar';

export function App({ boot }: { boot: BootPayload }) {
  const [prefs, setPrefs] = useState<UiPreferences>(() => loadPreferences());
  const [isDark, setIsDark] = useState<boolean>(() =>
    applyThemeToDocument(prefs.theme, prefs.accent, prefs.density)
  );

  const [root, setRoot] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lists, setLists] = useState<Record<string, EntryItem[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [treeLimits, setTreeLimits] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<NotesMap>({});

  const [selectedItem, setSelectedItem] = useState<EntryItem | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('default');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; isError: boolean }>({ text: '', isError: false });
  const [undo, setUndo] = useState<UndoRecord | null>(null);

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState<SettingsPage>('models');

  // Inspector & editing state
  const [inspectorDraft, setInspectorDraft] = useState('');
  const [inspectorOriginal, setInspectorOriginal] = useState('');
  const [inspectorError, setInspectorError] = useState('');
  const [inspectorFocusNonce, setInspectorFocusNonce] = useState(0);

  // Inline row editor state (used when inspector is closed)
  const [inlineItem, setInlineItem] = useState<EntryItem | null>(null);
  const [inlineDraft, setInlineDraft] = useState('');
  const [inlineOriginal, setInlineOriginal] = useState('');

  // Folder header inline dirty flag
  const [folderInlineDirty, setFolderInlineDirty] = useState(false);

  // AI generation & proposal review state
  const [working, setWorking] = useState(false);
  const [aiGeneratingPath, setAiGeneratingPath] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<AiProposal | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const guideRef = useRef<ReturnType<typeof showGuide> | null>(null);

  const epochRef = useRef(0);
  const fetchIdRef = useRef(0);
  const dirtyRef = useRef(false);
  const aiAfterSettingsRef = useRef<EntryItem | null>(null);

  const directory = useMemo(() => (currentPath ? folderItem(currentPath) : null), [currentPath]);
  const activeTarget = selectedItem ?? directory;
  const items = lists[currentPath] || [];

  // Sync theme, accent, density
  useEffect(() => {
    setIsDark(applyThemeToDocument(prefs.theme, prefs.accent, prefs.density));
    savePreferences(prefs);
  }, [prefs]);

  useEffect(() => {
    if (prefs.theme !== 'system' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setIsDark(applyThemeToDocument('system', prefs.accent, prefs.density));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [prefs.theme, prefs.accent, prefs.density]);

  function updatePrefs(patch: Partial<UiPreferences>) {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }

  function showNotice(text: string) {
    setToast({ text, isError: false });
  }

  function showError(err: any) {
    setToast({ text: err?.message || String(err), isError: true });
  }

  const activePath = activeTarget?.path ?? '';
  const activeSavedNote = activePath ? notes[activePath] : undefined;

  useEffect(() => {
    setInspectorError('');
    if (!activePath) {
      setInspectorDraft('');
      setInspectorOriginal('');
      return;
    }
    const nextValue = typeof activeSavedNote === 'string' ? activeSavedNote : '';
    setInspectorOriginal(nextValue);
    setInspectorDraft(nextValue);
  }, [activePath]);

  useEffect(() => {
    if (!activePath || typeof activeSavedNote !== 'string') return;
    if (inspectorDraft === inspectorOriginal) {
      setInspectorOriginal(activeSavedNote);
      setInspectorDraft(activeSavedNote);
    }
  }, [activeSavedNote]);

  const inspectorDirty =
    Boolean(activeTarget && !activeTarget.link && typeof activeSavedNote === 'string') &&
    inspectorDraft !== inspectorOriginal &&
    !aiGeneratingPath;
  const inlineDirty = Boolean(inlineItem) && inlineDraft !== inlineOriginal;
  const proposalDirty = Boolean(aiProposal);
  const isDirty = folderInlineDirty || inspectorDirty || inlineDirty || proposalDirty;

  useEffect(() => {
    dirtyRef.current = isDirty;
    rpc('dirty', { value: isDirty ? '1' : '0' }).catch(() => {});
  }, [isDirty]);

  useEffect(() => {
    if (!toast.text) return;
    const timer = setTimeout(() => setToast({ text: '', isError: false }), 4000);
    return () => clearTimeout(timer);
  }, [toast.text]);

  function confirmLeave(): boolean {
    if (aiGeneratingPath) return false;
    return !dirtyRef.current || window.confirm('放弃当前尚未保存的备注修改？');
  }

  function resetEditors() {
    setInlineItem(null);
    setInlineDraft('');
    setInlineOriginal('');
    setAiProposal(null);
    setInspectorError('');
    setFolderInlineDirty(false);
    dirtyRef.current = false;
  }

  async function loadNotesForPaths(dirPath: string, paths: string[], version: number) {
    for (let i = 0; i < paths.length; i += 90) {
      if (epochRef.current !== version) return;
      const chunk = await rpc<NotesMap>('notes', { path: dirPath, paths: paths.slice(i, i + 90) });
      if (epochRef.current === version) {
        setNotes((prev) => ({ ...prev, ...chunk }));
      }
    }
  }

  async function openDir(targetPath: string, asNewRoot = false, force = false) {
    if (!targetPath || (!force && !confirmLeave())) return;
    const version = ++epochRef.current;
    resetEditors();
    setLoading(true);
    setUndo(null);
    if (asNewRoot) {
      setRoot(targetPath);
      setExpanded(new Set([targetPath]));
      setLists({});
      setNotes({});
      setPrefs((prev) => ({ ...prev, recentRoots: pushRecentRoot(prev.recentRoots, targetPath) }));
    } else {
      setExpanded((old) => new Set([...old, targetPath]));
    }
    setCurrentPath(targetPath);
    setSelectedItem(null);
    setFilter('all');
    setQuery('');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    try {
      const data = await rpc<EntryItem[]>('list', { path: targetPath });
      if (epochRef.current !== version) return;
      setLists((prev) => ({ ...prev, [targetPath]: data }));
      setLoading(false);
      const allPaths = [targetPath, ...data.filter((x) => !x.link).map((x) => x.path)];
      await loadNotesForPaths(targetPath, allPaths, version);
    } catch (err) {
      if (epochRef.current === version) {
        setLoading(false);
        showError(err);
      }
    }
  }

  async function pickWorkspace() {
    if (!confirmLeave()) return;
    try {
      const chosen = await rpc<string | null>('pick');
      if (chosen) await openDir(chosen, true, true);
    } catch (err) {
      showError(err);
    }
  }

  async function openRecentWorkspace(path: string) {
    if (!confirmLeave()) return;
    try {
      const confirmed = await rpc<string>('openRoot', { path });
      if (confirmed) await openDir(confirmed, true, true);
    } catch (err: any) {
      showError(err);
      setPrefs((prev) => ({
        ...prev,
        recentRoots: prev.recentRoots.filter((p) => p.toLowerCase() !== path.toLowerCase()),
      }));
    }
  }

  useEffect(() => {
    if (boot.root) openDir(boot.root, true, true);
  }, []);

  function startWalkthrough() {
    if (!guideRef.current?.isActive()) {
      guideRef.current = showGuide(Boolean(currentPath), pickWorkspace);
    }
  }

  useEffect(() => {
    if (boot.root || hasSeenGuide()) return;
    const frame = requestAnimationFrame(() => {
      guideRef.current = showGuide(false, pickWorkspace);
    });
    return () => {
      cancelAnimationFrame(frame);
      guideRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    return onHostEvent(async (data) => {
      if (data.event !== 'activate' || !currentPath || dirtyRef.current || aiGeneratingPath) return;
      const version = epochRef.current;
      const currentItems = lists[currentPath] || [];
      const paths = [currentPath, ...currentItems.filter((i) => !i.link).map((i) => i.path)];
      try {
        await loadNotesForPaths(currentPath, paths, version);
      } catch (err) {
        showError(err);
      }
    });
  }, [currentPath, lists, aiGeneratingPath]);

  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!dialog) return;
    if (settingsOpen && !dialog.open) dialog.showModal();
    if (!settingsOpen && dialog.open) dialog.close();
  }, [settingsOpen]);

  async function toggleTreeExpand(item: EntryItem) {
    if (item.link) return;
    if (expanded.has(item.path)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(item.path);
        return next;
      });
      return;
    }
    const version = epochRef.current;
    try {
      if (!lists[item.path]) {
        const data = await rpc<EntryItem[]>('list', { path: item.path });
        if (version !== epochRef.current) return;
        setLists((prev) => ({ ...prev, [item.path]: data }));
      }
      setExpanded((prev) => new Set([...prev, item.path]));
    } catch (err) {
      showError(err);
    }
  }

  async function refreshSingleNote(item: EntryItem): Promise<string> {
    const id = ++fetchIdRef.current;
    const version = epochRef.current;
    const result = await rpc<NotesMap>('notes', { path: item.path, paths: [item.path] });
    if (id !== fetchIdRef.current || version !== epochRef.current) {
      throw new Error('__stale__');
    }
    const note = result[item.path];
    if (note == null) throw new Error('此项备注暂时无法读取。');
    setNotes((prev) => ({ ...prev, [item.path]: note }));
    return note;
  }

  function selectRow(item: EntryItem | null) {
    if (item?.path === selectedItem?.path) return;
    if (!confirmLeave()) return;
    resetEditors();
    setSelectedItem(item);
  }

  async function openInInspector(item: EntryItem) {
    if (item.link) return;
    if (activeTarget?.path !== item.path && !confirmLeave()) return;
    resetEditors();
    setSelectedItem(item.path === currentPath ? null : item);
    updatePrefs({ inspectorOpen: true });
    try {
      const fresh = await refreshSingleNote(item);
      setInspectorOriginal(fresh);
      setInspectorDraft(fresh);
      setInspectorFocusNonce((n) => n + 1);
    } catch (err: any) {
      if (err.message !== '__stale__') showError(err);
    }
  }

  async function startInlineRowEdit(item: EntryItem) {
    if (item.link) return;
    if (!confirmLeave()) return;
    resetEditors();
    setSelectedItem(item);
    try {
      const fresh = await refreshSingleNote(item);
      setInlineItem(item);
      setInlineOriginal(fresh);
      setInlineDraft(fresh);
    } catch (err: any) {
      if (err.message !== '__stale__') showError(err);
    }
  }

  async function saveNoteForItem(item: EntryItem, value: string, original: string, fromAi = false) {
    if (working) return;
    setWorking(true);
    setInspectorError('');
    try {
      const saved = await rpc<string>('save', { path: item.path, value, original });
      setNotes((prev) => ({ ...prev, [item.path]: saved }));
      if (item.path === activeTarget?.path) {
        setInspectorOriginal(saved);
        setInspectorDraft(saved);
      }
      if (fromAi && saved !== original) {
        setUndo({ item, previous: original, saved });
      } else if (undo?.item.path === item.path) {
        setUndo(null);
      }
      setInlineItem(null);
      setAiProposal(null);
      dirtyRef.current = false;
      showNotice(`已保存「${item.name}」的备注`);
    } catch (err: any) {
      const message = err?.message || String(err);
      setInspectorError(message);
      showError(err);
      throw err;
    } finally {
      setWorking(false);
    }
  }

  async function startAiForItem(item: EntryItem) {
    if (item.link || working || aiGeneratingPath) return;
    if (activeTarget?.path !== item.path && !confirmLeave()) return;
    resetEditors();
    setSelectedItem(item.path === currentPath ? null : item);
    updatePrefs({ inspectorOpen: true });

    try {
      const fresh = await refreshSingleNote(item);
      setInspectorOriginal(fresh);
      setInspectorDraft(fresh);
      const profile = await rpc<ModelProfiles>('getSettings');
      if (!profile.ready) {
        aiAfterSettingsRef.current = item;
        setSettingsPage('models');
        setSettingsOpen(true);
        return;
      }
      await runAiGeneration(item);
    } catch (err: any) {
      if (err.message !== '__stale__') showError(err);
    }
  }

  async function runAiGeneration(item: EntryItem) {
    if (working || aiGeneratingPath) return;
    setWorking(true);
    setAiGeneratingPath(item.path);
    setInspectorError('');
    setAiProposal(null);
    try {
      const generated = await rpc<string>('suggest', { path: item.path });
      setAiProposal({ path: item.path, text: generated, generated });
      setInspectorFocusNonce((n) => n + 1);
    } catch (err: any) {
      setInspectorError(err?.message || String(err));
    } finally {
      setAiGeneratingPath(null);
      setWorking(false);
    }
  }

  async function undoAiSave() {
    if (!undo || working) return;
    setWorking(true);
    try {
      const restored = await rpc<string>('save', {
        path: undo.item.path,
        value: undo.previous,
        original: undo.saved,
      });
      setNotes((prev) => ({ ...prev, [undo.item.path]: restored }));
      if (activeTarget?.path === undo.item.path) {
        setInspectorOriginal(restored);
        setInspectorDraft(restored);
      }
      showNotice(`已撤销「${undo.item.name}」的 AI 备注`);
      setUndo(null);
    } catch (err) {
      showError(err);
    } finally {
      setWorking(false);
    }
  }

  function openSettings(page: SettingsPage = 'models') {
    setSettingsPage(page);
    setSettingsOpen(true);
  }

  function closeSettings() {
    aiAfterSettingsRef.current = null;
    setSettingsOpen(false);
  }

  const stats = useMemo(() => {
    let folders = 0;
    let noted = 0;
    let pending = 0;
    for (const item of items) {
      if (item.dir) folders++;
      const note = notes[item.path];
      if (note) noted++;
      else if (note === '') pending++;
    }
    return {
      folders,
      files: items.length - folders,
      all: items.length,
      noted,
      pending,
    };
  }, [items, notes]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const note = notes[item.path];
      if (filter === 'noted' && !note) return false;
      if (filter === 'pending' && note !== '') return false;
      if (!q) return true;
      return `${item.name} ${note || ''}`.toLowerCase().includes(q);
    });

    if (sort === 'default') return filtered;

    const copy = [...filtered];
    if (sort === 'name') {
      copy.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
    } else if (sort === 'modified') {
      copy.sort((a, b) => (b.modified || 0) - (a.modified || 0));
    } else if (sort === 'pending') {
      copy.sort((a, b) => {
        const aPending = notes[a.path] === '' ? 0 : 1;
        const bPending = notes[b.path] === '' ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        if (a.dir !== b.dir) return a.dir ? -1 : 1;
        return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
      });
    }
    return copy;
  }, [items, notes, filter, query, sort]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (guideRef.current?.isActive()) return;

      const targetEl = e.target as HTMLElement | null;
      const inEditable =
        targetEl?.tagName === 'INPUT' ||
        targetEl?.tagName === 'TEXTAREA' ||
        targetEl?.tagName === 'SELECT';

      if (e.ctrlKey && e.key.toLowerCase() === 'f' && !settingsOpen && currentPath) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'i' && currentPath && !settingsOpen) {
        e.preventDefault();
        updatePrefs({ inspectorOpen: !prefs.inspectorOpen });
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's' && !settingsOpen) {
        if (inlineItem && inlineDirty) {
          e.preventDefault();
          saveNoteForItem(inlineItem, inlineDraft, inlineOriginal);
          return;
        }
        if (aiProposal && activeTarget && aiProposal.path === activeTarget.path) {
          e.preventDefault();
          saveNoteForItem(activeTarget, aiProposal.text, inspectorOriginal, true);
          return;
        }
        if (activeTarget && inspectorDirty) {
          e.preventDefault();
          saveNoteForItem(activeTarget, inspectorDraft, inspectorOriginal);
          return;
        }
      }
      if (e.key === 'F5' && !settingsOpen && currentPath) {
        e.preventDefault();
        openDir(currentPath);
        return;
      }
      if (e.key === 'Escape') {
        if (settingsOpen) {
          e.preventDefault();
          closeSettings();
        } else if (inlineItem) {
          e.preventDefault();
          if (confirmLeave()) resetEditors();
        } else if (aiProposal) {
          e.preventDefault();
          setAiProposal(null);
        } else if (query) {
          e.preventDefault();
          setQuery('');
        } else if (selectedItem && !inEditable) {
          e.preventDefault();
          selectRow(null);
        }
        return;
      }

      if (!inEditable && !settingsOpen && currentPath && visibleItems.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const idx = selectedItem ? visibleItems.findIndex((i) => i.path === selectedItem.path) : -1;
          const nextIdx =
            e.key === 'ArrowDown'
              ? idx < visibleItems.length - 1
                ? idx + 1
                : 0
              : idx > 0
              ? idx - 1
              : visibleItems.length - 1;
          selectRow(visibleItems[nextIdx]);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    settingsOpen,
    currentPath,
    prefs.inspectorOpen,
    inlineItem,
    inlineDraft,
    inlineOriginal,
    inlineDirty,
    aiProposal,
    activeTarget,
    inspectorDraft,
    inspectorOriginal,
    inspectorDirty,
    query,
    selectedItem,
    visibleItems,
  ]);

  const crumbs = useMemo(() => buildBreadcrumbs(root, currentPath), [root, currentPath]);
  const showInspector = Boolean(currentPath) && prefs.inspectorOpen;

  return (
    <div
      style={{ '--sidebar-w': 'clamp(208px, 19vw, 238px)' } as React.CSSProperties}
      className={cn(
        'grid h-full bg-chrome transition-[grid-template-columns] duration-220 ease-[cubic-bezier(0.22,0.8,0.26,1)]',
        sidebarOpen ? 'grid-cols-[var(--sidebar-w)_minmax(0,1fr)]' : 'grid-cols-[0px_minmax(0,1fr)]'
      )}
    >
      <Sidebar
        open={sidebarOpen}
        root={root}
        currentPath={currentPath}
        selectedPath={selectedItem?.path ?? null}
        lists={lists}
        expanded={expanded}
        treeLimits={treeLimits}
        notes={notes}
        isDark={isDark}
        onCollapse={() => setSidebarOpen(false)}
        onPickRoot={pickWorkspace}
        onToggleExpand={toggleTreeExpand}
        onOpenDir={(p) => openDir(p)}
        onSelectFile={(item) => {
          const parent = parentPath(item.path, root);
          if (parent && parent !== currentPath) {
            openDir(parent).then(() => openInInspector(item));
          } else {
            openInInspector(item);
          }
        }}
        onExpandMore={(p) => setTreeLimits((prev) => ({ ...prev, [p]: (prev[p] || 120) + 120 }))}
        onOpenSettings={() => {
          if (!confirmLeave()) return;
          resetEditors();
          aiAfterSettingsRef.current = null;
          openSettings('models');
        }}
        onStartTour={startWalkthrough}
        onToggleTheme={() => updatePrefs({ theme: isDark ? 'light' : 'dark' })}
      />

      <main className="flex min-h-0 min-w-0 flex-col bg-canvas">
        <TitleBar
          rightSlot={
            currentPath ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="icon"
                  size="sm"
                  title="打开其他工作目录"
                  aria-label="打开其他工作目录"
                  onClick={pickWorkspace}
                >
                  <FolderOpen size={15} />
                </Button>
                <Button
                  variant="icon"
                  size="sm"
                  title="刷新目录 (F5)"
                  aria-label="刷新目录"
                  onClick={() => openDir(currentPath)}
                >
                  <ArrowClockwise size={15} />
                </Button>
                <span className="mx-1 h-[15px] w-px flex-none bg-border-subtle" />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={SPRING_SNAPPY}
                  title={showInspector ? '收起详情栏 (Ctrl+I)' : '展开详情栏 (Ctrl+I)'}
                  aria-label={showInspector ? '收起详情栏' : '展开详情栏'}
                  aria-pressed={showInspector}
                  onClick={() => updatePrefs({ inspectorOpen: !prefs.inspectorOpen })}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] font-medium transition-colors duration-150',
                    showInspector
                      ? 'border-accent-border bg-accent-soft text-accent-text'
                      : 'border-transparent text-ink-secondary hover:bg-hover hover:text-ink'
                  )}
                >
                  <Info size={15} weight={showInspector ? 'duotone' : 'regular'} />
                  <span>详情</span>
                </motion.button>
              </div>
            ) : undefined
          }
        >
          {!sidebarOpen && (
            <>
              <Button
                variant="icon"
                size="sm"
                title="展开侧栏 (Ctrl+\)"
                aria-label="展开侧栏"
                onClick={() => setSidebarOpen(true)}
              >
                <SidebarSimple size={16} />
              </Button>
              <div className="inline-flex items-center gap-1.5 px-1 font-display text-[13.5px] font-semibold tracking-[-0.02em] text-ink">
                <BrandMark size={17} />
                <span>Folio</span>
              </div>
              <span className="mx-1 h-[15px] w-px flex-none bg-border-subtle" />
            </>
          )}

          {currentPath ? (
            <>
              <Button
                variant="icon"
                size="sm"
                title="返回上一级目录"
                aria-label="返回上一级目录"
                disabled={currentPath === root}
                onClick={() => openDir(parentPath(currentPath, root))}
              >
                <ArrowLeft size={14} />
              </Button>

              <nav
                className="flex min-w-0 items-center gap-0.5 overflow-hidden whitespace-nowrap"
                aria-label="目录路径"
                title={currentPath}
              >
                {crumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.path}>
                    {idx > 0 && <CaretRight size={10} className="flex-none text-ink-faint" aria-hidden="true" />}
                    <button
                      type="button"
                      aria-current={crumb.path === currentPath ? 'page' : undefined}
                      title={crumb.path}
                      onClick={() => openDir(crumb.path)}
                      className={cn(
                        'min-w-0 max-w-[180px] truncate rounded-[6px] px-2 py-1 text-[12.5px] transition-colors hover:bg-hover hover:text-ink',
                        crumb.path === currentPath ? 'font-semibold text-ink' : 'text-ink-muted'
                      )}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </>
          ) : (
            <span className="pl-1 text-[12px] text-ink-muted">本地目录备注工作台</span>
          )}
        </TitleBar>

        {!currentPath ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <Welcome
              recentRoots={prefs.recentRoots}
              onOpen={pickWorkspace}
              onOpenRecent={openRecentWorkspace}
              onTour={startWalkthrough}
            />
          </div>
        ) : (
          <div className="relative flex min-h-0 min-w-0 flex-1">
            <div className="workspace-column flex min-h-0 min-w-0 flex-1 flex-col">
              <FolderHeader
                directory={directory!}
                loading={loading}
                folderCount={stats.folders}
                fileCount={stats.files}
                notedCount={stats.noted}
                totalCount={stats.all}
                directoryNote={notes[currentPath]}
                working={working}
                onSaveFolderNote={(val, orig) => saveNoteForItem(directory!, val, orig)}
                onStartFolderAi={() => directory && startAiForItem(directory)}
                onOpenFolderInInspector={() => directory && openInInspector(directory)}
                onLocateFolder={() => rpc('locate', { path: currentPath }).catch(showError)}
                onError={showError}
                onInlineDirtyChange={setFolderInlineDirty}
              />

              <WorkspaceToolbar
                filter={filter}
                sort={sort}
                view={prefs.view}
                query={query}
                counts={{ all: stats.all, noted: stats.noted, pending: stats.pending }}
                searchRef={searchRef}
                onFilterChange={(next) => {
                  if (!confirmLeave()) return;
                  resetEditors();
                  setFilter(next);
                  setSelectedItem(null);
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }}
                onSortChange={setSort}
                onViewChange={(view) => updatePrefs({ view })}
                onQueryChange={(next) => {
                  if (inlineItem && !confirmLeave()) return;
                  if (inlineItem) resetEditors();
                  setQuery(next);
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }}
              />

              {prefs.view === 'list' ? (
                <FileList
                  items={visibleItems}
                  notes={notes}
                  selectedPath={selectedItem?.path ?? null}
                  inlineItem={inlineItem}
                  inlineDraft={inlineDraft}
                  working={working}
                  loading={loading}
                  hasFilterOrQuery={Boolean(query.trim()) || filter !== 'all'}
                  density={prefs.density}
                  inspectorOpen={showInspector}
                  scrollRef={scrollRef}
                  onSelect={(item) => selectRow(item)}
                  onOpenDir={(p) => openDir(p)}
                  onEditInspector={(item) => openInInspector(item)}
                  onStartInline={(item) => startInlineRowEdit(item)}
                  onInlineChange={setInlineDraft}
                  onInlineSave={() => {
                    if (inlineItem) saveNoteForItem(inlineItem, inlineDraft, inlineOriginal);
                  }}
                  onInlineCancel={() => {
                    if (confirmLeave()) resetEditors();
                  }}
                  onStartAi={(item) => startAiForItem(item)}
                  onResetFilters={() => {
                    setFilter('all');
                    setQuery('');
                  }}
                />
              ) : (
                <FileCards
                  items={visibleItems}
                  notes={notes}
                  selectedPath={selectedItem?.path ?? null}
                  working={working}
                  loading={loading}
                  hasFilterOrQuery={Boolean(query.trim()) || filter !== 'all'}
                  scrollRef={scrollRef}
                  onSelect={(item) => selectRow(item)}
                  onOpenDir={(p) => openDir(p)}
                  onEditInspector={(item) => openInInspector(item)}
                  onStartAi={(item) => startAiForItem(item)}
                  onResetFilters={() => {
                    setFilter('all');
                    setQuery('');
                  }}
                />
              )}

              <footer className="flex h-9 flex-none items-center justify-between gap-3 border-t border-hairline bg-canvas px-[clamp(18px,2.6vw,28px)] text-[11.5px] text-ink-muted">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="truncate">
                    {inlineItem
                      ? `正在行内编辑「${inlineItem.name}」`
                      : selectedItem
                      ? `已选择 ${selectedItem.name}`
                      : `共显示 ${visibleItems.length} 项`}
                  </span>
                </div>

                <div className="flex flex-none items-center gap-2.5">
                  <span className="cq-footer-hint whitespace-nowrap text-ink-faint">↑↓ 切换 · Enter 打开</span>
                  <button
                    type="button"
                    onClick={() => rpc('locate', { path: activeTarget?.path || currentPath }).catch(showError)}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-ink-secondary transition-colors hover:bg-hover hover:text-ink"
                  >
                    <span>在资源管理器中显示</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </footer>
            </div>

            <AnimatePresence>
              {showInspector && (
                <React.Fragment key="inspector-wrap">
                  <motion.div
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    onClick={() => {
                      if (confirmLeave()) {
                        resetEditors();
                        updatePrefs({ inspectorOpen: false });
                      }
                    }}
                    className="hidden max-[1020px]:block max-[1020px]:absolute max-[1020px]:inset-0 max-[1020px]:z-[18] max-[1020px]:bg-[var(--scrim)] max-[1020px]:backdrop-blur-[1px]"
                  />
                  <Inspector
                    target={activeTarget}
                    isCurrentFolder={activeTarget?.path === currentPath}
                    savedNote={activeSavedNote}
                    draft={inspectorDraft}
                    dirty={inspectorDirty}
                    working={working}
                    aiGenerating={Boolean(aiGeneratingPath && aiGeneratingPath === activeTarget?.path)}
                    aiProposal={
                      aiProposal && activeTarget && aiProposal.path === activeTarget.path ? aiProposal : null
                    }
                    error={inspectorError}
                    focusNonce={inspectorFocusNonce}
                    onDraftChange={setInspectorDraft}
                    onProposalChange={(next) =>
                      setAiProposal((prev) => (prev ? { ...prev, text: next } : null))
                    }
                    onSave={() => {
                      if (activeTarget) saveNoteForItem(activeTarget, inspectorDraft, inspectorOriginal);
                    }}
                    onRevert={() => {
                      setInspectorDraft(inspectorOriginal);
                      setInspectorError('');
                    }}
                    onClearNote={() => {
                      if (activeTarget) saveNoteForItem(activeTarget, '', inspectorOriginal);
                    }}
                    onStartAi={() => {
                      if (activeTarget) startAiForItem(activeTarget);
                    }}
                    onCancelAi={() => {
                      rpc('cancel').catch(() => {});
                    }}
                    onAcceptProposal={() => {
                      if (activeTarget && aiProposal) {
                        saveNoteForItem(activeTarget, aiProposal.text, inspectorOriginal, true);
                      }
                    }}
                    onDiscardProposal={() => {
                      setAiProposal(null);
                      setInspectorError('');
                    }}
                    onOpenFolder={(p) => openDir(p)}
                    onLocate={(p) => rpc('locate', { path: p }).catch(showError)}
                    onClose={() => {
                      if (confirmLeave()) {
                        resetEditors();
                        updatePrefs({ inspectorOpen: false });
                      }
                    }}
                  />
                </React.Fragment>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Watermelon / BoardUI Floating Toast Stack */}
      <ToastBar
        message={toast.text}
        isError={toast.isError}
        undo={undo}
        working={working}
        onUndo={undoAiSave}
      />

      <dialog
        ref={settingsDialogRef}
        aria-labelledby="settings-heading"
        onCancel={(e) => {
          e.preventDefault();
          closeSettings();
        }}
        onClick={(e) => {
          if (e.target === settingsDialogRef.current) closeSettings();
        }}
        className="folio-dialog m-auto h-[min(568px,90vh)] w-[min(744px,92vw)] overflow-hidden rounded-[18px] border border-border-subtle bg-canvas p-0 text-ink shadow-lg"
      >
        {settingsOpen && (
          <SettingsDialog
            page={settingsPage}
            prefs={prefs}
            onNavigate={setSettingsPage}
            onUpdatePrefs={updatePrefs}
            onClose={closeSettings}
            onSaveModels={async (profiles) => {
              const pending = aiAfterSettingsRef.current;
              if (!pending || !profiles.ready) return;
              aiAfterSettingsRef.current = null;
              setSettingsOpen(false);
              await runAiGeneration(pending);
            }}
          />
        )}
      </dialog>
    </div>
  );
}
