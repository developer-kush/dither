import React from 'react';

interface GameSectionProps {
  title?: string;
  children: React.ReactNode;
}

export const GameSection: React.FC<GameSectionProps> = ({ title, children }) => {
  return (
    <div className="game-section">
      {title && <div className="game-section-title">{title}</div>}
      {children}
    </div>
  );
};
