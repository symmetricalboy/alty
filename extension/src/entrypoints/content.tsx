import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Tooltip, TooltipState } from '../components/Tooltip';
import '../components/Tooltip.css';

const ContentApp = () => {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<TooltipState>('loading');
  const [altText, setAltText] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    
    // Capture phase ensures we grab coordinates before any other script stops propagation
    const handleContextMenu = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
    };
    
    document.addEventListener('contextmenu', handleContextMenu, true);
    console.log('Alty: contextmenu listener registered.');

    const messageListener = (message: any) => {
      console.log('Alty: Received message:', message);
      if (message.type && message.type.startsWith('ALT_TEXT_')) {
        const TOOLTIP_WIDTH = 340;
        const TOOLTIP_HEIGHT = 220;
        
        let safeX = lastX;
        let safeY = lastY;
        
        const PADDING = 24;
        if (safeX - TOOLTIP_WIDTH / 2 < PADDING) safeX = TOOLTIP_WIDTH / 2 + PADDING;
        if (safeX + TOOLTIP_WIDTH / 2 > window.innerWidth - PADDING) safeX = window.innerWidth - TOOLTIP_WIDTH / 2 - PADDING;
        if (safeY - TOOLTIP_HEIGHT / 2 < PADDING) safeY = TOOLTIP_HEIGHT / 2 + PADDING;
        if (safeY + TOOLTIP_HEIGHT / 2 > window.innerHeight - PADDING) safeY = window.innerHeight - TOOLTIP_HEIGHT / 2 - PADDING;

        console.log(`Alty: Setting position to X:${safeX}, Y:${safeY}`);
        setPos({
          x: safeX,
          y: safeY
        });
        
        setVisible(true);
        
        if (message.type === 'ALT_TEXT_LOADING') {
          setState('loading');
        } else if (message.type === 'ALT_TEXT_SUCCESS') {
          setState('success');
          setAltText(message.altText);
        } else if (message.type === 'ALT_TEXT_ERROR') {
          setState('error');
          setError(message.error);
        }
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // composedPath() traverses the Shadow DOM boundary correctly
      if (tooltipRef.current && !e.composedPath().includes(tooltipRef.current)) {
        setVisible(false);
      }
    };

    if (visible) {
      // Delay attachment to avoid immediate trigger from the event that opened it
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('contextmenu', handleClickOutside); // close if they right-click elsewhere
      }, 0);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div 
      ref={tooltipRef}
      className="alt-text-tooltip-overlay" 
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
        transform: 'translate(-50%, -50%)',
        zIndex: 2147483647
      }}
    >
      <Tooltip 
        state={state} 
        altText={altText} 
        error={error} 
        onClose={() => setVisible(false)} 
      />
    </div>
  );
};

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  
  async main(ctx) {
    console.log('Alty: Content script main() executing.');
    
    let lastTarget: HTMLElement | null = null;
    document.addEventListener('contextmenu', (e: MouseEvent) => {
      lastTarget = e.target as HTMLElement;
    }, true);

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXTRACT_IMAGE_DATA') {
        (async () => {
          try {
            let base64: string | undefined;
            let mimeType = 'image/jpeg';
            
            if (message.srcUrl && message.srcUrl.startsWith('blob:')) {
              const res = await fetch(message.srcUrl);
              const blob = await res.blob();
              mimeType = blob.type;
              const reader = new FileReader();
              base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => {
                  const result = reader.result as string;
                  resolve(result.split(',')[1]);
                };
                reader.readAsDataURL(blob);
              });
            } else if (lastTarget) {
              let imgEl: any = lastTarget;
              if (!(imgEl instanceof HTMLImageElement || imgEl instanceof HTMLCanvasElement)) {
                const childImg = imgEl.querySelector('img, canvas');
                if (childImg) imgEl = childImg;
              }

              if (imgEl instanceof HTMLImageElement) {
                // To avoid tainted canvas, if it's a cross-origin image that we're falling back to,
                // we should set crossOrigin but since it's already loaded we might not be able to.
                // However, since background.ts will handle standard URLs, this path is mostly for
                // local/blob or same-origin images missing srcUrl.
                const canvas = document.createElement('canvas');
                canvas.width = imgEl.naturalWidth || imgEl.width || 300;
                canvas.height = imgEl.naturalHeight || imgEl.height || 300;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(imgEl, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                base64 = dataUrl.split(',')[1];
              } else if (imgEl instanceof HTMLCanvasElement) {
                const dataUrl = imgEl.toDataURL('image/jpeg');
                base64 = dataUrl.split(',')[1];
              } else {
                const style = window.getComputedStyle(imgEl);
                const bgImage = style.backgroundImage;
                if (bgImage && bgImage !== 'none') {
                  const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                  if (urlMatch && urlMatch[1]) {
                    const bgUrl = urlMatch[1];
                    if (bgUrl.startsWith('blob:')) {
                       const res = await fetch(bgUrl);
                       const blob = await res.blob();
                       mimeType = blob.type;
                       const reader = new FileReader();
                       base64 = await new Promise<string>((resolve) => {
                         reader.onloadend = () => {
                           const result = reader.result as string;
                           resolve(result.split(',')[1]);
                         };
                         reader.readAsDataURL(blob);
                       });
                    } else {
                      throw new Error('Cross-origin background image cannot be easily extracted.');
                    }
                  }
                } else {
                  throw new Error('No image found at the clicked location.');
                }
              }
            }
            
            if (base64) {
              sendResponse({ success: true, base64, mimeType });
            } else {
              sendResponse({ success: false, error: 'Extraction failed' });
            }
          } catch (err: any) {
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      } else if (message.type === 'CALL_CHROME_AI') {
        (async () => {
          try {
            const aiObj = (window as any).ai?.languageModel || (window as any).LanguageModel;
            if (!aiObj) {
              throw new Error('Chrome built-in AI model is not available.');
            }
            
            const res = await fetch(`data:${message.mimeType};base64,${message.imageBase64}`);
            const blob = await res.blob();
            const imageBitmap = await createImageBitmap(blob);

            const session = await aiObj.create({
              expectedInputs: [{ type: 'image' }]
            });
            
            // Try both new and old prompt formats
            let result;
            try {
              result = await session.prompt([
                {
                  role: 'user',
                  content: [
                    { type: 'text', value: message.prompt },
                    { type: 'image', value: imageBitmap }
                  ]
                }
              ]);
            } catch (fallbackErr) {
              console.warn('Fallback to old prompt format', fallbackErr);
              result = await session.prompt([
                message.prompt,
                { type: 'image', content: imageBitmap }
              ]);
            }
            
            sendResponse({ success: true, text: result });
          } catch (err: any) {
            console.error('Chrome AI Error:', err);
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      }
    });

    // WXT's Shadow Root API automatically handles CSS injection and isolation
    const ui = await createShadowRootUi(ctx, {
      name: 'alt-text-overlay-root',
      position: 'inline',
      zIndex: 2147483647,
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        console.log('Alty: Mounting React root...');
        const root = createRoot(container);
        root.render(<ContentApp />);
        return root;
      },
      onRemove: (root) => {
        console.log('Alty: Unmounting React root...');
        root?.unmount();
      },
    });
    
    ui.mount();
    console.log('Alty: UI mounted successfully.');
  },
});
