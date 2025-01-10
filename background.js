// background.js
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function analyzeCode(code, language) {
  try {
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    
    if (!geminiApiKey) {
      throw new Error('API key not found. Please set it in the extension options.');
    }

    const prompt = `
      Analyze the following ${language} code and provide:
      1. The time complexity (Big O notation)
      2. A brief explanation of why
      3. Any potential optimizations
      
      Code:
      ${code}
      
      Return the response in JSON format with the following structure:
      {
        "timeComplexity": "O(?)",
        "explanation": "string",
        "optimizations": ["string"]
      }
    `;

    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing code:', error);
    throw error;
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCode') {
    analyzeCode(request.code, request.language)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
});