import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowCounterClockwise, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { UndoRecord } from '@/types';
import { SPRING_SNAPPY } from '@/lib/utils';

interface ToastBarProps {
  message: string;
  isError?: boolean;
  undo: UndoRecord | null;
  working: boolean;
  onUndo: () => void;
}

export function ToastBar({ message, isError = false, undo, working, onUndo }: ToastBarProps) {
  const visible = Boolean(message || undo);

  return (
    <div className="pointer-events-none fixed bottom-11 left-1/2 z-30 -translate-x-1/2 flex justify-center px-4">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={message || undo?.item.path}
            role="status"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={SPRING_SNAPPY}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-border-subtle bg-elevated/95 px-3.5 py-1.5 text-[12px] text-ink shadow-md backdrop-blur-md"
          >
            {isError ? (
              <WarningCircle size={15} weight="fill" className="text-status-danger flex-none" />
            ) : (
              <CheckCircle size={15} weight="fill" className="text-status-ok flex-none" />
            )}
            <span className="max-w-[320px] truncate font-medium">
              {message || (undo ? `已写入「${undo.item.name}」的 AI 备注` : '')}
            </span>
            {undo && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={working}
                onClick={onUndo}
                className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-accent-text hover:bg-accent hover:text-accent-ink transition-colors duration-150"
              >
                <ArrowCounterClockwise size={12} />
                <span>撤销 AI 备注</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
