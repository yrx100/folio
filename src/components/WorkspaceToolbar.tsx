import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowsDownUp,
  ListBullets,
  MagnifyingGlass,
  SquaresFour,
  X,
} from '@phosphor-icons/react';
import { FilterMode, SortMode, ViewMode } from '@/types';
import { cn, SPRING_SNAPPY } from '@/lib/utils';
import { SegmentedControl } from './ui/segmented-control';

interface WorkspaceToolbarProps {
  filter: FilterMode;
  sort: SortMode;
  view: ViewMode;
  query: string;
  counts: { all: number; noted: number; pending: number };
  searchRef: React.RefObject<HTMLInputElement | null>;
  onFilterChange: (next: FilterMode) => void;
  onSortChange: (next: SortMode) => void;
  onViewChange: (next: ViewMode) => void;
  onQueryChange: (next: string) => void;
}

const SORT_LABELS: Record<SortMode, string> = {
  default: '默认排序',
  pending: '待补充优先',
  name: '按名称',
  modified: '最近修改',
};

const SORT_ORDER: SortMode[] = ['default', 'pending', 'name', 'modified'];

export function WorkspaceToolbar({
  filter,
  sort,
  view,
  query,
  counts,
  searchRef,
  onFilterChange,
  onSortChange,
  onViewChange,
  onQueryChange,
}: WorkspaceToolbarProps) {
  function cycleSort() {
    const idx = SORT_ORDER.indexOf(sort);
    onSortChange(SORT_ORDER[(idx + 1) % SORT_ORDER.length]);
  }

  return (
    <div className="flex flex-none flex-wrap items-center justify-between gap-x-2.5 gap-y-2 px-[clamp(18px,2.6vw,28px)] pb-2.5 pt-3">
      <SegmentedControl<FilterMode>
        layoutId="workspace-filter-pill"
        ariaLabel="按备注状态筛选"
        value={filter}
        onChange={onFilterChange}
        options={[
          { id: 'all', label: '全部', count: counts.all },
          { id: 'noted', label: '已备注', count: counts.noted },
          { id: 'pending', label: '待补充', count: counts.pending },
        ]}
      />

      <div className="flex min-w-0 flex-[1_1_200px] items-center justify-end gap-1.5">
        <label className="flex h-8 min-w-[112px] max-w-[224px] flex-[1_1_130px] items-center gap-1.5 rounded-[9px] border border-border-subtle bg-elevated pl-2.5 pr-2 text-ink-muted transition-all duration-150 focus-within:border-accent-border focus-within:shadow-[0_0_0_3px_var(--accent-subtle)]">
          <MagnifyingGlass size={14} className="flex-none" aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            placeholder="搜索名称或备注"
            aria-label="搜索名称或备注"
            onChange={(e) => onQueryChange(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
          />
          {query ? (
            <button
              type="button"
              aria-label="清除搜索"
              onClick={() => onQueryChange('')}
              className="grid h-[18px] w-[18px] place-items-center rounded text-ink-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="cq-search-kbd whitespace-nowrap rounded-[5px] border border-hairline bg-subtle px-1.5 py-[1px] font-mono text-[10px] text-ink-faint">
              Ctrl F
            </kbd>
          )}
        </label>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          transition={SPRING_SNAPPY}
          title={`排序方式：${SORT_LABELS[sort]}（点击切换）`}
          onClick={cycleSort}
          className={cn(
            'inline-flex h-8 flex-none items-center gap-1.5 rounded-[9px] border px-2.5 text-[12px] whitespace-nowrap transition-colors duration-150',
            sort !== 'default'
              ? 'border-accent-border bg-accent-subtle text-accent-text font-medium'
              : 'border-border-subtle bg-elevated text-ink-secondary hover:border-border-strong hover:text-ink'
          )}
        >
          <ArrowsDownUp size={13} aria-hidden="true" />
          <span className="cq-sort-label">{SORT_LABELS[sort]}</span>
        </motion.button>

        <SegmentedControl<ViewMode>
          layoutId="workspace-view-pill"
          ariaLabel="视图切换"
          iconOnly
          value={view}
          onChange={onViewChange}
          options={[
            { id: 'list', icon: <ListBullets size={15} />, title: '列表视图', ariaLabel: '列表视图' },
            { id: 'cards', icon: <SquaresFour size={15} />, title: '卡片视图', ariaLabel: '卡片视图' },
          ]}
        />
      </div>
    </div>
  );
}
