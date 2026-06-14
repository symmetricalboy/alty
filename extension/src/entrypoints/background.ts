import { defineBackground } from 'wxt/sandbox';

async function convertBlobToJpegBase64(blob: Blob): Promise<{ base64: string, mimeType: string }> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  
  // Fill white background in case of transparency
  ctx!.fillStyle = '#ffffff';
  ctx!.fillRect(0, 0, canvas.width, canvas.height);
  ctx!.drawImage(bitmap, 0, 0);
  
  const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(jpegBlob);
    });
  } else {
    // Fallback if FileReader isn't available
    const arrayBuffer = await jpegBlob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return { base64: btoa(binary), mimeType: 'image/jpeg' };
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function callOllama(model: string, prompt: string, base64Image: string) {
  const payload = {
    model: model,
    messages: [
      {
        role: "user",
        content: prompt,
        images: [base64Image]
      }
    ],
    stream: false
  };
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let errText = await response.text();
      if (response.status === 403) {
        throw new Error("Ollama blocked the request (403). Run this in PowerShell to fix: $env:OLLAMA_ORIGINS='chrome-extension://*'; ollama serve");
      }
      throw new Error(`Ollama Error (${response.status}): ${errText}`);
    }
    const data = await response.json();
    return data.message.content;
  } catch (err: any) {
    if (err.message.includes('Failed to fetch')) {
      throw new Error("Could not connect to Ollama. Ensure Ollama is running on localhost:11434.");
    }
    throw err;
  }
}

async function callGoogle(model: string, apiKey: string, prompt: string, base64Image: string, mimeType: string) {
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ]
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errText = await response.text();
    try {
      const json = JSON.parse(errText);
      if (json.error && json.error.message) errText = json.error.message;
    } catch(e) {}
    throw new Error(`Google API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Invalid response format from Google API.");
}

async function callAnthropic(model: string, apiKey: string, prompt: string, base64Image: string, mimeType: string) {
  const payload = {
    model: model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Image
            }
          },
          {
            type: "text",
            text: prompt
          }
        ]
      }
    ]
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerously-allow-browser": "true"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errText = await response.text();
    try {
      const json = JSON.parse(errText);
      if (json.error && json.error.message) errText = json.error.message;
    } catch(e) {}
    throw new Error(`Anthropic API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.content && data.content.length > 0) {
    return data.content[0].text;
  }
  throw new Error("Invalid response format from Anthropic API.");
}

async function callOpenAICompatible(baseUrl: string, model: string, apiKey: string, prompt: string, base64Image: string, mimeType: string, isOpenRouter: boolean = false) {
  const payload: any = {
    model: model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ]
      }
    ]
  };

  const headers: any = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  if (isOpenRouter) {
    headers["HTTP-Referer"] = "https://github.com/symmetricalboy/alty";
    headers["X-Title"] = "Alty Extension";
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errText = await response.text();
    try {
       const json = JSON.parse(errText);
       if (json.error && json.error.message) errText = json.error.message;
    } catch(e) {}
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  throw new Error("Invalid response format from API.");
}

