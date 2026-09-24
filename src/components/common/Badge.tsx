import React from 'react';
import { getStatusColor } from '../../lib/utils';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md', className = '' }) => {
  const { bg, text, border } = getStatusColor(status);

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bg} ${text} ${border} ${sizeClass} tracking-wide whitespace-nowrap transition-colors ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {status}
    </span>
  );
};
