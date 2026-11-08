import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  glass = false,
  glow = false,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl border transition-all duration-200',
          glass
            ? 'glass-card'
            : 'bg-white dark:bg-vault-900 border-slate-200 dark:border-vault-800 shadow-sm',
          glow && 'hover:shadow-glow-sm hover:border-indigo-500/40',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
