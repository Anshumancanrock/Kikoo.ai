#!/usr/bin/env node
// Quick script to test model generation using query param API key
// Usage: node scripts/test-generate.js --model=gemini-2.5-pro --key=YOUR_KEY

try { require('dotenv').config(); } catch {}

const argv = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
const apiKey = argv.key || process.env.GEMINI_API_KEY;
const model = argv.model || process.env.AI_MODEL || 'gemini-2.5-pro';

if (!apiKey) {
  console.error('Missing API key. Pass --key= or set GEMINI_API_KEY in .env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

(async () => {
  try {
    const prompt = 'Refine: "I love coding" into a professional short tweet.';
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 60 }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    try {
      console.log('Response JSON:', JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log('Response body:', text);
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(2);
  }
})();