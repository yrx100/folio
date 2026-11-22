import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowCounterClockwise,
  ArrowUpRight,
  Check,
  FolderOpen,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import { AiProposal, EntryItem } from '@/types';
import { classifyEntry, formatBytes, formatTimestamp } from '@/utils/paths';
import { cn, SPRING_GENTLE, SPRING_SNAPPY } from '@/lib/utils';
import { FileGlyph } from './FileGlyph';
import { Button } from './ui/button';
import { ConfirmButton } from './ui/confirm-button';
import { CopyButton } from './ui/copy-button';

interface InspectorProps {
  target: EntryItem | null;
  isCurrentFolder: boolean;
  savedNote: string | null | undefined;
  draft: string;
  dirty: boolean;
  working: boolean;
  aiGenerating: boolean;
  aiProposal: AiProposal | null;
  error: string;
  focusNonce: number;
  onDraftChange: (value: string) => void;
  onProposalChange: (value: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onClearNote: () => void;
  onStartAi: () => void;
  onCancelAi: () => void;
  onAcceptProposal: () => void;
  onDiscardProposal: () => void;
  onOpenFolder: (path: string) => void;
  onLocate: (path: string) => void;
  onClose: () => void;
}

export function Inspector({
  target,
  isCurrentFolder,
  savedNote,
  draft,
  dirty,
  working,
  aiGenerating,
  aiProposal,
  error,
  focusNonce,
  onDraftChange,
  onProposalChange,
  onSave,
  onRevert,
  onClearNote,
  onStartAi,
  onCancelAi,
  onAcceptProposal,
  onDiscardProposal,
  onOpenFolder,
  onLocate,
  onClose,
}: InspectorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const proposalRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!focusNonce) return;
    requestAnimationFrame(() => {
      if (aiProposal) proposalRef.current?.focus();
      else textareaRef.current?.focus();
    });
  }, [focusNonce, aiProposal?.path]);

  const limit = target?.dir ? 200 : 2000;
  const activeText = aiProposal ? aiProposal.text : draft;
  const unavailable = !target || target.link || savedNote === null;
  const loadingNote = target && !target.link && savedNote === undefined;
  const meta = target ? classifyEntry(target) : null;

  return (
    <motion.aside
      aria-label="备注详情栏"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={SPRING_GENTLE}
      className="flex min-h-0 w-[304px] flex-none flex-col border-l border-hairline bg-inspector max-[1020px]:absolute max-[1020px]:inset-y-0 max-[1020px]:right-0 max-[1020px]:z-20 max-[1020px]:w-[min(332px,90%)] max-[1020px]:shadow-lg"
    >
      <div className="flex h-10 flex-none items-center justify-between border-b border-hairline pl-[18px] pr-3">
        <span className="text-[11px] font-semibold tracking-[0.05em] text-ink-muted">
          {isCurrentFolder ? '当前目录' : target?.dir ? '子文件夹' : '文件详情'}
        </span>
        <Button
          variant="icon"
          size="xs"
          title="关闭详情栏 (Ctrl+I)"
          aria-label="关闭详情栏"
          onClick={onClose}
        >
          <X size={15} />
        </Button>
      </div>

      {target ? (
        <div className="min-h-0 flex-1 overflow-auto px-[18px] pb-5 pt-4">
          <div className="flex items-start gap-2.5">
            <FileGlyph item={target} open={isCurrentFolder} size={20} framed />
            <div className="min-w-0 flex-1">
              <h2
                title={target.name}
                className="m-0 font-display text-[15.5px] font-semibold leading-[1.3] text-ink [overflow-wrap:anywhere]"
              >
                {target.name}
              </h2>
              <span className="mt-0.5 block text-[11.5px] text-ink-muted">
                {meta?.label}
                {target.dir ? ' · 同步至资源管理器' : ' · 保存在本机'}
              </span>
            </div>
          </div>

          {/* BoardUI concentric metadata card */}
          <dl className="mb-3 mt-3.5 flex flex-col gap-1.5 rounded-[12px] border border-hairline bg-subtle px-3 py-2.5">
            <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2 text-[11.5px]">
              <dt className="text-ink-faint">路径</dt>
              <dd className="m-0 flex min-w-0 items-center gap-1 text-ink-secondary">
                <span title={target.path} className="min-w-0 flex-1 truncate font-mono text-[11px]">
                  {target.path}
                </span>
                <CopyButton value={target.path} />
              </dd>
            </div>
            {!target.dir && target.size != null && target.size >= 0 && (
              <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2 text-[11.5px]">
                <dt className="text-ink-faint">大小</dt>
                <dd className="m-0 tabular-nums text-ink-secondary">{formatBytes(target.size)}</dd>
              </div>
            )}
            {target.modified ? (
              <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2 text-[11.5px]">
                <dt className="text-ink-faint">修改</dt>
                <dd className="m-0 tabular-nums text-ink-secondary">{formatTimestamp(target.modified)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-1.5">
            {target.dir && !isCurrentFolder && !target.link && (
              <Button variant="subtle" size="xs" onClick={() => onOpenFolder(target.path)}>
                <FolderOpen size={13} />
                <span>进入文件夹</span>
              </Button>
            )}
            <Button variant="subtle" size="xs" onClick={() => onLocate(target.path)}>
              <ArrowUpRight size={13} />
              <span>资源管理器定位</span>
            </Button>
          </div>

          <div className="my-4 h-px bg-hairline" />

          <AnimatePresence mode="wait" initial={false}>
            {aiGenerating ? (
              <motion.div
                key="generating"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={SPRING_SNAPPY}
                className="flex flex-col gap-2.5 rounded-[14px] border border-accent-border bg-elevated p-3.5 shadow-[0_0_0_3px_var(--accent-subtle)]"
              >
                <div className="flex items-center gap-2 text-accent-text">
                  <motion.span
                    animate={{ scale: [1, 1.15, 1], opacity: [1, 0.55, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="inline-flex"
                  >
                    <Sparkle size={15} weight="duotone" />
                  </motion.span>
                  <strong className="text-[13px] font-semibold">正在生成候选备注…</strong>
                </div>
                <p className="m-0 text-[12px] leading-[1.55] text-ink-muted">
                  正在分析目录结构与可读摘录，生成后由你确认再写入保存。
                </p>
                <div className="flex flex-col gap-1.5 py-1" aria-hidden="true">
                  <span className="ai-shimmer-line block h-[7px] rounded-full" />
                  <span className="ai-shimmer-line block h-[7px] w-[72%] rounded-full" />
                </div>
                <Button variant="secondary" size="sm" onClick={onCancelAi}>
                  取消生成
                </Button>
              </motion.div>
            ) : aiProposal ? (
              <motion.div
                key="proposal"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={SPRING_SNAPPY}
                className="flex flex-col gap-2.5 rounded-[14px] border border-accent-border bg-elevated p-3.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] leading-none font-semibold text-accent-text">
                    <Sparkle size={13} weight="fill" />
                    AI 候选备注
                  </span>
                  <span
                    className={cn(
                      'text-[11.5px] leading-none tabular-nums',
                      aiProposal.text.length >= limit * 0.9 ? 'font-semibold text-status-warn' : 'text-ink-faint'
                    )}
                  >
                    {aiProposal.text.length}/{limit}
                  </span>
                </div>

                {savedNote && (
                  <div className="rounded-r-[7px] border-l-2 border-border-strong bg-subtle px-2.5 py-2">
                    <span className="mb-0.5 block text-[10.5px] font-semibold text-ink-faint">原备注</span>
                    <p className="m-0 whitespace-pre-wrap text-[12px] leading-[1.5] text-ink-secondary [overflow-wrap:anywhere]">
                      {savedNote}
                    </p>
                  </div>
                )}

                <textarea
                  ref={proposalRef}
                  rows={5}
                  value={aiProposal.text}
                  maxLength={limit}
                  aria-label="确认或微调 AI 生成的备注"
                  onChange={(e) => onProposalChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      e.preventDefault();
                      onAcceptProposal();
                    }
                  }}
                  className="block w-full resize-y rounded-[10px] border border-accent-border bg-canvas px-3 py-2.5 text-[13px] leading-[1.6] text-ink outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--accent-subtle)]"
                />

                {error && (
                  <div role="alert" className="rounded-[8px] bg-status-danger-bg px-2.5 py-2 text-[12px] text-status-danger">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Button variant="primary" size="md" disabled={working} onClick={onAcceptProposal}>
                    <Check size={14} />
                    <span>采用并保存</span>
                  </Button>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button variant="secondary" size="sm" disabled={working} onClick={onStartAi}>
                      <Sparkle size={13} />
                      <span>重新生成</span>
                    </Button>
                    <Button variant="ghost" size="sm" disabled={working} onClick={onDiscardProposal}>
                      放弃候选
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14 }}
                className="flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <label htmlFor="inspector-note-input" className="inline-flex items-center gap-2 text-[12px] leading-none font-semibold text-ink">
                    <span>备注内容</span>
                    {dirty && (
                      <span className="rounded-full bg-status-warn-bg px-1.5 py-[2px] text-[10.5px] leading-none font-semibold text-status-warn">
                        未保存
                      </span>
                    )}
                  </label>
                  <span
                    className={cn(
                      'text-[11.5px] leading-none tabular-nums',
                      activeText.length >= limit * 0.9 ? 'font-semibold text-status-warn' : 'text-ink-faint'
                    )}
                  >
                    {activeText.length}/{limit}
                  </span>
                </div>

                <textarea
                  id="inspector-note-input"
                  ref={textareaRef}
                  rows={6}
                  value={draft}
                  disabled={unavailable || loadingNote || working}
                  maxLength={limit}
                  placeholder={
                    unavailable
                      ? '此项为符号链接或备注不可读取'
                      : loadingNote
                      ? '正在读取备注…'
                      : target.dir
                      ? '简短说明此文件夹的用途、归属或状态（最多 200 字）…'
                      : '记录此文件的用途、版本背景或交付说明…'
                  }
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter' && dirty && !working) {
                      e.preventDefault();
                      onSave();
                    }
                  }}
                  className="block w-full resize-y rounded-[12px] border border-border-subtle bg-elevated px-3 py-2.5 text-[13px] leading-[1.62] text-ink shadow-xs outline-none transition-all duration-150 placeholder:text-ink-faint focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-subtle)] disabled:opacity-55"
                />

                {error && (
                  <div role="alert" className="rounded-[8px] bg-status-danger-bg px-2.5 py-2 text-[12px] text-status-danger">
                    {error}
                  </div>
                )}

                <div className="mt-0.5 flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={unavailable || loadingNote || working || !dirty}
                    onClick={onSave}
                  >
                    <Check size={14} />
                    <span>保存备注</span>
                    <kbd
                      className={cn(
                        'ml-0.5 rounded px-1.5 py-[1px] font-mono text-[10.5px] font-medium',
                        dirty ? 'bg-accent-ink/15 text-accent-ink' : 'bg-hover text-ink-faint'
                      )}
                    >
                      Ctrl S
                    </kbd>
                  </Button>

                  <Button
                    variant="ai"
                    size="md"
                    disabled={unavailable || loadingNote || working}
                    onClick={onStartAi}
                  >
                    <Sparkle size={14} weight="duotone" />
                    <span>AI 生成草稿</span>
                  </Button>

                  <div className="flex min-h-7 items-center justify-end gap-1.5">
                    {dirty && (
                      <Button variant="ghost" size="xs" disabled={working} onClick={onRevert}>
                        <ArrowCounterClockwise size={13} />
                        <span>还原修改</span>
                      </Button>
                    )}
                    {!dirty && Boolean(savedNote) && !unavailable && (
                      <ConfirmButton
                        label="清空备注"
                        confirmLabel="再次点击确认清空"
                        disabled={working}
                        onConfirm={onClearNote}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="px-[18px] py-7 text-[12.5px] leading-[1.6] text-ink-muted">
          打开文件夹并选择任意项目，即可在此处查看与编写备注。
        </div>
      )}
    </motion.aside>
  );
}
