import React, { useState, useEffect } from 'react';

interface GameMenuProps {
  side: 'left' | 'right';
  triggerIcon: React.ReactNode;
  children: React.ReactNode;
  keyboardShortcut?: string;
}

export const GameMenu: React.FC<GameMenuProps> = ({ 
  side, 
  triggerIcon, 
  children,
  keyboardShortcut
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Handle keyboard shortcut
  useEffect(() => {
    if (!keyboardShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === keyboardShortcut.toLowerCase()) {
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcut]);

  // Handle hover behavior
  useEffect(() => {
    if (side === 'right' && !isOpen) return; // Right menu only opens on keyboard
    if (isHovered) {
      setIsOpen(true);
    } else {
      // Only close if it wasn't opened by keyboard
      if (side === 'left' || (side === 'right' && !isOpen)) {
        setIsOpen(false);
      }
    }
  }, [isHovered, side, isOpen]);

  return (
    <div 
      className={`game-menu ${side} ${isOpen ? 'open' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="game-menu-trigger">
        {triggerIcon}
      </div>
      <div className="game-menu-content overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
