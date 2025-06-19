const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

async function callGeminiApi(apiKey, model, prompt, isJsonOutput = false) {
  const endpoint = `${GEMINI_API_BASE_URL}${model}:generateContent?key=${apiKey}`;
  
  const generationConfig = {
    temperature: 0.3,
    topK: 1,
    topP: 1,
    maxOutputTokens: 8192, // Max for gemini-1.5-flash, adjust if needed for 2.5
  };

  if (isJsonOutput) {
    generationConfig.response_mime_type = "application/json";
  }

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
        generationConfig: generationConfig
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error Response:', data);
      const errorDetail = data.error ? data.error.message : `HTTP error ${response.status}`;
      throw new Error(`API request failed: ${errorDetail}`);
    }
    
    if (data.promptFeedback && data.promptFeedback.blockReason) {
        console.warn('Prompt blocked by API:', data.promptFeedback);
        throw new Error(`Analysis blocked: ${data.promptFeedback.blockReason}. This might be due to safety filters or other restrictions.`);
    }
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        console.warn('No valid candidates in API response:', data);
        throw new Error('AI returned no valid analysis. The response might be empty or malformed.');
    }
    if (!data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0 || !data.candidates[0].content.parts[0].text) {
        console.warn('No text part in candidate:', data.candidates[0].content);
        if (isJsonOutput && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].executableCode) {
           // This case might happen if the model directly outputs code for JSON
           // but the SDK usually puts it in 'text' when mime type is application/json
           // For now, assume 'text' is the primary field.
           throw new Error('AI returned no text in its response, expected JSON.');
        } else if (!isJsonOutput) {
           throw new Error('AI returned no text in its response.');
        }
        // If isJsonOutput, we let it proceed to the caller who expects to parse `text`
        // The popup.js will handle parsing errors.
    }


    return data;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

async function analyzeCodeWithGemini(code, language, problemTitle) {
  const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
  if (!geminiApiKey) {
    throw new Error('API key not found. Please set it in the extension options.');
  }

  const model = 'gemini-1.5-flash-latest'; // Using latest flash, generally more stable for JSON.
                                           // If 'gemini-2.5-flash-preview-05-20' is critical, you can revert
                                           // but ensure it robustly supports response_mime_type.
                                           // MaxOutputTokens for 1.5-flash is 8192 by default.

  const prompt = `
    You are a world-class DSA expert and coding interview mentor with 10+ years of experience helping students master algorithms and data structures through LeetCode practice.

    Analyze the following ${language} code solution for the LeetCode problem titled "${problemTitle}".

    Code:
    \`\`\`${language}
    ${code}
    \`\`\`

    Provide your analysis STRICTLY in the following JSON format.
    The JSON object should conform to this schema:
    {
      "type": "object",
      "properties": {
        "timeComplexity": { "type": "string", "description": "e.g., O(n)" },
        "spaceComplexity": { "type": "string", "description": "e.g., O(1)" },
        "detailedComplexityAnalysis": { "type": "string" },
        "approachExplanation": { "type": "string" },
        "codeWalkthrough": { "type": "string" },
        "patternRecognition": { "type": "string", "description": "e.g., Two Pointers, Sliding Window" },
        "keyInsights": { "type": "array", "items": { "type": "string" } },
        "commonMistakes": { "type": "array", "items": { "type": "string" } },
        "optimizations": { "type": "array", "items": { "type": "string" } },
        "relatedProblems": { "type": "array", "items": { "type": "string" } },
        "interviewTips": { "type": "array", "items": { "type": "string" } },
        "practiceAdvice": { "type": "string" },
        "edgeCases": { "type": "array", "items": { "type": "string" } },
        "alternativeApproaches": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "approach": { "type": "string" },
              "timeComplexity": { "type": "string" },
              "spaceComplexity": { "type": "string" },
              "description": { "type": "string" }
            },
            "required": ["approach", "timeComplexity", "spaceComplexity", "description"]
          }
        }
      },
      "required": [
        "timeComplexity", "spaceComplexity", "detailedComplexityAnalysis", "approachExplanation", 
        "codeWalkthrough", "patternRecognition", "keyInsights", "commonMistakes", "optimizations", 
        "relatedProblems", "interviewTips", "practiceAdvice", "edgeCases", "alternativeApproaches"
      ]
    }

    Guidelines for each field:
    - timeComplexity & spaceComplexity: Be precise with Big O notation
    - detailedComplexityAnalysis: Break down the analysis step by step, like teaching a student
    - approachExplanation: Explain the "why" behind the solution approach
    - codeWalkthrough: Help students understand what each critical section does
    - patternRecognition: Help students recognize reusable patterns
    - keyInsights: Share the "aha!" moments that make the problem click
    - commonMistakes: Prevent common pitfalls that waste time in interviews
    - optimizations: Only suggest realistic improvements with clear benefits
    - relatedProblems: Help students see connections and practice similar problems
    - interviewTips: Practical advice for coding interviews
    - practiceAdvice: How to build mastery in this problem type
    - edgeCases: Important test cases students should always consider
    - alternativeApproaches: Show different ways to solve the same problem and prioritise if there are more optimal and better ways then list them. If none, provide an empty array.

    Focus on being educational, encouraging, and practical. Help the student not just understand this solution, but become better at solving similar problems independently.

    Ensure the output is ONLY the JSON object, without any surrounding text or markdown.
  `;

  return callGeminiApi(geminiApiKey, model, prompt, true); // Pass true for isJsonOutput
}

async function testApiKey(apiKey) {
    const model = 'gemini-1.5-flash-latest';
    const testPrompt = "Hello! Output a single word: 'Test'.";
    try {
        await callGeminiApi(apiKey, model, testPrompt, false); // false for isJsonOutput
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
    return true; 
  }
  
  if (request.action === 'testApiKey') {
    if (!request.apiKey) {
      sendResponse({ success: false, error: 'API key not provided for test.' });
      return false;
    }
    testApiKey(request.apiKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; 
  }
});