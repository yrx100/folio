import React from 'react';
import { motion } from 'motion/react';
import { cn, SPRING_PILL } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  id: T;
  label?: string;
  count?: number;
  icon?: React.ReactNode;
  title?: string;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  layoutId: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  iconOnly?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  layoutId,
  value,
  options,
  onChange,
  ariaLabel,
  iconOnly = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center flex-none rounded-[10px] bg-subtle p-[3px] border border-hairline',
        className
      )}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={opt.ariaLabel || opt.label}
            title={opt.title || opt.label}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative z-[1] inline-flex items-center justify-center rounded-[7px] transition-colors duration-150 select-none whitespace-nowrap',
              iconOnly ? 'w-7 h-[26px]' : 'h-[26px] px-2.5 gap-1.5 text-[12px]',
              active ? 'text-ink font-semibold' : 'text-ink-secondary font-medium hover:text-ink'
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING_PILL}
                aria-hidden="true"
                className="absolute inset-0 -z-[1] rounded-[7px] bg-elevated shadow-xs"
              />
            )}
            {opt.icon}
            {!iconOnly && opt.label && <span className="leading-none">{opt.label}</span>}
            {!iconOnly && typeof opt.count === 'number' && (
              <span
                className={cn(
                  'text-[11.5px] leading-none font-medium tabular-nums translate-y-[0.5px] transition-colors duration-150',
                  active ? 'text-accent-text' : 'text-ink-faint'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
