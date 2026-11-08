import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  glass = true,
  glow = false,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl transition-all duration-300',
          glass
            ? 'glass-card'
            : 'bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-white/[0.08] shadow-md',
          glow && 'hover:shadow-glow-brand hover:border-neon-mint/40',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
