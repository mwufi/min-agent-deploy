import React, { useState } from 'react';
import { BottomBar } from './BottomBar';
import { Panel } from './Panel';

interface BottomPanelProps {
  onClose: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ onClose }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleTogglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <>
      <Panel isOpen={isPanelOpen} onClose={handleClosePanel} />
      <BottomBar onTogglePanel={handleTogglePanel} isPanelOpen={isPanelOpen} />
    </>
  );
};