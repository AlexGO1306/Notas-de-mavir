import React from 'react';
import { TaskStatus } from '../types';

interface StatusButtonsProps {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusButtons({ status, onChange, disabled }: StatusButtonsProps) {
  const handleCyclicToggle = () => {
    if (disabled) return;
    
    // Cycle logic: falsy -> 'cumplido' -> 'pendiente' -> 'no_cumplido' -> null
    if (!status) onChange('cumplido');
    else if (status === 'cumplido') onChange('pendiente');
    else if (status === 'pendiente') onChange('no_cumplido');
    else if (status === 'no_cumplido') onChange(null);
  };

  const getStyling = () => {
    if (disabled) return 'cursor-not-allowed';
    
    // The background color is now handled by the parent <td> in App.tsx
    // so this button is just a transparent clickable area that fills the cell
    return 'bg-transparent hover:bg-black/10';
  };

  return (
    <button
      onClick={handleCyclicToggle}
      disabled={disabled}
      className={`block w-full h-full min-h-[32px] transition-colors duration-150 ${getStyling()}`}
      title={
        status === 'cumplido' ? 'Cumplido' :
        status === 'pendiente' ? 'Pendiente' :
        status === 'no_cumplido' ? 'No Cumplido' : 'Sin marcar'
      }
    />
  );
}

