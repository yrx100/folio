import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trash, WarningCircle } from '@phosphor-icons/react';
import { cn, SPRING_SNAPPY } from '@/lib/utils';

interface ConfirmButtonProps {
  label: string;
  confirmLabel?: string;
  disabled?: boolean;
  onConfirm: () => void;
  className?: string;
}

export function ConfirmButton({
  label,
  confirmLabel = '再次点击确认',
  disabled = false,
  onConfirm,
  className,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3200);
    return () => clearTimeout(timer);
  }, [armed]);

  useEffect(() => {
    if (disabled) setArmed(false);
  }, [disabled]);

  function handleClick() {
    if (disabled) return;
    if (!armed) {
      setArmed(true);
    } else {
      setArmed(false);
      onConfirm();
    }
  }

  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={SPRING_SNAPPY}
      onClick={handleClick}
      onBlur={() => setArmed(false)}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[12px] font-medium transition-colors duration-150 select-none overflow-hidden',
        armed
          ? 'bg-status-danger-bg text-status-danger border border-status-danger/25'
          : 'text-ink-muted hover:bg-status-danger-bg hover:text-status-danger',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {armed ? (
          <motion.span
            key="confirm"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="inline-flex items-center gap-1.5"
          >
            <WarningCircle size={13} weight="fill" />
            <span>{confirmLabel}</span>
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className="inline-flex items-center gap-1.5"
          >
            <Trash size={13} />
            <span>{label}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
