import React from "react";

interface PixelArtShiftControlsProps {
  onShift: (dir: 'up' | 'down' | 'left' | 'right') => void;
}

export const PixelArtShiftControls: React.FC<PixelArtShiftControlsProps> = ({ onShift }) => (
  <div>
    <label className="font-bold block mb-1 text-black">Shift Pixels</label>
    <div className="flex flex-row gap-2 justify-center mt-2">
      <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => onShift('left')} title="Shift Left">←</button>
      <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => onShift('up')} title="Shift Up">↑</button>
      <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => onShift('down')} title="Shift Down">↓</button>
      <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => onShift('right')} title="Shift Right">→</button>
    </div>
  </div>
);
