#!/usr/bin/env node
// Simple script to list available models for Google Generative Language API
// Usage:
//  - Create a .env file with GEMINI_API_KEY=<your_key> and run: npm run list-models
//  - Or pass the key directly: node scripts/list-models.js --key=YOUR_KEY

// Try to load .env automatically if dotenv is installed
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed; continue and rely on process.env
}

const apiKeyArg = process.argv.find(a => a.startsWith('--key='));
const apiKey = (apiKeyArg && apiKeyArg.split('=')[1]) || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Missing GEMINI_API_KEY. Set it in .env or pass via --key=YOUR_KEY');
  console.error('Example (PowerShell): $env:GEMINI_API_KEY="YOUR_KEY"; node scripts/list-models.js');
  process.exit(1);
}

const url = 'https://generativelanguage.googleapis.com/v1beta/models';

async function tryWithBearer(key) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });
  const body = await res.text();
  return { res, body };
}

async function tryWithApiKeyQuery(key) {
  const res = await fetch(url + `?key=${key}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const body = await res.text();
  return { res, body };
}

(async () => {
  try {
    // First try using the key as a Bearer token (OAuth access token)
    let attempt = await tryWithBearer(apiKey);

    console.log('Status:', attempt.res.status, attempt.res.statusText);
    try {
      console.log('Response JSON:', JSON.stringify(JSON.parse(attempt.body), null, 2));
    } catch (e) {
      console.log('Response body:', attempt.body);
    }

    // If server indicates the access token type is unsupported, try the API key query param
    if (attempt.res.status === 401 && attempt.body && attempt.body.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
      console.log('\nBearer auth failed due to unsupported token type. Retrying using ?key=<API_KEY> query param...');
      attempt = await tryWithApiKeyQuery(apiKey);
      console.log('Status (query param):', attempt.res.status, attempt.res.statusText);
      try {
        console.log('Response JSON (query param):', JSON.stringify(JSON.parse(attempt.body), null, 2));
      } catch (e) {
        console.log('Response body (query param):', attempt.body);
      }

      if (attempt.res.status === 200) return;
    }

    // If we reach here and status is 401 or 403, give actionable guidance
    if (attempt.res.status === 401 || attempt.res.status === 403) {
      console.error('\nAuthentication failed. The Generative Language API may require an OAuth 2 access token or a service account credential, not a simple API key.');
      console.error('Quick fix (local, short-lived): Run: `gcloud auth application-default print-access-token` and then run the script with `--key=$(gcloud auth application-default print-access-token)`');
      console.error('Recommended: create a service account with the Generative AI API enabled and set `GOOGLE_APPLICATION_CREDENTIALS` to its JSON file path.');
      process.exit(3);
    }

  } catch (err) {
    console.error('Request failed:', err);
    process.exit(2);
  }
})();