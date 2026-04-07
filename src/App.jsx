import React from 'react';
import { useGameStore } from './store/useGameStore.js';
import DifficultyScreen from './components/DifficultyScreen.jsx';
import GameLayout from './components/GameLayout.jsx';
import ModalManager from './components/modals/ModalManager.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const gamePhase = useGameStore(s => s.gamePhase);
  return (
    <>
      {gamePhase === 'difficulty' ? <DifficultyScreen /> : <GameLayout />}
      <ModalManager />
      <Toast />
    </>
  );
}
