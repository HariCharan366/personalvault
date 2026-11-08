import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

    const variants = {
      primary:
        'bg-gradient-to-r from-emerald-400 via-neon-mint to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-obsidian-950 shadow-md shadow-emerald-500/20 hover:shadow-glow-brand focus:ring-neon-mint border border-emerald-300/40 font-bold',
      secondary:
        'bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-obsidian-800 dark:hover:bg-obsidian-750 dark:text-slate-100 border border-slate-300 dark:border-white/[0.08] focus:ring-slate-400 shadow-sm',
      danger:
        'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-md shadow-rose-500/20 focus:ring-rose-500 border border-rose-400/30 font-semibold',
      ghost:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-obsidian-800 text-slate-700 dark:text-slate-300 focus:ring-slate-400',
      outline:
        'bg-transparent border border-slate-300 dark:border-white/[0.12] hover:bg-slate-100 dark:hover:bg-obsidian-800 text-slate-800 dark:text-slate-200 focus:ring-neon-mint',
      glass:
        'bg-white/10 hover:bg-white/15 dark:bg-obsidian-850/60 dark:hover:bg-obsidian-800/80 text-slate-900 dark:text-white backdrop-blur-md border border-white/20 dark:border-white/[0.1] shadow-sm focus:ring-neon-mint',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
      icon: 'p-2 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
