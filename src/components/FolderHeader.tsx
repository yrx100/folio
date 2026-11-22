import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, NotePencil, Sparkle, X } from '@phosphor-icons/react';
import { EntryItem } from '@/types';
import { cn, SPRING_GENTLE, SPRING_SNAPPY } from '@/lib/utils';
import { CommentColumnChip } from './CommentColumnChip';
import { FileGlyph } from './FileGlyph';
import { Button } from './ui/button';

interface FolderHeaderProps {
  directory: EntryItem;
  loading: boolean;
  folderCount: number;
  fileCount: number;
  notedCount: number;
  totalCount: number;
  directoryNote: string | null | undefined;
  working: boolean;
  onSaveFolderNote: (value: string, original: string) => Promise<void>;
  onStartFolderAi: () => void;
  onOpenFolderInInspector: () => void;
  onLocateFolder: () => void;
  onError: (err: Error) => void;
  onInlineDirtyChange: (dirty: boolean) => void;
}

export function FolderHeader({
  directory,
  loading,
  folderCount,
  fileCount,
  notedCount,
  totalCount,
  directoryNote,
  working,
  onSaveFolderNote,
  onStartFolderAi,
  onOpenFolderInInspector,
  onLocateFolder,
  onError,
  onInlineDirtyChange,
}: FolderHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [original, setOriginal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(false);
    setDraft('');
    setOriginal('');
    onInlineDirtyChange(false);
  }, [directory.path]);

  useEffect(() => {
    onInlineDirtyChange(editing && draft !== original);
  }, [editing, draft, original]);

  function beginEdit() {
    if (directoryNote === null || directoryNote === undefined || working) return;
    setOriginal(directoryNote);
    setDraft(directoryNote);
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(original);
    onInlineDirtyChange(false);
  }

  async function commitEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (working) return;
    try {
      await onSaveFolderNote(draft, original);
      setEditing(false);
      onInlineDirtyChange(false);
    } catch {
      // Error surfaced via parent toast
    }
  }

  const coveragePct = totalCount > 0 ? Math.round((notedCount / totalCount) * 100) : 0;

  return (
    <section className="flex-none border-b border-hairline px-[clamp(18px,2.6vw,28px)] pb-3 pt-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5">
        <div className="flex min-w-0 flex-[1_1_200px] items-center gap-3">
          <FileGlyph item={directory} open size={20} framed frameClassName="h-9 w-9 rounded-[11px]" />
          <div className="min-w-0 flex-1">
            <h1
              title={directory.path}
              className="truncate font-display text-[20px] font-semibold leading-[1.25] tracking-[-0.025em] text-ink"
            >
              {directory.name}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-[12px] tabular-nums text-ink-muted">
              {loading ? (
                <span>正在读取目录…</span>
              ) : (
                <>
                  <span>
                    {folderCount} 文件夹 · {fileCount} 文件
                  </span>
                  {totalCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1.5"
                      title={`已为 ${notedCount} / ${totalCount} 个项目填写备注`}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block h-1 w-11 overflow-hidden rounded-full bg-border-subtle"
                      >
                        <motion.span
                          initial={false}
                          animate={{ width: `${coveragePct}%` }}
                          transition={SPRING_GENTLE}
                          className="block h-full rounded-full bg-accent"
                        />
                      </span>
                      <span className="text-[11.5px] text-ink-muted">
                        {notedCount}/{totalCount} 已备注
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-none items-center gap-1.5">
          <CommentColumnChip key={directory.path} path={directory.path} onError={onError} />
          <Button
            variant="icon"
            size="md"
            title="在资源管理器中打开当前目录"
            aria-label="在资源管理器中打开当前目录"
            onClick={onLocateFolder}
          >
            <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>

      {/* Concentric inline folder note bar */}
      <div
        data-tour="folder-note"
        aria-live="polite"
        className={cn(
          'mt-3 flex items-center gap-2.5 rounded-[11px] border px-2.5 py-[7px] transition-all duration-150',
          editing
            ? 'border-accent-border bg-elevated shadow-[0_0_0_3px_var(--accent-subtle)]'
            : 'border-hairline bg-subtle hover:border-border-subtle'
        )}
      >
        <span className="flex-none rounded-[6px] border border-hairline bg-elevated px-[7px] py-[2px] text-[11px] font-semibold tracking-[0.02em] text-ink-muted">
          目录备注
        </span>

        {editing ? (
          <form className="flex min-w-0 flex-1 items-center gap-1.5" onSubmit={commitEdit}>
            <input
              ref={inputRef}
              value={draft}
              maxLength={200}
              placeholder="输入当前文件夹的一句话说明…"
              aria-label="当前文件夹备注"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  cancelEdit();
                }
              }}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
            <span
              className={cn(
                'flex-none text-[11.5px] leading-none tabular-nums',
                draft.length >= 180 ? 'font-semibold text-status-warn' : 'text-ink-faint'
              )}
            >
              {draft.length}/200
            </span>
            <Button
              type="submit"
              variant="icon"
              size="xs"
              disabled={working}
              title="保存 (Enter)"
              className="text-accent-text hover:bg-accent-soft hover:text-accent-text"
            >
              <Check size={14} />
            </Button>
            <Button variant="icon" size="xs" onClick={cancelEdit} title="取消 (Esc)">
              <X size={14} />
            </Button>
          </form>
        ) : (
          <>
            <button
              type="button"
              disabled={directoryNote === null || directoryNote === undefined}
              title={directoryNote ? '点击直接编辑当前目录备注' : '点击为当前目录添加备注'}
              onClick={beginEdit}
              className={cn(
                'min-w-0 flex-1 truncate rounded-[6px] px-1.5 py-0.5 text-left text-[13px] transition-colors hover:bg-hover disabled:hover:bg-transparent',
                directoryNote ? 'text-ink' : 'text-ink-muted'
              )}
            >
              {directoryNote
                ? directoryNote
                : directoryNote === ''
                ? '为当前目录补充一句用途说明…'
                : directoryNote === null
                ? '目录备注暂时无法读取'
                : '正在读取目录备注…'}
            </button>

            <div className="flex flex-none items-center gap-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={SPRING_SNAPPY}
                disabled={working || directoryNote == null}
                title="在详情栏编辑目录备注"
                onClick={onOpenFolderInInspector}
                className="inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-[11.5px] font-medium text-ink-secondary transition-colors hover:bg-elevated hover:text-ink disabled:opacity-40"
              >
                <NotePencil size={13} />
                <span>编辑</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={SPRING_SNAPPY}
                disabled={working || directoryNote == null}
                title="使用 AI 为当前文件夹生成候选备注"
                onClick={onStartFolderAi}
                className="inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-[11.5px] font-medium text-accent-text transition-colors hover:bg-accent-soft disabled:opacity-40"
              >
                <Sparkle size={13} weight="duotone" />
                <span>AI 拟稿</span>
              </motion.button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
