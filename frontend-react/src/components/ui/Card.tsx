import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false, onClick }) => {
  return (
    <div
      className={clsx(
        'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6',
        'bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90',
        hover && 'hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer gradient-shadow-hover',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
