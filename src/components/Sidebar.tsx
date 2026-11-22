import React from 'react';
import { motion } from 'motion/react';
import {
  CaretRight,
  Columns,
  FolderOpen,
  GearSix,
  HardDrives,
  Moon,
  Plus,
  Question,
  SidebarSimple,
  Sparkle,
  Sun,
  Swap,
} from '@phosphor-icons/react';
import { EntryItem, NotesMap } from '@/types';
import { driveBadge, folderItem, leafName } from '@/utils/paths';
import { cn, SPRING_PILL, SPRING_SNAPPY } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { FileGlyph } from './FileGlyph';
import { Button } from './ui/button';

interface SidebarProps {
  open: boolean;
  root: string;
  currentPath: string;
  selectedPath: string | null;
  lists: Record<string, EntryItem[]>;
  expanded: Set<string>;
  treeLimits: Record<string, number>;
  notes: NotesMap;
  isDark: boolean;
  onCollapse: () => void;
  onPickRoot: () => void;
  onToggleExpand: (item: EntryItem) => void;
  onOpenDir: (path: string) => void;
  onSelectFile: (item: EntryItem) => void;
  onExpandMore: (path: string) => void;
  onOpenSettings: () => void;
  onStartTour: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  open,
  root,
  currentPath,
  selectedPath,
  lists,
  expanded,
  treeLimits,
  notes,
  isDark,
  onCollapse,
  onPickRoot,
  onToggleExpand,
  onOpenDir,
  onSelectFile,
  onExpandMore,
  onOpenSettings,
  onStartTour,
  onToggleTheme,
}: SidebarProps) {
  function renderNode(item: EntryItem, depth = 0): React.ReactNode {
    const isActiveDir = item.dir && item.path === currentPath;
    const isActiveFile = !item.dir && item.path === selectedPath;
    const isExpanded = item.dir && expanded.has(item.path);
    const children = lists[item.path] || [];
    const limit = treeLimits[item.path] || 120;
    const hasNote = Boolean(notes[item.path]);

    return (
      <React.Fragment key={item.path}>
        <div
          role="treeitem"
          aria-level={depth + 1}
          aria-expanded={item.dir ? isExpanded : undefined}
          aria-selected={isActiveDir || isActiveFile}
          className={cn(
            'tree-row-guide relative mb-[1px] flex h-[30px] min-w-0 items-center rounded-[8px] transition-colors duration-150',
            isActiveDir
              ? 'is-active font-semibold text-accent-text'
              : isActiveFile
              ? 'bg-accent-soft text-accent-text'
              : 'text-ink-secondary hover:bg-hover hover:text-ink',
            item.link && 'opacity-55'
          )}
          style={{
            paddingLeft: `calc(4px + ${Math.min(depth, 8) * 13}px)`,
            '--depth': depth,
          } as React.CSSProperties}
        >
          {isActiveDir && (
            <motion.span
              layoutId="sidebar-active-dir"
              transition={SPRING_PILL}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[8px] bg-accent-soft"
            />
          )}
          {isActiveDir && (
            <motion.span
              layoutId="sidebar-active-bar"
              transition={SPRING_PILL}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-[7px] z-[2] h-4 w-[2.5px] rounded-full bg-accent"
            />
          )}

          {item.dir && !item.link ? (
            <button
              type="button"
              className="relative z-[1] inline-grid h-[22px] w-[18px] flex-none place-items-center rounded text-ink-faint transition-colors hover:text-ink"
              aria-label={(isExpanded ? '折叠 ' : '展开 ') + item.name}
              onClick={() => onToggleExpand(item)}
            >
              <motion.span
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.16 }}
                className="inline-flex"
              >
                <CaretRight weight="bold" size={10} />
              </motion.span>
            </button>
          ) : (
            <span className="w-[18px] flex-none" />
          )}

          <button
            type="button"
            title={item.path}
            disabled={item.link}
            onClick={() => (item.dir ? onOpenDir(item.path) : onSelectFile(item))}
            className="relative z-[1] flex h-full min-w-0 flex-1 items-center gap-[7px] rounded-[6px] pl-0.5 pr-2 text-left text-[12.5px]"
          >
            <FileGlyph item={item} open={isActiveDir || isExpanded} size={15} />
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            {hasNote && (
              <span
                title="已有备注"
                aria-hidden="true"
                className={cn(
                  'h-1 w-1 flex-none rounded-full',
                  isActiveDir || isActiveFile ? 'bg-accent-text opacity-80' : 'bg-ink-faint opacity-45'
                )}
              />
            )}
          </button>
        </div>

        {isExpanded && depth < 80 && children.slice(0, limit).map((child) => renderNode(child, depth + 1))}
        {isExpanded && children.length > limit && (
          <button
            type="button"
            style={{ paddingLeft: `calc(24px + ${Math.min(depth + 1, 8) * 13}px)` }}
            onClick={() => onExpandMore(item.path)}
            className="block w-full rounded-[6px] py-1 pr-2 text-left text-[11.5px] text-ink-muted hover:bg-hover hover:text-ink"
          >
            展开更多（剩余 {children.length - limit} 项）…
          </button>
        )}
      </React.Fragment>
    );
  }

  return (
    <aside className="h-full min-w-0 overflow-hidden bg-chrome" inert={!open}>
      <div className="flex h-full w-[var(--sidebar-w)] flex-col border-r border-hairline">
        {/* Draggable brand header */}
        <div className="app-drag flex h-11 flex-none items-center justify-between pl-4 pr-2.5 select-none">
          <div className="flex items-center gap-2.5">
            <BrandMark size={22} />
            <span className="font-display text-[14.5px] font-semibold tracking-[-0.025em] text-ink">Folio</span>
          </div>
          <Button
            variant="icon"
            size="sm"
            className="app-no-drag"
            title="收起侧栏 (Ctrl+\)"
            aria-label="收起侧栏"
            onClick={onCollapse}
          >
            <SidebarSimple size={16} />
          </Button>
        </div>

        {/* Concentric workspace switcher card */}
        <div className="flex-none px-3 pb-3 pt-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            transition={SPRING_SNAPPY}
            data-tour="switch"
            title={root ? `当前工作区：${root}\n点击切换目录` : '选择本地工作目录'}
            onClick={onPickRoot}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-[12px] border border-hairline bg-subtle px-2.5 py-2 text-left transition-all duration-150 hover:border-border-strong hover:bg-elevated hover:shadow-xs"
          >
            <span className="inline-grid h-7 min-w-7 flex-none place-items-center rounded-[7px] bg-accent-soft px-1.5 font-mono text-[11px] font-semibold text-accent-text">
              {root ? driveBadge(root) : <FolderOpen size={14} />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate text-[12.5px] font-semibold text-ink">
                {root ? leafName(root) : '打开工作目录'}
              </strong>
              <small className="truncate text-[11px] text-ink-muted">
                {root || '选择本地文件夹开始'}
              </small>
            </span>
            <Swap size={14} className="flex-none text-ink-faint" aria-hidden="true" />
          </motion.button>
        </div>

        {root ? (
          <>
            <div className="flex items-center justify-between pb-1.5 pl-4 pr-2.5 pt-0.5 text-[11px] font-semibold tracking-[0.04em] text-ink-muted">
              <span>目录树</span>
              <Button
                variant="icon"
                size="xs"
                title="切换工作目录"
                aria-label="切换工作目录"
                onClick={onPickRoot}
              >
                <Plus size={13} />
              </Button>
            </div>
            <nav className="min-h-0 flex-1 overflow-auto px-2.5 pb-3" role="tree" aria-label="目录结构">
              {renderNode(folderItem(root), 0)}
            </nav>
          </>
        ) : (
          <div className="flex-1 px-4 py-2">
            <p className="mb-3.5 text-[12px] leading-[1.65] text-ink-muted">
              打开本地文件夹后，层级目录会显示在此处，随时跳转并查阅备注。
            </p>
            <ul className="flex flex-col gap-2 border-t border-hairline pt-3 text-[11.5px] text-ink-muted">
              <li className="flex items-center gap-2">
                <Columns size={13} weight="duotone" className="flex-none text-accent-text" aria-hidden="true" />
                <span>目录备注同步至资源管理器</span>
              </li>
              <li className="flex items-center gap-2">
                <HardDrives size={13} weight="duotone" className="flex-none text-accent-text" aria-hidden="true" />
                <span>文件备注仅保存在本机</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkle size={13} weight="duotone" className="flex-none text-accent-text" aria-hidden="true" />
                <span>可选 AI 快速拟稿并确认</span>
              </li>
            </ul>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="mt-auto flex flex-none items-center justify-between gap-1.5 border-t border-hairline px-2.5 py-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
            data-tour="settings"
            onClick={onOpenSettings}
            className="flex h-8 flex-1 items-center gap-2 rounded-[8px] px-2 text-left text-[12.5px] text-ink-secondary transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            <GearSix size={16} />
            <span>设置</span>
          </motion.button>
          <div className="flex items-center gap-0.5">
            <Button
              variant="icon"
              size="sm"
              title={isDark ? '切换为纯白浅色' : '切换为深灰暗色'}
              aria-label={isDark ? '切换为纯白浅色' : '切换为深灰暗色'}
              onClick={onToggleTheme}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </Button>
            {currentPath && (
              <Button
                variant="icon"
                size="sm"
                title="快速上手"
                aria-label="快速上手"
                onClick={onStartTour}
              >
                <Question size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
