import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore.js';

const ACT_TITLES = { 1: 'Act I', 2: 'Act II', 3: 'Act III', 4: 'Epilogue' };

export default function StoryModal() {
  const closeModal = useGameStore(s => s.closeModal);
  const d = useGameStore(s => s.modalData) || {};
  const { act = 1, title = '', text = '' } = d;

  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);

    timerRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(timerRef.current);
        setDone(true);
      }
    }, 28);

    return () => clearInterval(timerRef.current);
  }, [text]);

  const skip = () => {
    clearInterval(timerRef.current);
    setDisplayed(text);
    setDone(true);
  };

  return (
    <div className="modal-box story-modal">
      <div className="story-act">{ACT_TITLES[act]}</div>
      <h3 className="story-title">{title}</h3>
      <div className="story-text">{displayed}<span className="story-cursor">|</span></div>
      <div className="modal-footer-row">
        {!done && <button className="btn btn-ghost" onClick={skip}>건너뛰기</button>}
        {done  && <button className="btn btn-primary btn-block" onClick={closeModal}>계속</button>}
      </div>
    </div>
  );
}
