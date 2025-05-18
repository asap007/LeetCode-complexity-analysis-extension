document.addEventListener('DOMContentLoaded', async () => {
  // Views
  const initialView = document.getElementById('initialView');
  const loadingView = document.getElementById('loadingView');
  const analysisView = document.getElementById('analysisView');

  // Initial View Elements
  const apiKeyMissingDiv = document.getElementById('apiKeyMissing');
  const mainContentDiv = document.getElementById('mainContent');
  const setupButton = document.getElementById('setupButton');
  const analyzeButton = document.getElementById('analyzeButton');
  const analysisStatusDiv = document.getElementById('analysisStatus');
  const problemTitleDisplay = document.getElementById('problemTitleDisplay');


  // Analysis View Elements
  const backButton = document.getElementById('backButton');
  const analysisProblemTitle = document.getElementById('analysisProblemTitle');
  const timeComplexityContainer = document.getElementById('timeComplexityContainer');
  const spaceComplexityContainer = document.getElementById('spaceComplexityContainer');
  const explanationContainer = document.getElementById('explanationContainer');
  const complexityGraphContainer = document.getElementById('complexityGraphContainer');
  const optimizationsList = document.getElementById('optimizationsList');

  // State
  let currentProblemTitle = "Current LeetCode Problem";
  let currentProblemUrl = "";

  const complexityColors = {
    // Best to Worst (Green to Red spectrum)
    'O(1)': ['#16a34a', '#dcfce7'],       // Green
    'O(log n)': ['#2563eb', '#dbeafe'],   // Blue
    'O(n)': ['#ca8a04', '#fef9c3'],       // Yellow
    'O(n log n)': ['#ea580c', '#ffedd5'],// Orange
    'O(n²)': ['#dc2626', '#fee2e2'],      // Red
    'O(n³)': ['#be123c', '#ffe4e6'],      // Darker Red
    'O(2ⁿ)': ['#86198f', '#fae8ff'],      // Purple
    'O(n!)': ['#581c87', '#f3e8ff'],      // Darker Purple
    'default': ['#4b5563', '#f3f4f6']     // Gray for unknown/others
  };

  const getComplexityStyles = (complexity) => {
    const normalizedComplexity = complexity ? complexity.toLowerCase().replace(/\s+/g, '') : 'default';
    for (const key in complexityColors) {
        if (normalizedComplexity.includes(key.toLowerCase().replace('o(','').replace(')',''))) { // Match "n" in "O(n)"
            return complexityColors[key];
        }
    }
    return complexityColors[normalizedComplexity] || complexityColors['default'];
  };


  // View management
  const showView = (view) => {
    initialView.classList.add('hidden');
    loadingView.classList.add('hidden');
    analysisView.classList.add('hidden');
    view.classList.remove('hidden');
  };

  // Utility: Copy to Clipboard
  const copyToClipboard = (text, buttonElement) => {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = 'Copied!';
      buttonElement.classList.add('copied');
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove('copied');
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      // Fallback or error message if needed
    });
  };

  // Setup copy buttons
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', () => {
      let textToCopy = "";
      const targetId = button.dataset.clipboardTarget;
      if (targetId === "explanationContainer") {
        textToCopy = explanationContainer.textContent;
      } else if (targetId === "optimizationsList") {
        textToCopy = Array.from(optimizationsList.querySelectorAll('.optimization-text'))
                          .map((el, i) => `${i + 1}. ${el.textContent}`)
                          .join('\n');
      } else if (targetId === "timeComplexity") {
        textToCopy = timeComplexityContainer.querySelector('.value').textContent;
      } else if (targetId === "spaceComplexity") {
        textToCopy = spaceComplexityContainer.querySelector('.value').textContent;
      }
      if (textToCopy) {
        copyToClipboard(textToCopy, button);
      }
    });
  });


  // Initial Setup: Check API Key and current tab
  const initialize = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('leetcode.com/problems/')) {
        currentProblemTitle = tab.title.replace(" - LeetCode", "") || "Current LeetCode Problem";
        currentProblemUrl = tab.url;
        problemTitleDisplay.textContent = currentProblemTitle;
        problemTitleDisplay.style.display = 'block';
        analyzeButton.disabled = false;
      } else {
        problemTitleDisplay.textContent = "Not on a LeetCode problem page.";
        problemTitleDisplay.style.display = 'block';
        analyzeButton.disabled = true;
        analysisStatusDiv.textContent = 'Please navigate to a LeetCode problem page to use the analyzer.';
        analysisStatusDiv.classList.remove('hidden');
        analysisStatusDiv.classList.remove('error-message'); // Use default info style
        analysisStatusDiv.classList.add('info-message');
      }

      const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
      if (!geminiApiKey) {
        apiKeyMissingDiv.classList.remove('hidden');
        mainContentDiv.classList.add('hidden');
      } else {
        apiKeyMissingDiv.classList.add('hidden');
        mainContentDiv.classList.remove('hidden');
         if (analyzeButton.disabled) { // If disabled due to not being on leetcode page, hide main button
            mainContentDiv.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error("Initialization error:", error);
      analysisStatusDiv.textContent = 'Error initializing extension.';
      analysisStatusDiv.classList.remove('hidden');
    }
    showView(initialView);
  };


  setupButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
  backButton.addEventListener('click', () => {
    analysisStatusDiv.classList.add('hidden'); // Hide any previous status
    initialize(); // Re-initialize to check current page and API key status
  });

  // Render analysis results
  const renderAnalysis = (analysis) => {
    analysisProblemTitle.textContent = currentProblemTitle;

    const timeStyles = getComplexityStyles(analysis.timeComplexity);
    timeComplexityContainer.innerHTML = `
      <span class="label">Time Complexity</span>
      <span class="value" style="color: ${timeStyles[0]};">${analysis.timeComplexity}</span>
      <button class="copy-button" data-clipboard-target="timeComplexity" style="margin-top: 8px;">Copy</button>
    `;
    timeComplexityContainer.style.backgroundColor = timeStyles[1];
    timeComplexityContainer.querySelector('.copy-button').addEventListener('click', (e) => {
        copyToClipboard(analysis.timeComplexity, e.target);
    });


    const spaceStyles = getComplexityStyles(analysis.spaceComplexity);
    spaceComplexityContainer.innerHTML = `
      <span class="label">Space Complexity</span>
      <span class="value" style="color: ${spaceStyles[0]};">${analysis.spaceComplexity}</span>
      <button class="copy-button" data-clipboard-target="spaceComplexity" style="margin-top: 8px;">Copy</button>
    `;
    spaceComplexityContainer.style.backgroundColor = spaceStyles[1];
    spaceComplexityContainer.querySelector('.copy-button').addEventListener('click', (e) => {
        copyToClipboard(analysis.spaceComplexity, e.target);
    });


    explanationContainer.textContent = analysis.explanation;

    complexityGraphContainer.innerHTML = ''; // Clear previous graph
    drawComplexityGraph(analysis.timeComplexity, complexityGraphContainer);

    optimizationsList.innerHTML = analysis.optimizations.length > 0
        ? analysis.optimizations.map((opt, i) => `
            <li class="optimization-item">
              <div class="optimization-number">${i + 1}</div>
              <p class="optimization-text">${opt}</p>
            </li>`).join('')
        : '<li>No specific optimizations suggested by the AI.</li>';
    
    showView(analysisView);
  };

  // Analyze button click handler
  analyzeButton.addEventListener('click', async () => {
    analysisStatusDiv.classList.add('hidden'); // Clear previous errors

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || !tab.url.includes('leetcode.com/problems/')) {
      analysisStatusDiv.textContent = 'Please navigate to a LeetCode problem page first.';
      analysisStatusDiv.classList.remove('hidden');
      return;
    }
    currentProblemTitle = tab.title.replace(" - LeetCode", "") || "Current LeetCode Problem";
    currentProblemUrl = tab.url;


    showView(loadingView);
    analyzeButton.disabled = true;

    try {
      const codeResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getCodeAndLanguage' });
      
      if (!codeResponse || !codeResponse.success) {
        throw new Error(codeResponse.error || 'Could not retrieve code from the page.');
      }

      const analysisResponse = await chrome.runtime.sendMessage({
        action: 'analyzeCode',
        code: codeResponse.code,
        language: codeResponse.language,
        problemTitle: currentProblemTitle // Send problem title for context
      });

      if (analysisResponse && analysisResponse.success && analysisResponse.data) {
        // Gemini response is expected in data.candidates[0].content.parts[0].text
        if (analysisResponse.data.candidates && analysisResponse.data.candidates[0] &&
            analysisResponse.data.candidates[0].content && analysisResponse.data.candidates[0].content.parts &&
            analysisResponse.data.candidates[0].content.parts[0] && analysisResponse.data.candidates[0].content.parts[0].text) {
            
            const rawText = analysisResponse.data.candidates[0].content.parts[0].text;
            // Remove markdown code block ```json ... ``` or ``` ... ```
            const jsonString = rawText.replace(/^```json\s*|```\s*$/g, '').trim();
            
            try {
                const analysisResult = JSON.parse(jsonString);
                renderAnalysis(analysisResult);
            } catch (parseError) {
                console.error('JSON Parsing Error:', parseError, "\nRaw string:", jsonString);
                throw new Error('Failed to parse analysis from AI. The response format might be unexpected.');
            }
        } else {
            console.error('Unexpected AI response structure:', analysisResponse.data);
            let errorMessage = 'Received an unexpected response structure from the AI.';
            if (analysisResponse.data.promptFeedback && analysisResponse.data.promptFeedback.blockReason) {
                errorMessage += ` Prompt blocked: ${analysisResponse.data.promptFeedback.blockReason.reason}.`;
                 if(analysisResponse.data.promptFeedback.blockReason.reason === "SAFETY") errorMessage += " This can happen due to safety filters on the AI."
            }
            throw new Error(errorMessage);
        }
      } else {
        throw new Error(analysisResponse.error || 'Analysis request failed.');
      }
    } catch (error) {
      console.error('Analysis Pipeline Error:', error);
      showView(initialView); // Go back to initial view on error
      analysisStatusDiv.textContent = `Error: ${error.message}`;
      analysisStatusDiv.classList.remove('hidden');
    } finally {
      analyzeButton.disabled = false;
    }
  });

  initialize(); // Call on load
});


