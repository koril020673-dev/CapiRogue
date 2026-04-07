import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmt, fmtW } from '../../utils.js';
import { C } from '../../constants.js';

export default function FinanceModal() {
  const closeModal  = useGameStore(s => s.closeModal);
  const capital     = useGameStore(s => s.capital);
  const debt        = useGameStore(s => s.debt);
  const borrow      = useGameStore(s => s.borrow);
  const repay       = useGameStore(s => s.repay);
  const interestRate = useGameStore(s => s.interestRate);
  const addToast    = useGameStore(s => s.addToast);

  const [tab, setTab] = useState('borrow');
  const [amount, setAmount] = useState(0);

  const maxBorrow = C.LOAN_MAX - debt;
  const maxRepay  = Math.min(debt, capital);
  const currentMax = tab === 'borrow' ? maxBorrow : maxRepay;

  const interest = tab === 'borrow'
    ? Math.round(amount * interestRate / 12)
    : 0;

  const handleConfirm = () => {
    if (amount <= 0) { addToast('금액을 입력하세요', 'warn'); return; }
    if (tab === 'borrow') borrow(amount);
    else repay(amount);
    closeModal();
  };

  return (
    <div className="modal-box finance-modal">
      <div className="modal-header">
        <h3>금융</h3>
        <button className="modal-close" onClick={closeModal}>✕</button>
      </div>

      <div className="tab-row">
        <button className={`tab-btn ${tab === 'borrow' ? 'active' : ''}`} onClick={() => { setTab('borrow'); setAmount(0); }}>대출</button>
        <button className={`tab-btn ${tab === 'repay'  ? 'active' : ''}`} onClick={() => { setTab('repay');  setAmount(0); }}>상환</button>
      </div>

      <div className="finance-info">
        {tab === 'borrow' ? (
          <p>최대 대출 가능: <strong>{fmtW(maxBorrow)}</strong>  |  연이율 {(interestRate * 100).toFixed(1)}%</p>
        ) : (
          <p>현재 부채: <strong>{fmtW(debt)}</strong>  |  상환 가능: {fmtW(maxRepay)}</p>
        )}
      </div>

      <div className="finance-slider">
        <input
          type="range"
          min={0}
          max={currentMax}
          step={Math.max(1_000_000, Math.round(currentMax / 100))}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
        <input
          type="number"
          className="finance-input"
          value={amount}
          min={0}
          max={currentMax}
          onChange={e => setAmount(Math.min(currentMax, Math.max(0, Number(e.target.value))))}
        />
        <span className="finance-unit">원</span>
      </div>

      {tab === 'borrow' && amount > 0 && (
        <div className="finance-preview">
          <span>월 이자 예상:</span>
          <span className="red">{fmtW(interest)}</span>
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={handleConfirm} disabled={amount <= 0}>
        {tab === 'borrow' ? `${fmtW(amount)} 대출` : `${fmtW(amount)} 상환`}
      </button>
    </div>
  );
}
