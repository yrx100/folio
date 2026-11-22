import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn, SPRING_SNAPPY } from '@/lib/utils';

interface RowActionProps {
  kind: 'edit' | 'ai';
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function RowAction({ kind, label, hint, disabled = false, onClick, children }: RowActionProps) {
  const [anchor, setAnchor] = useState<{ right: number; top: number } | null>(null);

  function show(button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    setAnchor({
      right: Math.max(12, window.innerWidth - rect.right),
      top: Math.max(40, rect.top - 8),
    });
  }

  useEffect(() => {
    if (!anchor) return;
    const hide = () => setAnchor(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchor]);

  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={SPRING_SNAPPY}
      onPointerEnter={(e) => show(e.currentTarget)}
      onPointerLeave={() => setAnchor(null)}
      onFocus={(e) => {
        if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget);
      }}
      onBlur={() => setAnchor(null)}
      onClick={(e) => {
        e.stopPropagation();
        setAnchor(null);
        onClick();
      }}
      className={cn(
        'inline-grid h-7 w-7 place-items-center rounded-[7px] text-ink-muted transition-colors duration-150 disabled:opacity-40',
        kind === 'ai'
          ? 'hover:bg-accent-soft hover:text-accent-text focus-visible:bg-accent-soft focus-visible:text-accent-text'
          : 'hover:bg-elevated hover:text-ink hover:shadow-xs focus-visible:bg-elevated focus-visible:text-ink'
      )}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {anchor && !disabled && (
            <motion.span
              role="tooltip"
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.96 }}
              transition={{ duration: 0.13, delay: 0.12 }}
              style={{ right: anchor.right, top: anchor.top }}
              className="pointer-events-none fixed z-50 max-w-[calc(100vw-24px)] -translate-y-full rounded-[7px] bg-ink px-2.5 py-1 text-[11.5px] leading-[1.4] text-elevated shadow-sm"
            >
              {hint}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.button>
  );
}
