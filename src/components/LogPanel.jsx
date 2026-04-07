import React from 'react';
import { useGameStore } from '../store/useGameStore.js';

const LOG_COLORS = {
  good: 'var(--green)', bad: 'var(--red)', warn: 'var(--yellow)',
  info: 'var(--dim)', contract: 'var(--blue)',
};

export default function LogPanel() {
  const logs = useGameStore(s => s.logs);

  return (
    <div className="log-panel">
      <div className="log-title">이벤트 로그</div>
      <div className="log-list">
        {logs.length === 0 ? (
          <div className="log-empty">로그 없음</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="log-item" style={{ color: LOG_COLORS[log.type] || 'var(--dim)' }}>
              <span className="log-turn">T{log.turn}</span>
              <span className="log-msg">{log.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
