import React from 'react';
import { motion } from 'motion/react';
import { FolderOpen, NotePencil, Plus, Sparkle } from '@phosphor-icons/react';
import { EntryItem, NotesMap } from '@/types';
import { classifyEntry, formatBytes } from '@/utils/paths';
import { cn, SPRING_SNAPPY } from '@/lib/utils';
import { FileGlyph } from './FileGlyph';
import { RowAction } from './RowAction';
import { Button } from './ui/button';

interface FileCardsProps {
  items: EntryItem[];
  notes: NotesMap;
  selectedPath: string | null;
  working: boolean;
  loading: boolean;
  hasFilterOrQuery: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (item: EntryItem) => void;
  onOpenDir: (path: string) => void;
  onEditInspector: (item: EntryItem) => void;
  onStartAi: (item: EntryItem) => void;
  onResetFilters: () => void;
}

export function FileCards({
  items,
  notes,
  selectedPath,
  working,
  loading,
  hasFilterOrQuery,
  scrollRef,
  onSelect,
  onOpenDir,
  onEditInspector,
  onStartAi,
  onResetFilters,
}: FileCardsProps) {
  const folders = items.filter((item) => item.dir);
  const files = items.filter((item) => !item.dir);

  function renderCard(item: EntryItem) {
    const note = notes[item.path];
    const isSelected = selectedPath === item.path;
    const unavailable = item.link || note === null;
    const { label } = classifyEntry(item);

    return (
      <motion.article
        key={item.path}
        whileHover={{ y: -2 }}
        transition={SPRING_SNAPPY}
        onClick={() => onSelect(item)}
        onDoubleClick={() => (item.dir ? onOpenDir(item.path) : onEditInspector(item))}
        className={cn(
          'group relative flex cursor-pointer flex-col gap-2.5 rounded-[14px] border bg-elevated p-3.5 transition-shadow duration-150',
          isSelected
            ? 'border-accent-border shadow-[0_0_0_2px_var(--accent-soft),var(--shadow-sm)]'
            : 'border-hairline shadow-xs hover:border-border-strong hover:shadow-sm',
          item.link && 'opacity-55'
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <FileGlyph item={item} size={17} framed />
          <div className="min-w-0 flex-1">
            <h3 title={item.name} className="truncate text-[13px] font-semibold text-ink">
              {item.name}
            </h3>
            <span className="mt-0.5 block truncate text-[11px] tabular-nums text-ink-faint">
              {item.dir
                ? '文件夹'
                : `${label}${item.size != null && item.size >= 0 ? ' · ' + formatBytes(item.size) : ''}`}
            </span>
          </div>
        </div>

        {/* Floating top-right action pill (preserves full title/meta width at rest) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute right-2.5 top-2.5 flex items-center gap-0.5 rounded-[9px] border border-hairline bg-elevated/95 p-0.5 shadow-xs backdrop-blur-sm transition-opacity duration-150',
            isSelected
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
          )}
        >
          <RowAction
            kind="edit"
            hint={note ? '编辑备注' : '添加备注'}
            label={`编辑 ${item.name} 的备注`}
            disabled={unavailable || note === undefined || working}
            onClick={() => onEditInspector(item)}
          >
            <NotePencil size={14} />
          </RowAction>
          <RowAction
            kind="ai"
            hint="AI 生成候选备注"
            label={`为 ${item.name} AI 生成备注`}
            disabled={unavailable || note === undefined || working}
            onClick={() => onStartAi(item)}
          >
            <Sparkle size={14} weight="duotone" />
          </RowAction>
        </div>

        <div className="flex min-h-9 items-start">
          {note ? (
            <p className="m-0 overflow-hidden text-[12.5px] leading-[1.55] text-ink-secondary [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
              {note}
            </p>
          ) : note === null ? (
            <p className="m-0 text-[12.5px] text-ink-faint">无法读取备注</p>
          ) : note === undefined ? (
            <p className="m-0 text-[12.5px] text-ink-faint">读取中…</p>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={unavailable || working}
              onClick={(e) => {
                e.stopPropagation();
                onEditInspector(item);
              }}
              className="inline-flex items-center gap-1 rounded-[7px] border border-dashed border-border-strong px-2.5 py-1 text-[12px] text-ink-muted transition-colors hover:border-accent-border hover:bg-accent-subtle hover:text-accent-text disabled:opacity-40"
            >
              <Plus size={12} />
              <span>添加备注</span>
            </motion.button>
          )}
        </div>
      </motion.article>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-[clamp(18px,2.6vw,28px)] pb-6 pt-1">
      {items.length > 0 ? (
        <div className="flex flex-col gap-5">
          {folders.length > 0 && (
            <section>
              <header className="mb-2.5 flex items-center gap-2">
                <h2 className="m-0 text-[12px] leading-none font-semibold tracking-[0.03em] text-ink-muted">文件夹</h2>
                <span className="inline-flex h-[18px] items-center rounded-full bg-subtle px-2 text-[11px] leading-none font-medium tabular-nums text-ink-muted">
                  {folders.length}
                </span>
              </header>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3">
                {folders.map(renderCard)}
              </div>
            </section>
          )}
          {files.length > 0 && (
            <section>
              <header className="mb-2.5 flex items-center gap-2">
                <h2 className="m-0 text-[12px] leading-none font-semibold tracking-[0.03em] text-ink-muted">文件</h2>
                <span className="inline-flex h-[18px] items-center rounded-full bg-subtle px-2 text-[11px] leading-none font-medium tabular-nums text-ink-muted">
                  {files.length}
                </span>
              </header>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3">
                {files.map(renderCard)}
              </div>
            </section>
          )}
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
              ? '可以清空搜索词或切换回「全部」视图。'
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
  );
}
