import React from 'react';

interface GameIconProps {
  type: 'pencil' | 'bucket' | 'eraser' | 'load' | 'save' | 'reset' | 'menu' | 'palette';
}

export const GameIcon: React.FC<GameIconProps> = ({ type }) => {
  const icons = {
    pencil: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M1,13 L3,15 L13,5 L11,3 L1,13" />
        <path fill="currentColor" d="M12,2 L14,4 L15,3 L13,1 L12,2" />
      </svg>
    ),
    bucket: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M4,1 L12,1 L12,3 L13,3 L13,5 L14,5 L14,7 L15,7 L15,12 L14,12 L14,13 L13,13 L13,14 L3,14 L3,13 L2,13 L2,12 L1,12 L1,7 L2,7 L2,5 L3,5 L3,3 L4,3 L4,1" />
      </svg>
    ),
    eraser: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M3,5 L11,5 L11,7 L13,7 L13,9 L11,9 L11,11 L3,11 L3,9 L1,9 L1,7 L3,7 L3,5" />
      </svg>
    ),
    load: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M2,2 L14,2 L14,14 L2,14 L2,2 M4,4 L12,4 L12,12 L4,12 L4,4 M6,7 L10,7 L8,10 L6,7" />
      </svg>
    ),
    save: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M2,2 L14,2 L14,14 L2,14 L2,2 M4,4 L12,4 L12,8 L4,8 L4,4" />
        <path fill="currentColor" d="M6,10 L10,10 L10,12 L6,12 L6,10" />
      </svg>
    ),
    reset: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M3,3 L13,3 L13,13 L3,13 L3,3 M5,5 L11,5 L11,11 L5,11 L5,5" />
        <path fill="currentColor" d="M7,7 L9,7 L9,9 L7,9 L7,7" />
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M3,4 L13,4 L13,6 L3,6 L3,4 M3,7 L13,7 L13,9 L3,9 L3,7 M3,10 L13,10 L13,12 L3,12 L3,10" />
      </svg>
    ),
    palette: (
      <svg viewBox="0 0 16 16" className="w-4 h-4">
        <path fill="currentColor" d="M2,4 L14,4 L14,12 L2,12 L2,4 M4,6 L6,6 L6,8 L4,8 L4,6 M7,6 L9,6 L9,8 L7,8 L7,6 M10,6 L12,6 L12,8 L10,8 L10,6" />
      </svg>
    ),
  };

  return (
    <div className="w-6 h-6 flex items-center justify-center">
      {icons[type]}
    </div>
  );
};
