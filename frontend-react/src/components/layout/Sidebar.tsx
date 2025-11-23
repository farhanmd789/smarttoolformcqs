import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiFileText, FiClock, FiBook } from 'react-icons/fi';
import clsx from 'clsx';
import { ThemeToggle } from '../ui/ThemeToggle';

const navItems = [
  { path: '/quiz', label: 'Generate Quiz', icon: FiHome },
  { path: '/notes', label: 'Learning Notes', icon: FiBook },
  { path: '/history', label: 'Quiz History', icon: FiClock },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <FiFileText />
            Quiz Generator
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          AI-Powered Learning
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Quick Tips
        </h3>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Generate up to 25 questions</li>
          <li>• Choose difficulty levels</li>
          <li>• Export notes as PDF</li>
          <li>• Track your progress</li>
        </ul>
      </div>
    </aside>
  );
};
