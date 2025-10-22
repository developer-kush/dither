import React from 'react';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: boolean;
}

export const GameButton: React.FC<GameButtonProps> = ({ 
  children, 
  icon = false,
  className = '',
  ...props 
}) => {
  return (
    <button 
      className={`${icon ? 'game-icon-button' : 'game-button'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
