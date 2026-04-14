import React, { useEffect } from 'react';
import { SPLASH_DURATION_MS } from '../constants.js';
import { useGameStore } from '../store/useGameStore.js';

export default function SplashScreen() {
  const finishSplash = useGameStore((state) => state.finishSplash);

  useEffect(() => {
    const timer = window.setTimeout(() => finishSplash(), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [finishSplash]);

  return (
    <button type="button" className="splash-screen" onClick={finishSplash}>
      <div className="splash-shell">
        <div className="splash-kicker">Economic Survival Simulator</div>
        <div className="splash-wordmark">capi-rogue</div>
        <div className="splash-title">캐피로그 2.0</div>
        <div className="splash-prompt">클릭하거나 잠시 기다리면 메인 메뉴로 이동합니다</div>
      </div>
    </button>
  );
}
