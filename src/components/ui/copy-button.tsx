import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from '@phosphor-icons/react';
import { cn, SPRING_SNAPPY } from '@/lib/utils';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = '复制完整路径', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [value]);

  function handleCopy() {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      transition={SPRING_SNAPPY}
      title={copied ? '已复制路径' : label}
      aria-label={label}
      onClick={handleCopy}
      className={cn(
        'inline-grid h-6 w-6 flex-none place-items-center rounded-[6px] transition-colors duration-150',
        copied
          ? 'bg-status-ok-bg text-status-ok'
          : 'text-ink-muted hover:bg-hover hover:text-ink',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="ok"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={12} weight="bold" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy size={12} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
