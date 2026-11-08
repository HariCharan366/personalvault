import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-obsidian-800 dark:text-slate-300 border-slate-200 dark:border-white/[0.08]',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-neon-mint border-emerald-500/20 dark:border-neon-mint/30 shadow-sm shadow-emerald-500/5',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20 shadow-sm shadow-amber-500/5',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/5',
    info: 'bg-cyan-500/10 text-cyan-600 dark:text-neon-cyan border-cyan-500/20 shadow-sm shadow-cyan-500/5',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-neon-violet border-purple-500/20',
    outline: 'border border-slate-300 dark:border-white/[0.12] text-slate-700 dark:text-slate-300',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" />
      {children}
    </span>
  );
};
