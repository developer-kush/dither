import React from 'react';
import { Link } from 'react-router';

interface NavBarProps {
  title?: string;
  rightActions?: React.ReactNode;
}

export const NavBar: React.FC<NavBarProps> = ({
  title,
  rightActions
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b-2 border-black z-50 flex items-center justify-between px-8 pointer-events-auto" style={{ backgroundColor: 'var(--theme-bg-medium)', pointerEvents: 'auto' }}>
      <Link to="/" className="hover:opacity-80 text-3xl font-extrabold px-5 transition-opacity">
        Dither
      </Link>
      
      {title && (
        <div className="text-xl font-bold">{title}</div>
      )}
      
      <div className="flex gap-4">
        {rightActions}
      </div>
    </div>
  );
};