function drawComplexityGraph(complexityString, containerElement) {
  // Normalize complexity string: "O(N log N)" -> "o(nlogn)"
  const normalizedComplexity = complexityString
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('^', ''); // O(n^2) -> o(n2)

  const canvas = document.createElement('canvas');
  canvas.width = 380; // Fixed width for consistency in popup
  canvas.height = 180;
  containerElement.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Style
  ctx.fillStyle = '#ffffff'; // Background of canvas
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const graphWidth = canvas.width - padding.left - padding.right;
  const graphHeight = canvas.height - padding.top - padding.bottom;

  // Data points (input size `n` from 1 to 100, for example)
  const nValues = Array.from({ length: 100 }, (_, i) => i + 1);
  let operations = [];

  const complexityFunctions = {
    'o(1)': (n) => 1,
    'o(logn)': (n) => Math.log2(n) || 0, // Ensure log(1) doesn't break
    'o(sqrtn)': (n) => Math.sqrt(n),
    'o(n)': (n) => n,
    'o(nlogn)': (n) => n * (Math.log2(n) || 0),
    'o(nsqrtn)': (n) => n * Math.sqrt(n),
    'o(n2)': (n) => n * n,
    'o(n2logn)': (n) => n * n * (Math.log2(n) || 0),
    'o(n3)': (n) => n * n * n,
    'o(2n)': (n) => Math.pow(2, n / 5), // Scaled down for visibility
    'o(n!)': (n) => { // Factorial, highly scaled
        if (n > 10) return Math.pow(10, 6); // Cap for visibility
        let res = 1; for(let i=2; i<=n; i++) res *= i; return res;
    }
  };
  
  let plotFunction = complexityFunctions[normalizedComplexity];

  if (!plotFunction) { // Fallback for complex or unrecognized notations
    if (normalizedComplexity.includes('n2')) plotFunction = complexityFunctions['o(n2)'];
    else if (normalizedComplexity.includes('nlogn')) plotFunction = complexityFunctions['o(nlogn)'];
    else if (normalizedComplexity.includes('n')) plotFunction = complexityFunctions['o(n)'];
    else if (normalizedComplexity.includes('logn')) plotFunction = complexityFunctions['o(logn)'];
    else plotFunction = complexityFunctions['o(n)']; // Default to O(n) if truly unknown
  }

  operations = nValues.map(n => plotFunction(n));

  // Filter out Inifinity/-Infinity/NaN that can come from log(0) or extreme values
  operations = operations.map(op => (isFinite(op) ? op : 0));
  
  const maxOp = Math.max(1, ...operations.filter(isFinite)); // Ensure maxOp is at least 1

  // Draw Grid
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#6b7280';

  // Horizontal grid lines & Y-axis labels
  const numYLines = 4;
  for (let i = 0; i <= numYLines; i++) {
    const y = padding.top + (i * graphHeight / numYLines);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + graphWidth, y);
    ctx.stroke();
    const val = maxOp * (1 - i / numYLines);
    ctx.textAlign = 'right';
    ctx.fillText(val.toExponential(0), padding.left - 5, y + 3);
  }

  // Vertical grid lines & X-axis labels
  const numXLines = 5;
  for (let i = 0; i <= numXLines; i++) {
    const x = padding.left + (i * graphWidth / numXLines);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + graphHeight);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(i * Math.max(...nValues) / numXLines), x, padding.top + graphHeight + 15);
  }

  // Draw Axes
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + graphHeight); // Y-axis
  ctx.lineTo(padding.left + graphWidth, padding.top + graphHeight); // X-axis
  ctx.stroke();

  // Draw Curve
  ctx.beginPath();
  ctx.strokeStyle = '#2563eb'; // Blue curve
  ctx.lineWidth = 2;
  operations.forEach((op, i) => {
    const x = padding.left + (nValues[i] / Math.max(...nValues)) * graphWidth;
    const y = padding.top + graphHeight - ( (isFinite(op) ? op : 0) / maxOp) * graphHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Gradient Fill
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight);
  gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
  gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
  ctx.fillStyle = gradient;
  
  ctx.lineTo(padding.left + graphWidth, padding.top + graphHeight); // Bottom-right
  ctx.lineTo(padding.left, padding.top + graphHeight); // Bottom-left
  ctx.closePath();
  ctx.fill();

  // Axes Labels
  ctx.fillStyle = '#374151';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Input Size (n)', padding.left + graphWidth / 2, canvas.height - 5);
  
  ctx.save();
  ctx.translate(padding.left - 30, padding.top + graphHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Operations', 0, 0);
  ctx.restore();

  // Complexity Label on Graph
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#2563eb';
  ctx.textAlign = 'right';
  ctx.fillText(complexityString, canvas.width - padding.right, padding.top - 5);
}