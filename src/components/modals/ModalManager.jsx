import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import ReportModal     from './ReportModal.jsx';
import FinanceModal    from './FinanceModal.jsx';
import RealtyModal     from './RealtyModal.jsx';
import MnaModal        from './MnaModal.jsx';
import MetaModal       from './MetaModal.jsx';
import NewsModal       from './NewsModal.jsx';
import StoryModal      from './StoryModal.jsx';
import GameOverModal   from './GameOverModal.jsx';
import BlackSwanModal  from './BlackSwanModal.jsx';

export default function ModalManager() {
  const activeModal = useGameStore(s => s.activeModal);
  if (!activeModal) return null;

  const isKnownModal = [
    'report',
    'finance',
    'realty',
    'mna',
    'meta',
    'news',
    'story',
    'gameover',
    'blackswan',
  ].includes(activeModal);

  if (!isKnownModal) return null;

  return (
    <div className="modal-overlay">
      {activeModal === 'report'    && <ReportModal />}
      {activeModal === 'finance'   && <FinanceModal />}
      {activeModal === 'realty'    && <RealtyModal />}
      {activeModal === 'mna'       && <MnaModal />}
      {activeModal === 'meta'      && <MetaModal />}
      {activeModal === 'news'      && <NewsModal />}
      {activeModal === 'story'     && <StoryModal />}
      {activeModal === 'gameover'  && <GameOverModal />}
      {activeModal === 'blackswan' && <BlackSwanModal />}
    </div>
  );
}
