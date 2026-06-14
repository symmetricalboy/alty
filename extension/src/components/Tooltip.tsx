import React, { useState } from 'react';
import './Tooltip.css';

export type TooltipState = 'loading' | 'success' | 'error';

interface TooltipProps {
  state: TooltipState;
  altText?: string;
  error?: string;
  onClose: () => void;
}

export const Tooltip: React.FC<TooltipProps> = ({ state, altText, error, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (altText) {
      try {
        await navigator.clipboard.writeText(altText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  const handleSettingsClick = () => {
    browser.runtime.sendMessage({ type: 'OPEN_SETTINGS' }).catch(console.error);
  };

  return (
    <div className="alt-text-tooltip-content">
      <div className="alt-text-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={browser.runtime.getURL('icon-32.png')} alt="Alty logo" style={{ width: '20px', height: '20px' }} />
          <span>Alty</span>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={handleSettingsClick} aria-label="Settings" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button className="icon-button" onClick={onClose} aria-label="Close" title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {state === 'loading' && (
        <div className="loading-container">
          <div className="spinner" />
          <span className="loading-text">Generating alt text...</span>
        </div>
      )}

      {state === 'error' && (
        <div className="error-text">
          {error || 'Failed to generate alt text.'}
        </div>
      )}

      {state === 'success' && (
        <>
          <textarea
            className="alt-text-textarea"
            readOnly
            value={altText || ''}
          />
          <button 
            className={`copy-button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy to Clipboard"
          >
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
        </>
      )}
    </div>
  );
};
