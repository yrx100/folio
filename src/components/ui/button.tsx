import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn, SPRING_SNAPPY } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ai' | 'subtle' | 'ghost' | 'icon';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-accent-hover disabled:bg-subtle disabled:border-hairline disabled:text-ink-faint disabled:shadow-none disabled:opacity-100',
  secondary:
    'bg-elevated border-border-subtle text-ink shadow-xs hover:bg-subtle hover:border-border-strong disabled:opacity-40',
  ai:
    'bg-accent-soft border-transparent text-accent-text hover:border-accent-border disabled:opacity-40',
  subtle:
    'bg-subtle text-ink-secondary hover:bg-active hover:text-ink disabled:opacity-40',
  ghost:
    'text-ink-secondary hover:bg-hover hover:text-ink disabled:opacity-40',
  icon:
    'text-ink-muted hover:bg-hover hover:text-ink disabled:opacity-40',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 gap-1.5 text-[12px] rounded-[7px]',
  sm: 'h-[30px] px-3 gap-1.5 text-[12px] rounded-[8px]',
  md: 'h-[34px] px-3.5 gap-2 text-[12.5px] rounded-[9px]',
  lg: 'h-10 px-4 gap-2 text-[13px] rounded-[10px]',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'w-6 h-6 p-0 rounded-[6px]',
  sm: 'w-7 h-7 p-0 rounded-[7px]',
  md: 'w-[30px] h-[30px] p-0 rounded-[8px]',
  lg: 'w-9 h-9 p-0 rounded-[9px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', disabled, type = 'button', children, ...rest }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={SPRING_SNAPPY}
        className={cn(
          'inline-flex items-center justify-center border border-transparent font-medium whitespace-nowrap select-none transition-colors duration-150',
          VARIANT_CLASSES[variant],
          variant === 'icon' ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size],
          className
        )}
        {...rest}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
