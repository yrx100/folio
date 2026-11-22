import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Columns } from '@phosphor-icons/react';
import { onHostEvent, rpc } from '@/bridge';
import { cn, SPRING_SNAPPY } from '@/lib/utils';

type ColumnAction = 'Detect' | 'Enable' | 'Disable';

export function CommentColumnChip({ path, onError }: { path: string; onError: (error: Error) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const changing = useRef(false);

  useEffect(() => {
    function check() {
      if (changing.current) return;
      const id = ++requestId.current;
      rpc<boolean | null>('commentColumn', { path, value: 'Check' })
        .then((state) => {
          if (id === requestId.current) setEnabled(state);
        })
        .catch(() => {
          if (id === requestId.current) setEnabled(null);
        });
    }

    check();
    const off = onHostEvent((data) => {
      if (data.event === 'activate') check();
    });
    return () => {
      requestId.current++;
      off();
    };
  }, [path]);

  async function trigger(action: ColumnAction) {
    if (changing.current) return;
    changing.current = true;
    const id = ++requestId.current;
    setBusy(true);
    try {
      const state = await rpc<boolean | null>('commentColumn', { path, value: action });
      if (id === requestId.current) setEnabled(state);
    } catch (err: any) {
      if (id === requestId.current) {
        setEnabled(null);
        onError(err);
      }
    } finally {
      changing.current = false;
      if (id === requestId.current) setBusy(false);
    }
  }

  const action: ColumnAction = enabled === null ? 'Detect' : enabled ? 'Disable' : 'Enable';
  const statusText = busy
    ? '读取中…'
    : enabled === null
    ? '资源管理器备注列'
    : enabled
    ? '备注列已开启'
    : '备注列未开启';
  const ctaText = action === 'Detect' ? '检测' : action === 'Enable' ? '开启' : '关闭';
  const titleText =
    action === 'Detect'
      ? '打开当前目录的资源管理器并检测备注列'
      : action === 'Enable'
      ? '在资源管理器中切换为详细信息视图并开启「备注」列'
      : '在资源管理器中关闭当前目录的「备注」列';

  return (
    <motion.button
      type="button"
      disabled={busy}
      whileTap={busy ? undefined : { scale: 0.97 }}
      transition={SPRING_SNAPPY}
      title={titleText}
      aria-label={`${statusText}，点击${ctaText}`}
      onClick={() => trigger(action)}
      className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-border-subtle bg-elevated pl-2.5 pr-1 text-[12px] text-ink-secondary shadow-xs transition-colors duration-150 hover:border-border-strong hover:text-ink disabled:opacity-45"
    >
      {enabled === null ? (
        <Columns size={13} aria-hidden="true" className="text-ink-muted" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 flex-none rounded-full',
            enabled ? 'bg-status-ok' : 'bg-status-warn'
          )}
        />
      )}
      <span className="cq-col-label whitespace-nowrap">{statusText}</span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
          enabled === true
            ? 'bg-status-ok-bg text-status-ok'
            : enabled === false
            ? 'bg-accent-soft text-accent-text'
            : 'bg-subtle text-ink'
        )}
      >
        {ctaText}
      </span>
    </motion.button>
  );
}
