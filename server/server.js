import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Increase limit to accommodate base64 image strings
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate-alt-text', async (req, res) => {
  try {
    let { imageBase64, mimeType, prompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Rasterize SVG files to PNG using Sharp before sending to Gemini
    if (mimeType && mimeType.includes('svg')) {
      console.log('SVG detected. Rasterizing to PNG with sharp...');
      const svgBuffer = Buffer.from(imageBase64, 'base64');
      const pngBuffer = await sharp(svgBuffer).png().toBuffer();
      imageBase64 = pngBuffer.toString('base64');
      mimeType = 'image/png';
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const finalPrompt = prompt && prompt.trim() !== '' 
      ? prompt 
      : 'Generate concise, descriptive alt text for this image suitable for web accessibility. Just return the text.';
    const imageParts = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ];

    const result = await model.generateContent([finalPrompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    res.json({ altText: text.trim() });
  } catch (error) {
    console.error('Error generating alt text:', error);
    res.status(500).json({ error: 'Failed to generate alt text', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Alt text server listening on port ${port}`);
});