async function callBYOK(provider: string, model: string, apiKey: string, prompt: string, base64Image: string, mimeType: string) {
  if (!apiKey) throw new Error("API Key is missing for BYOK mode.");
  if (!model) throw new Error("Model name is missing for BYOK mode.");

  // Strip provider prefix for native APIs (e.g. "openai/gpt-4o" -> "gpt-4o")
  let nativeModel = model;
  if (provider !== 'openrouter' && nativeModel.includes('/')) {
    nativeModel = nativeModel.substring(nativeModel.indexOf('/') + 1);
  }

  const PROVIDER_ENDPOINTS: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    xai: "https://api.x.ai/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    alibaba: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
    moonshot: "https://api.moonshot.cn/v1/chat/completions",
    minimax: "https://api.minimax.chat/v1/chat/completions",
    meta: "https://api.meta.ai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions"
  };

  if (provider === 'google') {
    return await callGoogle(nativeModel, apiKey, prompt, base64Image, mimeType);
  } else if (provider === 'anthropic') {
    return await callAnthropic(nativeModel, apiKey, prompt, base64Image, mimeType);
  } else if (PROVIDER_ENDPOINTS[provider]) {
    return await callOpenAICompatible(
      PROVIDER_ENDPOINTS[provider], 
      nativeModel, 
      apiKey, 
      prompt, 
      base64Image, 
      mimeType, 
      provider === 'openrouter'
    );
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

export default defineBackground(() => {
  console.log('Background script initialized');

  browser.runtime.onInstalled.addListener(() => {
    console.log('Installing context menu...');
    browser.contextMenus.create({
      id: 'generate-alt-text',
      title: 'Generate alt text with Alty',
      contexts: ['image'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('Context menu clicked!', info.menuItemId, 'srcUrl:', info.srcUrl, 'tabId:', tab?.id);
    
    if (info.menuItemId === 'generate-alt-text' && tab?.id) {
      console.log('Sending ALT_TEXT_LOADING to tab', tab.id);
      browser.tabs.sendMessage(tab.id, {
        type: 'ALT_TEXT_LOADING',
        srcUrl: info.srcUrl,
      }).catch(err => console.error('Failed to send LOADING message', err));

      try {
        let imageBase64: string;
        let mimeType: string;
        let blob: Blob;

        if (!info.srcUrl || info.srcUrl.startsWith('blob:')) {
          console.log('Requesting image data from content script...');
          const response: any = await browser.tabs.sendMessage(tab.id, {
            type: 'EXTRACT_IMAGE_DATA',
            srcUrl: info.srcUrl,
          });

          if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to extract image data from page');
          }
          
          imageBase64 = response.base64;
          mimeType = response.mimeType || 'image/jpeg';
          blob = base64ToBlob(imageBase64, mimeType);
          
          // Force convert to JPEG Base64 regardless of format
          const converted = await convertBlobToJpegBase64(blob);
          imageBase64 = converted.base64;
          mimeType = converted.mimeType;
        } else {
          console.log('Fetching image from', info.srcUrl);
          const response = await fetch(info.srcUrl);
          blob = await response.blob();
          
          console.log('Converting image to base64 JPEG...');
          const converted = await convertBlobToJpegBase64(blob);
          imageBase64 = converted.base64;
          mimeType = converted.mimeType;
        }

        console.log('Fetching settings from storage...');
        const storageResult = await browser.storage.sync.get([
          'systemPrompt', 'modelType', 'byokProvider', 'byokKey', 'byokModel', 'ollamaModel', 'useLocalAI'
        ]);
        
        const systemPrompt = storageResult.systemPrompt || 'Generate concise, descriptive alt text for this image suitable for web accessibility. Just return the text.';
        const modelType = storageResult.modelType || (storageResult.useLocalAI ? 'chrome' : 'default');

        let altText = '';

        if (modelType === 'chrome') {
          console.log('Using Local Chrome Built-in AI...');
          
          const response: any = await browser.tabs.sendMessage(tab.id, {
            type: 'CALL_CHROME_AI',
            prompt: systemPrompt,
            imageBase64: imageBase64,
            mimeType: mimeType
          });

          if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to call Chrome Built-in AI from page.');
          }
          
          altText = response.text;
        } else if (modelType === 'ollama') {
          console.log('Using Ollama Local AI...');
          const modelName = storageResult.ollamaModel || 'minicpm-v';
          altText = await callOllama(modelName, systemPrompt, imageBase64);
        } else if (modelType === 'byok') {
          console.log(`Using BYOK (${storageResult.byokProvider})...`);
          altText = await callBYOK(
            storageResult.byokProvider || 'openrouter',
            storageResult.byokModel,
            storageResult.byokKey,
            systemPrompt,
            imageBase64,
            mimeType
          );
        } else {
          // default
          const serverUrl = 'https://alty.up.railway.app/api/generate-alt-text';
          console.log('Sending to server...', serverUrl);
          
          const payload: any = {
            imageBase64,
            mimeType: mimeType,
            prompt: systemPrompt
          };
          
          const apiResponse = await fetch(serverUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!apiResponse.ok) {
            let errText = await apiResponse.text();
            throw new Error(`Server returned status ${apiResponse.status}: ${errText}`);
          }

          const data = await apiResponse.json();
          altText = data.altText;
        }

        console.log('Generated alt text:', altText);

        browser.tabs.sendMessage(tab.id, {
          type: 'ALT_TEXT_SUCCESS',
          srcUrl: info.srcUrl,
          altText: altText,
        }).catch(err => console.error('Failed to send SUCCESS', err));

      } catch (error) {
        console.error('Failed to generate alt text', error);
        browser.tabs.sendMessage(tab.id, {
          type: 'ALT_TEXT_ERROR',
          srcUrl: info.srcUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
        }).catch(err => console.error('Failed to send ERROR', err));
      }
    }
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'OPEN_SETTINGS') {
      browser.runtime.openOptionsPage().catch(console.error);
    }
  });
});
