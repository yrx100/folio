import React from 'react';
import { motion } from 'motion/react';
import { cn, SPRING_PILL } from '@/lib/utils';

interface SpringSwitchProps {
  checked: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: () => void;
}

export function SpringSwitch({ checked, disabled = false, ariaLabel, onChange }: SpringSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-[24px] w-[42px] flex-none items-center rounded-full p-[2px] transition-colors duration-200',
        checked ? 'bg-accent justify-end' : 'bg-border-strong justify-start',
        disabled && 'opacity-45'
      )}
    >
      <motion.span
        layout
        transition={SPRING_PILL}
        whileTap={disabled ? undefined : { scaleX: 1.12, scaleY: 0.92 }}
        className={cn(
          'h-5 w-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.22)]',
          checked ? 'bg-accent-ink' : 'bg-white'
        )}
      />
    </button>
  );
}
