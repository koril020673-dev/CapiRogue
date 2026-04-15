import React from 'react';

export default function HoverHint({
  children,
  title,
  description,
  pros,
  cons,
  examples = [],
  state,
  disabled = false,
  fill = false,
  align = 'start',
  className = '',
}) {
  const rootClassName = [
    'hover-hint',
    fill ? 'fill' : '',
    align === 'end' ? 'align-end' : '',
    disabled ? 'is-disabled' : 'is-ready',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {children}
      <div className="hover-hint-panel" role="tooltip" aria-hidden="true">
        <div className="hover-hint-header">
          <span className={`hover-hint-badge ${disabled ? 'blocked' : 'ready'}`}>
            {disabled ? '잠김' : '실행 가능'}
          </span>
          {title && <strong>{title}</strong>}
        </div>
        {description && <div className="hover-hint-text">{description}</div>}
        {pros && (
          <div className="hover-hint-line">
            <span>장점</span>
            <p>{pros}</p>
          </div>
        )}
        {cons && (
          <div className="hover-hint-line">
            <span>주의</span>
            <p>{cons}</p>
          </div>
        )}
        {examples.length > 0 && (
          <div className="hover-hint-examples">
            <span>예시</span>
            <ul>
              {examples.map((example) => <li key={example}>{example}</li>)}
            </ul>
          </div>
        )}
        {state && <div className={`hover-hint-footer${disabled ? ' blocked' : ''}`}>{state}</div>}
      </div>
    </div>
  );
}
