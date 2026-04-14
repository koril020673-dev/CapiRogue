import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';

const MENU_PATTERN = [
  [220.0, 277.18, 329.63],
  [196.0, 246.94, 293.66],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 311.13],
];

const PLAY_PATTERN = [
  [164.81, 220.0, 246.94],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66],
  [146.83, 196.0, 246.94],
];

function triggerChord(ctx, master, chord, when, duration) {
  chord.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = index === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, when);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 + (index * 220), when);

    const peak = 0.16 / (index + 1);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(when);
    osc.stop(when + duration + 0.05);
  });
}

function createEngine() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  const ctx = new AudioCtx();
  const master = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();

  compressor.threshold.value = -24;
  compressor.knee.value = 24;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.2;

  master.gain.value = 0;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  return { ctx, master, step: 0, intervalId: null };
}

export default function BgmController() {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const bgmVolume = useGameStore((state) => state.settings?.bgmVolume ?? 0.45);
  const engineRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    const unlock = async () => {
      if (!engineRef.current) {
        engineRef.current = createEngine();
      }
      if (!engineRef.current) return;
      await engineRef.current.ctx.resume();
      setAudioReady(true);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    const gain = Math.max(0, Math.min(1, bgmVolume));
    const safeGain = gain <= 0 ? 0 : Math.pow(gain, 1.35) * 0.18;
    engineRef.current.master.gain.setTargetAtTime(safeGain, engineRef.current.ctx.currentTime, 0.15);
  }, [bgmVolume]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return undefined;

    const pattern = gamePhase === 'playing' ? PLAY_PATTERN : MENU_PATTERN;
    const stepDuration = gamePhase === 'playing' ? 2200 : 2800;
    engine.step = 0;

    const playStep = () => {
      if (!engine || engine.ctx.state !== 'running') return;
      const when = engine.ctx.currentTime + 0.05;
      triggerChord(engine.ctx, engine.master, pattern[engine.step % pattern.length], when, stepDuration / 1000 * 0.82);
      engine.step += 1;
    };

    playStep();
    engine.intervalId = window.setInterval(playStep, stepDuration);

    return () => {
      if (engine.intervalId) {
        window.clearInterval(engine.intervalId);
        engine.intervalId = null;
      }
    };
  }, [audioReady, gamePhase]);

  useEffect(() => () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.intervalId) window.clearInterval(engine.intervalId);
    engine.master.disconnect();
    engine.ctx.close().catch(() => {});
  }, []);

  return null;
}
