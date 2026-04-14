import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore.js';
import SplashScreen from './components/SplashScreen.jsx';
import MainMenu from './components/MainMenu.jsx';
import DifficultyScreen from './components/DifficultyScreen.jsx';
import GameLayout from './components/GameLayout.jsx';
import BgmController from './components/BgmController.jsx';
import ModalManager from './components/modals/ModalManager.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const textScale = useGameStore(s => s.settings?.textScale ?? 1);

  useEffect(() => {
    document.documentElement.style.setProperty('--user-text-scale', String(textScale));
  }, [textScale]);

  return (
    <div className="app-root">
      {gamePhase === 'splash' && <SplashScreen />}
      {gamePhase === 'menu' && <MainMenu />}
      {gamePhase === 'difficulty' && <DifficultyScreen />}
      {gamePhase === 'playing' && <GameLayout />}
      <BgmController />
      <ModalManager />
      <Toast />
    </div>
  );
}
