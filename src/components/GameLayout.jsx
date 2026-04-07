import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import TimelineBar from './TimelineBar.jsx';
import LeftPanel from './LeftPanel.jsx';
import CenterPanel from './CenterPanel.jsx';
import RightPanel from './RightPanel.jsx';

export default function GameLayout() {
  const marketShare = useGameStore(s => s.marketShare);
  const monopoly = marketShare >= 0.80;

  return (
    <div className={`layout${monopoly ? ' gold-panel' : ''}`}>
      <TimelineBar />
      <LeftPanel />
      <CenterPanel />
      <RightPanel />
    </div>
  );
}
