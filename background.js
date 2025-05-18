// background.js
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

async function callGeminiApi(apiKey, model, prompt) {
  const endpoint = `${GEMINI_API_BASE_URL}${model}:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        // Add generationConfig for more control if needed
        // generationConfig: {
        //   temperature: 0.7,
        //   topK: 1,
        //   topP: 1,
        //   maxOutputTokens: 2048,
        // },
        // Add safetySettings if strict filtering is desired
        // safetySettings: [
        //   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        //   // ... other categories
        // ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error Response:', data);
      const errorDetail = data.error ? data.error.message : `HTTP error ${response.status}`;
      throw new Error(`API request failed: ${errorDetail}`);
    }
    
    // Check for blocked prompts or empty candidates
    if (data.promptFeedback && data.promptFeedback.blockReason) {
        console.warn('Prompt blocked by API:', data.promptFeedback);
        throw new Error(`Analysis blocked: ${data.promptFeedback.blockReason.reason}. This might be due to safety filters or other restrictions.`);
    }
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        console.warn('No valid candidates in API response:', data);
        throw new Error('AI returned no valid analysis. The response might be empty or malformed.');
    }

    return data;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error; // Re-throw to be caught by the caller
  }
}


async function analyzeCodeWithGemini(code, language, problemTitle) {
  const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
  if (!geminiApiKey) {
    throw new Error('API key not found. Please set it in the extension options.');
  }

  // Using gemini-1.5-flash-latest as it's fast and capable for this task
  const model = 'gemini-1.5-flash-latest'; 

  const prompt = `
    You are an expert code analyst specializing in LeetCode problems.
    Analyze the following ${language} code solution for the LeetCode problem titled "${problemTitle}".

    Code:
    \`\`\`${language}
    ${code}
    \`\`\`

    Provide your analysis STRICTLY in the following JSON format, without any markdown formatting around the JSON block itself:
    {
      "timeComplexity": "O(...)",
      "spaceComplexity": "O(...)",
      "explanation": "A concise explanation of why the time and space complexities are what they are, relating it to the provided code structure (e.g., loops, data structures used). Be specific to the given code.",
      "optimizations": [
        "Suggestion 1 for optimization (if any, otherwise an empty array or a message like 'The solution is already quite optimal.')",
        "Suggestion 2 for optimization (if any)"
      ]
    }

    Details for each field:
    - timeComplexity: The Big O time complexity (e.g., O(N), O(N log N), O(1)).
    - spaceComplexity: The Big O space complexity (e.g., O(N), O(1)). Consider auxiliary space.
    - explanation: Explain the complexities in 2-4 sentences.
    - optimizations: List 1-3 actionable suggestions for optimizing the code, if applicable. If the code is already well-optimized, state that.

    Ensure the JSON is valid. Do not include any text or markdown before or after the JSON object.
  `;

  return callGeminiApi(geminiApiKey, model, prompt);
}

async function testApiKey(apiKey) {
    // Using a simple, low-cost model for testing, e.g., listing models or a very simple generation
    const model = 'gemini-1.5-flash-latest'; // or any available model
    const testPrompt = "Hello! Output a single word: 'Test'."; // A very simple prompt
    try {
        await callGeminiApi(apiKey, model, testPrompt);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCode') {
    analyzeCodeWithGemini(request.code, request.language, request.problemTitle)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
  
  if (request.action === 'testApiKey') {
    if (!request.apiKey) {
      sendResponse({ success: false, error: 'API key not provided for test.' });
      return false;
    }
    testApiKey(request.apiKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
});