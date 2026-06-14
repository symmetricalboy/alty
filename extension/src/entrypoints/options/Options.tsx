import React, { useState, useEffect } from 'react';
import './Options.css';

const DEFAULT_PROMPT = "Generate concise, descriptive alt text for this image suitable for web accessibility. Just return the text.";

type ModelType = 'default' | 'byok' | 'ollama' | 'chrome';

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', prefix: '' },
  { id: 'google', name: 'Google', prefix: 'google/' },
  { id: 'openai', name: 'OpenAI', prefix: 'openai/' },
  { id: 'anthropic', name: 'Anthropic', prefix: 'anthropic/' },
  { id: 'xai', name: 'xAI', prefix: 'x-ai/' },
  { id: 'meta', name: 'Meta', prefix: 'meta-llama/' },
  { id: 'mistral', name: 'Mistral', prefix: 'mistral/' },
  { id: 'alibaba', name: 'Alibaba', prefix: 'qwen/' },
  { id: 'nvidia', name: 'Nvidia', prefix: 'nvidia/' },
  { id: 'moonshot', name: 'Moonshot', prefix: 'moonshot/' },
  { id: 'minimax', name: 'MiniMax', prefix: 'minimax/' }
];

const Options: React.FC = () => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [modelType, setModelType] = useState<ModelType>('default');
  const [byokProvider, setByokProvider] = useState('openrouter');
  const [byokKey, setByokKey] = useState('');
  const [byokModel, setByokModel] = useState('');
  const [ollamaModel, setOllamaModel] = useState('minicpm-v');
  const [showOllamaSetup, setShowOllamaSetup] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    browser.storage.sync.get([
      'systemPrompt', 'modelType', 'byokProvider', 'byokKey', 'byokModel', 'ollamaModel', 'useLocalAI'
    ]).then((result) => {
      if (result.systemPrompt) setPrompt(result.systemPrompt);
      if (result.modelType) {
        setModelType(result.modelType as ModelType);
      } else if (result.useLocalAI) {
        setModelType('chrome');
      }
      if (result.byokProvider) setByokProvider(result.byokProvider);
      if (result.byokKey) setByokKey(result.byokKey);
      if (result.byokModel) setByokModel(result.byokModel);
      if (result.ollamaModel) setOllamaModel(result.ollamaModel);
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    try {
      await browser.storage.sync.set({ 
        systemPrompt: prompt, 
        modelType,
        byokProvider,
        byokKey,
        byokModel,
        ollamaModel,
        useLocalAI: modelType === 'chrome'
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProviderId = e.target.value;
    setByokProvider(newProviderId);
    
    const provider = PROVIDERS.find(p => p.id === newProviderId);
    if (provider && provider.prefix) {
      if (!byokModel || !byokModel.includes('/')) {
        setByokModel(provider.prefix);
      } else {
        const parts = byokModel.split('/');
        parts[0] = provider.prefix.replace('/', '');
        setByokModel(parts.join('/'));
      }
    }
  };

  return (
    <div className="options-container">
      <div className="options-header">
        <div className="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
        <div>
          <h1>Alty Settings</h1>
        </div>
      </div>

      <div className="options-content">
        <section className="settings-section">
          <h2>Model Provider</h2>
          <p className="section-description">Select the AI engine you want to use to analyze your images and generate alt text.</p>

          <div className={`model-card ${modelType === 'default' ? 'active' : ''}`} onClick={() => setModelType('default')}>
            <div className="model-card-header">
              <input type="radio" checked={modelType === 'default'} onChange={() => setModelType('default')} />
              <div className="model-card-title">Default - gemini-3.5-flash</div>
            </div>
            <div className="model-card-body">
              A fast, high-quality Gemini server provided by the Alty developer for free. Your data is strictly private: it is never logged, stored, or used to train AI models.
            </div>
          </div>

          <div className={`model-card ${modelType === 'byok' ? 'active' : ''}`} onClick={() => setModelType('byok')}>
            <div className="model-card-header">
              <input type="radio" checked={modelType === 'byok'} onChange={() => setModelType('byok')} />
              <div className="model-card-title">Bring Your Own Key (BYOK)</div>
            </div>
            <div className="model-card-body">
              Connect to your own premium cloud provider. Your API key and image data are sent directly from your browser to the provider, ensuring maximum privacy.
              {modelType === 'byok' && (
                <div className="model-settings-subform">
                  <div className="input-group">
                    <label>Provider</label>
                    <select value={byokProvider} onChange={handleProviderChange}>
                      {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>API Key</label>
                    <input type="password" placeholder="Enter your API Key" value={byokKey} onChange={e => setByokKey(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Exact Model Name</label>
                    <input type="text" placeholder="e.g. google/gemini-1.5-pro" value={byokModel} onChange={e => setByokModel(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`model-card ${modelType === 'ollama' ? 'active' : ''}`} onClick={() => setModelType('ollama')}>
            <div className="model-card-header">
              <input type="radio" checked={modelType === 'ollama'} onChange={() => setModelType('ollama')} />
              <div className="model-card-title">Local Model (Ollama)</div>
            </div>
            <div className="model-card-body">
              Run open-source models completely offline on your own machine using Ollama. Maximum privacy with zero cloud processing.
              {modelType === 'ollama' && (
                <div className="model-settings-subform">
                  <div className="input-group">
                    <label>Exact Model Name</label>
                    <input type="text" placeholder="e.g. minicpm-v" value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} />
                    <small className="helper-text">We recommend minicpm-v for excellent vision capabilities.</small>
                  </div>
                  
                  <button 
                    className="setup-toggle-btn"
                    onClick={() => setShowOllamaSetup(!showOllamaSetup)}
                  >
                    {showOllamaSetup ? 'Hide setup instructions' : 'Required setup to use Ollama'}
                  </button>
                  
                  {showOllamaSetup && (
                    <div className="ollama-setup-instructions">
                      <p>Because Alty is a Chrome Extension, Ollama's default security blocks it from connecting. You must explicitly allow Chrome Extensions to access your local Ollama instance by following these one-time steps:</p>
                      
                      <h5>Windows:</h5>
                      <ul>
                        <li>Open PowerShell</li>
                        <li>Run: <code>[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "chrome-extension://*", "User")</code></li>
                        <li>Close Ollama from the taskbar system tray completely & then restart it for the changes to take effect.</li>
                      </ul>

                      <h5>Linux:</h5>
                      <ul>
                        <li>Open a terminal</li>
                        <li>Run: <code>sudo systemctl edit ollama.service</code></li>
                        <li>Add these exact lines at the top of the file, right below the commented-out stuff:<br/>
                        <pre>[Service]{'\n'}Environment="OLLAMA_ORIGINS=chrome-extension://*"</pre>
                        </li>
                        <li>Save the file and exit. Then, reload the daemon configs and restart the Ollama service by running:<br/>
                        <code>sudo systemctl daemon-reload</code><br/>
                        <code>sudo systemctl restart ollama</code>
                        </li>
                      </ul>

                      <h5>macOS:</h5>
                      <ul>
                        <li>Run: <code>echo 'launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"' &gt;&gt; ~/.zprofile</code></li>
                        <li>Close Ollama completely & reopen it.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`model-card ${modelType === 'chrome' ? 'active' : ''}`} onClick={() => setModelType('chrome')}>
            <div className="model-card-header">
              <input type="radio" checked={modelType === 'chrome'} onChange={() => setModelType('chrome')} />
              <div className="model-card-title">Chrome Built-in AI</div>
            </div>
            <div className="model-card-body">
              Experimental: Use Google Chrome's built-in, local AI model. This runs entirely on-device but is currently only available on specific Chrome versions.
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>System Prompt</h2>
          <p className="section-description">This is the underlying instruction given to the AI. It tells the model exactly how it should analyze images and what kind of text it should output. You can customize this to fit your exact needs!</p>
          
          <div className="setting-group">
            <div className="prompt-header">
              <label htmlFor="prompt">Prompt Text</label>
              <button className="secondary-btn" onClick={() => setPrompt(DEFAULT_PROMPT)}>Restore Default</button>
            </div>
            <textarea 
              id="prompt" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the instruction prompt..."
              rows={5}
            />
          </div>
        </section>
        
        <div className="actions-footer">
          <button className="primary-btn" onClick={handleSave}>
            {isSaved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Options;
