import React, { useEffect, useState } from 'react';
import { Check, FolderOpen, NotePencil, Sparkle, X } from '@phosphor-icons/react';
import { DensityMode, EntryItem, NotesMap } from '@/types';
import { classifyEntry } from '@/utils/paths';
import { cn } from '@/lib/utils';
import { FileGlyph } from './FileGlyph';
import { RowAction } from './RowAction';
import { Button } from './ui/button';

interface FileListProps {
  items: EntryItem[];
  notes: NotesMap;
  selectedPath: string | null;
  inlineItem: EntryItem | null;
  inlineDraft: string;
  working: boolean;
  loading: boolean;
  hasFilterOrQuery: boolean;
  density: DensityMode;
  inspectorOpen: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (item: EntryItem) => void;
  onOpenDir: (path: string) => void;
  onEditInspector: (item: EntryItem) => void;
  onStartInline: (item: EntryItem) => void;
  onInlineChange: (value: string) => void;
  onInlineSave: () => void;
  onInlineCancel: () => void;
  onStartAi: (item: EntryItem) => void;
  onResetFilters: () => void;
}

export function FileList({
  items,
  notes,
  selectedPath,
  inlineItem,
  inlineDraft,
  working,
  loading,
  hasFilterOrQuery,
  density,
  inspectorOpen,
  scrollRef,
  onSelect,
  onOpenDir,
  onEditInspector,
  onStartInline,
  onInlineChange,
  onInlineSave,
  onInlineCancel,
  onStartAi,
  onResetFilters,
}: FileListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRef]);

  const rowHeight = density === 'compact' ? 40 : 50;
  const start = Math.max(0, Math.min(Math.floor(scrollTop / rowHeight) - 6, Math.max(0, items.length - 1)));
  const end = Math.min(items.length, start + Math.ceil(viewportHeight / rowHeight) + 14);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[clamp(18px,2.6vw,28px)]">
      <div
        aria-hidden="true"
        className="grid h-[30px] flex-none grid-cols-[minmax(160px,39%)_minmax(0,1fr)] items-center border-b border-border-subtle pl-2.5 pr-4 text-[11px] font-semibold tracking-[0.04em] text-ink-muted"
      >
        <span>名称</span>
        <span>备注</span>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
      >
        {items.length > 0 ? (
          <div className="relative" style={{ height: items.length * rowHeight }}>
            {items.slice(start, end).map((item, offset) => {
              const index = start + offset;
              const note = notes[item.path];
              const isSelected = selectedPath === item.path;
              const isInline = inlineItem?.path === item.path;
              const noteUnavailable = item.link || note === null;
              const { ext } = classifyEntry(item);

              return (
                <div
                  key={item.path}
                  style={{ top: index * rowHeight, height: rowHeight }}
                  onClick={() => {
                    if (!isInline) onSelect(item);
                  }}
                  className={cn(
                    'group absolute inset-x-0 grid cursor-pointer grid-cols-[minmax(160px,39%)_minmax(0,1fr)] items-center border-b border-hairline pl-2.5 pr-2 transition-colors duration-120',
                    isSelected
                      ? 'bg-accent-soft shadow-[inset_2.5px_0_0_var(--accent)]'
                      : 'hover:bg-hover',
                    item.link && 'opacity-55'
                  )}
                >
                  <button
                    type="button"
                    title={item.name + (item.dir ? ' · 双击进入目录' : ' · 双击编辑备注')}
                    disabled={item.link}
                    onDoubleClick={() => (item.dir ? onOpenDir(item.path) : onEditInspector(item))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        item.dir ? onOpenDir(item.path) : onEditInspector(item);
                      }
                    }}
                    className="flex h-full min-w-0 items-center gap-2.5 pr-3 text-left focus-visible:rounded-[6px] focus-visible:-outline-offset-3"
                  >
                    <span className="inline-grid h-[22px] w-[22px] flex-none place-items-center">
                      <FileGlyph item={item} size={17} />
                    </span>
                    <span className="truncate font-medium text-ink">{item.name}</span>
                    {!item.dir && ext && ext.length <= 5 && (
                      <span
                        className={cn(
                          'flex-none rounded-[5px] px-1.5 py-[1px] font-mono text-[10px] font-medium tracking-[0.02em]',
                          isSelected
                            ? 'bg-elevated text-ink-secondary shadow-xs'
                            : 'bg-subtle text-ink-faint'
                        )}
                      >
                        {ext}
                      </span>
                    )}
                  </button>

                  <div className="flex h-full min-w-0 items-center gap-2">
                    {isInline ? (
                      <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={(e) => {
                          e.preventDefault();
                          onInlineSave();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-1 rounded-[8px] border border-accent-border bg-elevated py-0.5 pl-2.5 pr-1 shadow-[0_0_0_3px_var(--accent-subtle)]"
                      >
                        <input
                          aria-label={`编辑 ${item.name} 的备注`}
                          autoFocus
                          value={inlineDraft}
                          maxLength={item.dir ? 200 : 2000}
                          placeholder="输入备注，回车保存…"
                          onChange={(e) => onInlineChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.stopPropagation();
                              onInlineCancel();
                            }
                          }}
                          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
                        />
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
                        <Button variant="icon" size="xs" onClick={onInlineCancel} title="取消 (Esc)">
                          <X size={14} />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          title={note || '点击添加备注'}
                          disabled={noteUnavailable}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (inspectorOpen) onEditInspector(item);
                            else onStartInline(item);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onEditInspector(item);
                          }}
                          className={cn(
                            'flex h-full min-w-0 flex-1 items-center text-left text-[12.5px] leading-[1.4]',
                            note
                              ? 'text-ink-secondary'
                              : 'italic text-ink-faint group-hover:text-ink-muted'
                          )}
                        >
                          <span
                            className={cn(
                              'overflow-hidden [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [display:-webkit-box]',
                              density === 'compact' ? '[-webkit-line-clamp:1]' : '[-webkit-line-clamp:2]'
                            )}
                          >
                            {note
                              ? note
                              : note === null
                              ? '无法读取备注'
                              : note === undefined
                              ? '读取中…'
                              : '添加备注…'}
                          </span>
                        </button>

                        <div
                          role="group"
                          aria-label={`${item.name} 的备注操作`}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'flex flex-none items-center gap-0.5 transition-opacity duration-150',
                            isSelected
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                          )}
                        >
                          <RowAction
                            kind="edit"
                            hint={note ? '在详情栏编辑备注' : '添加备注'}
                            label={`编辑 ${item.name} 的备注`}
                            disabled={noteUnavailable || note === undefined || working}
                            onClick={() => onEditInspector(item)}
                          >
                            <NotePencil size={15} aria-hidden="true" />
                          </RowAction>
                          <RowAction
                            kind="ai"
                            hint={note ? 'AI 重新拟稿（保存前确认）' : 'AI 生成候选备注'}
                            label={`为 ${item.name} AI 生成备注`}
                            disabled={noteUnavailable || note === undefined || working}
                            onClick={() => onStartAi(item)}
                          >
                            <Sparkle size={15} weight="duotone" aria-hidden="true" />
                          </RowAction>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[min(260px,100%)] flex-col items-center justify-center gap-2 px-6 py-9 text-center">
            <FolderOpen size={34} weight="duotone" className="glyph-folder opacity-75" aria-hidden="true" />
            <strong className="text-[14px] font-semibold text-ink">
              {loading ? '正在读取目录…' : hasFilterOrQuery ? '没有匹配的项目' : '当前文件夹为空'}
            </strong>
            <p className="mb-1.5 max-w-[320px] text-[12.5px] leading-[1.6] text-ink-muted">
              {loading
                ? '正在加载本地文件列表与备注'
                : hasFilterOrQuery
                ? '可以清空搜索词或切换回「全部」视图查看所有项目。'
                : '该目录下暂时没有可见的子文件夹或文件。'}
            </p>
            {hasFilterOrQuery && !loading && (
              <Button variant="secondary" size="sm" onClick={onResetFilters}>
                重置筛选
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
