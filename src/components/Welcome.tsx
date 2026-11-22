import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ClockCounterClockwise,
  Columns,
  FilePdf,
  FileText,
  FolderOpen,
  FolderSimple,
  Sparkle,
} from '@phosphor-icons/react';
import { driveBadge, leafName } from '@/utils/paths';
import { SPRING_GENTLE, SPRING_SNAPPY } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { Button } from './ui/button';

interface WelcomeProps {
  recentRoots: string[];
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onTour: () => void;
}

export function Welcome({ recentRoots, onOpen, onOpenRecent, onTour }: WelcomeProps) {
  return (
    <section
      aria-labelledby="welcome-title"
      className="grid flex-1 place-items-center p-[clamp(24px,4vw,48px)]"
    >
      <div className="grid w-full max-w-[890px] grid-cols-1 items-center gap-[clamp(28px,4.5vw,56px)] min-[880px]:grid-cols-[minmax(0,1fr)_minmax(300px,424px)]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_GENTLE}
        >
          <div className="mb-3.5 inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.1em] text-accent-text">
            <BrandMark size={20} />
            <span>WINDOWS ARCHIVAL NOTES</span>
          </div>
          <h1
            id="welcome-title"
            className="m-0 font-display text-[clamp(26px,3.2vw,34px)] font-semibold leading-[1.2] tracking-[-0.03em] text-ink"
          >
            为本地目录留存清晰脉络
          </h1>
          <p className="mb-6 mt-3 max-w-[400px] text-[13.5px] leading-[1.7] text-ink-secondary">
            在一屏之内梳理文件夹层级、撰写说明与检索备注；文件夹备注自动同步至 Windows 资源管理器「备注」列。
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary" size="lg" data-tour="open" onClick={onOpen}>
              <FolderOpen size={17} aria-hidden="true" />
              <span>打开文件夹</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="lg" onClick={onTour}>
              <span>快速上手引导</span>
            </Button>
          </div>

          {recentRoots.length > 0 && (
            <div className="mt-7 border-t border-hairline pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-muted">
                <ClockCounterClockwise size={13} aria-hidden="true" />
                <span>最近打开</span>
              </div>
              <div className="flex flex-col gap-1">
                {recentRoots.slice(0, 4).map((dir) => (
                  <motion.button
                    key={dir}
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    transition={SPRING_SNAPPY}
                    title={dir}
                    onClick={() => onOpenRecent(dir)}
                    className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-left transition-colors hover:bg-subtle"
                  >
                    <span className="rounded-[5px] bg-subtle px-1.5 py-[1px] font-mono text-[10.5px] font-semibold text-ink-muted">
                      {driveBadge(dir)}
                    </span>
                    <span className="whitespace-nowrap font-semibold text-ink">{leafName(dir)}</span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-faint">{dir}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.figure
          data-tour="example"
          aria-label="Folio 标注界面预览"
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...SPRING_GENTLE, delay: 0.06 }}
          className="m-0 overflow-hidden rounded-[18px] border border-border-subtle bg-elevated shadow-md"
        >
          <div className="flex items-center justify-between gap-2 border-b border-hairline bg-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <FolderOpen size={15} weight="duotone" className="glyph-folder flex-none" />
              <strong className="text-[13px] font-semibold text-ink">品牌手册</strong>
              <span className="text-[11px] tabular-nums text-ink-muted">4 项 · 75% 已备注</span>
            </div>
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-status-ok-bg px-2 py-0.5 text-[11px] font-semibold text-status-ok">
              <Columns size={12} />
              备注列同步
            </span>
          </div>

          <div className="flex items-baseline gap-2 border-b border-hairline bg-canvas px-4 py-2.5">
            <span className="flex-none rounded-[5px] bg-subtle px-1.5 py-[1px] text-[10.5px] font-semibold text-ink-muted">
              目录备注
            </span>
            <p className="m-0 text-[12px] leading-[1.5] text-ink-secondary">
              品牌标识、设计规范与对外交付资料的整理根目录
            </p>
          </div>

          <ul className="m-0 list-none py-1.5">
            <li className="flex items-center gap-2.5 px-4 py-2 text-[12px]">
              <FolderSimple size={15} weight="duotone" className="glyph-folder flex-none" />
              <span className="min-w-[82px] flex-none font-semibold text-ink">设计稿</span>
              <span className="min-w-0 flex-1 truncate text-ink-secondary">标志源文件、标准色板与字体规范</span>
            </li>
            <li className="flex items-center gap-2.5 px-4 py-2 text-[12px]">
              <FolderSimple size={15} weight="duotone" className="glyph-folder flex-none" />
              <span className="min-w-[82px] flex-none font-semibold text-ink">交付清单</span>
              <span className="min-w-0 flex-1 truncate text-ink-secondary">对外交付包版本记录与使用说明</span>
            </li>
            <li className="flex items-center gap-2.5 bg-accent-subtle px-4 py-2 text-[12px] shadow-[inset_2.5px_0_0_var(--accent)]">
              <FilePdf size={15} weight="duotone" className="glyph-pdf flex-none" />
              <span className="min-w-[82px] flex-none font-semibold text-ink">品牌手册.pdf</span>
              <span className="min-w-0 flex-1 truncate text-ink-secondary">面向合作伙伴的 2026 版视觉指南</span>
            </li>
            <li className="flex items-center gap-2.5 px-4 py-2 text-[12px]">
              <FileText size={15} weight="duotone" className="glyph-doc flex-none" />
              <span className="min-w-[82px] flex-none font-semibold text-ink">README.md</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-text">
                <Sparkle size={11} weight="fill" />
                AI 拟稿 / 待补充
              </span>
            </li>
          </ul>
        </motion.figure>
      </div>
    </section>
  );
}
