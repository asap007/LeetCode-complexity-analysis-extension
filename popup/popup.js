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
  const patternContainer = document.getElementById('patternContainer');
  const approachContainer = document.getElementById('approachContainer');
  const walkthroughContainer = document.getElementById('walkthroughContainer');
  const complexityAnalysisContainer = document.getElementById('complexityAnalysisContainer');
  const complexityGraphContainer = document.getElementById('complexityGraphContainer');
  const alternativeContainer = document.getElementById('alternativeContainer');
  const insightsList = document.getElementById('insightsList');
  const mistakesList = document.getElementById('mistakesList');
  const optimizationsList = document.getElementById('optimizationsList');
  const edgeCasesList = document.getElementById('edgeCasesList');
  const interviewTipsList = document.getElementById('interviewTipsList');
  const practiceAdviceContainer = document.getElementById('practiceAdviceContainer');
  const relatedProblemsList = document.getElementById('relatedProblemsList');

  // State
  let currentProblemTitle = "Current LeetCode Problem";
  let currentProblemUrl = "";

  const complexityColors = {
    'O(1)': ['#16a34a', '#dcfce7'],
    'O(log n)': ['#2563eb', '#dbeafe'],
    'O(n)': ['#ca8a04', '#fef9c3'],
    'O(n log n)': ['#ea580c', '#ffedd5'],
    'O(n²)': ['#dc2626', '#fee2e2'],
    'O(n³)': ['#be123c', '#ffe4e6'],
    'O(2ⁿ)': ['#86198f', '#fae8ff'],
    'O(n!)': ['#581c87', '#f3e8ff'],
    'default': ['#4b5563', '#f3f4f6']
  };

  const getComplexityStyles = (complexity) => {
    const normalizedComplexity = complexity ? complexity.toLowerCase().replace(/\s+/g, '') : 'default';
    for (const key in complexityColors) {
        if (normalizedComplexity.includes(key.toLowerCase().replace('o(','').replace(')',''))) {
            return complexityColors[key];
        }
    }
    return complexityColors[normalizedComplexity] || complexityColors['default'];
  };

  // Complexity graph drawing function
  const drawComplexityGraph = (complexity, container) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const padding = 40;
    const graphWidth = canvas.width - 2 * padding;
    const graphHeight = canvas.height - 2 * padding;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw axes
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.fillText('n', canvas.width - padding + 5, canvas.height - padding + 5);
    ctx.fillText('Time', 10, padding - 10);
    
    // Draw complexity curve based on the complexity
    const normalizedComplexity = complexity ? complexity.toLowerCase().replace(/\s+/g, '') : '';
    
    ctx.strokeStyle = getComplexityStyles(complexity)[0];
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * graphWidth + padding;
      let y;
      
      if (normalizedComplexity.includes('1')) {
        // O(1) - constant
        y = canvas.height - padding - graphHeight * 0.1;
      } else if (normalizedComplexity.includes('logn') || normalizedComplexity.includes('log')) {
        // O(log n)
        const logValue = i === 0 ? 0 : Math.log(i + 1) / Math.log(100);
        y = canvas.height - padding - graphHeight * logValue * 0.8;
      } else if (normalizedComplexity.includes('nlogn')) {
        // O(n log n)
        const nLogN = i === 0 ? 0 : (i * Math.log(i + 1)) / (100 * Math.log(100));
        y = canvas.height - padding - graphHeight * nLogN * 0.8;
      } else if (normalizedComplexity.includes('n²') || normalizedComplexity.includes('n^2')) {
        // O(n²)
        const nSquared = (i * i) / (100 * 100);
        y = canvas.height - padding - graphHeight * nSquared * 0.8;
      } else if (normalizedComplexity.includes('n³') || normalizedComplexity.includes('n^3')) {
        // O(n³)
        const nCubed = (i * i * i) / (100 * 100 * 100);
        y = canvas.height - padding - graphHeight * nCubed * 0.8;
      } else if (normalizedComplexity.includes('2ⁿ') || normalizedComplexity.includes('2^n')) {
        // O(2ⁿ) - exponential
        const exp = Math.min(Math.pow(2, i / 10) / Math.pow(2, 10), 1);
        y = canvas.height - padding - graphHeight * exp * 0.8;
      } else {
        // Default to linear O(n)
        y = canvas.height - padding - graphHeight * (i / 100) * 0.8;
      }
      
      points.push({ x, y });
    }
    
    // Draw the curve
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  };

  // Tab management
  const setupTabs = () => {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
      });
    });
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
    });
  };

  // Setup copy buttons
  const setupCopyButtons = () => {
    document.querySelectorAll('.copy-button').forEach(button => {
      button.addEventListener('click', () => {
        let textToCopy = "";
        const targetId = button.dataset.clipboardTarget;
        
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          if (targetElement.tagName === 'UL') {
            textToCopy = Array.from(targetElement.querySelectorAll('.list-text'))
                              .map((el, i) => `${i + 1}. ${el.textContent}`)
                              .join('\n');
          } else if (targetId === "timeComplexity") {
            textToCopy = timeComplexityContainer.querySelector('.value').textContent;
          } else if (targetId === "spaceComplexity") {
            textToCopy = spaceComplexityContainer.querySelector('.value').textContent;
          } else {
            textToCopy = targetElement.textContent;
          }
        }
        
        if (textToCopy) {
          copyToClipboard(textToCopy, button);
        }
      });
    });
  };

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
        analysisStatusDiv.classList.remove('error-message');
        analysisStatusDiv.classList.add('info-message');
      }

      const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
      if (!geminiApiKey) {
        apiKeyMissingDiv.classList.remove('hidden');
        mainContentDiv.classList.add('hidden');
      } else {
        apiKeyMissingDiv.classList.add('hidden');
        mainContentDiv.classList.remove('hidden');
         if (analyzeButton.disabled) {
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

  // Create list items
  const createListItems = (items, container) => {
    if (!items || items.length === 0) {
      container.innerHTML = '<li class="list-item"><p class="list-text">None available.</p></li>';
      return;
    }
    
    container.innerHTML = items.map((item, i) => `
      <li class="list-item">
        <div class="list-number">${i + 1}</div>
        <p class="list-text">${item}</p>
      </li>
    `).join('');
  };

  // Render alternative approaches
  const renderAlternativeApproaches = (approaches) => {
    if (!approaches || approaches.length === 0) {
      alternativeContainer.innerHTML = '<p class="content-text">No alternative approaches available.</p>';
      return;
    }

    alternativeContainer.innerHTML = approaches.map(approach => `
      <div class="alternative-approach">
        <div class="approach-header">${approach.approach}</div>
        <div class="approach-complexity">
          Time: ${approach.timeComplexity} | Space: ${approach.spaceComplexity}
        </div>
        <div class="approach-description">${approach.description}</div>
      </div>
    `).join('');
  };

  // Render analysis results
  const renderAnalysis = (analysis) => {
    analysisProblemTitle.textContent = currentProblemTitle;

    // Complexity display
    const timeStyles = getComplexityStyles(analysis.timeComplexity);
    timeComplexityContainer.innerHTML = `
      <span class="label">Time Complexity</span>
      <span class="value" style="color: ${timeStyles[0]};">${analysis.timeComplexity}</span>
      <button class="copy-button" data-clipboard-target="timeComplexity" style="margin-top: 8px;">Copy</button>
    `;
    timeComplexityContainer.style.backgroundColor = timeStyles[1];

    const spaceStyles = getComplexityStyles(analysis.spaceComplexity);
    spaceComplexityContainer.innerHTML = `
      <span class="label">Space Complexity</span>
      <span class="value" style="color: ${spaceStyles[0]};">${analysis.spaceComplexity}</span>
      <button class="copy-button" data-clipboard-target="spaceComplexity" style="margin-top: 8px;">Copy</button>
    `;
    spaceComplexityContainer.style.backgroundColor = spaceStyles[1];

    // Pattern recognition
    patternContainer.innerHTML = analysis.patternRecognition 
      ? `<span class="pattern-badge">${analysis.patternRecognition}</span>`
      : '<p class="content-text">No specific pattern identified.</p>';

    // Overview tab content
    approachContainer.textContent = analysis.approachExplanation || 'No approach explanation available.';
    walkthroughContainer.textContent = analysis.codeWalkthrough || 'No code walkthrough available.';

    // Analysis tab content
    complexityAnalysisContainer.textContent = analysis.detailedComplexityAnalysis || 'No detailed analysis available.';
    
    // Draw complexity graph
    complexityGraphContainer.innerHTML = '';
    drawComplexityGraph(analysis.timeComplexity, complexityGraphContainer);

    // Alternative approaches
    renderAlternativeApproaches(analysis.alternativeApproaches);

    // Insights tab content
    createListItems(analysis.keyInsights, insightsList);
    createListItems(analysis.commonMistakes, mistakesList);
    createListItems(analysis.optimizations, optimizationsList);
    createListItems(analysis.edgeCases, edgeCasesList);

    // Practice tab content
    createListItems(analysis.interviewTips, interviewTipsList);
    practiceAdviceContainer.textContent = analysis.practiceAdvice || 'No practice advice available.';
    createListItems(analysis.relatedProblems, relatedProblemsList);

    // Setup event listeners
    setupCopyButtons();
    setupTabs();
    
    showView(analysisView);
  };

  // Event listeners
  setupButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
  backButton.addEventListener('click', () => {
    analysisStatusDiv.classList.add('hidden');
    initialize();
  });

  // Analyze button click handler
  analyzeButton.addEventListener('click', async () => {
    analysisStatusDiv.classList.add('hidden');

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
        problemTitle: currentProblemTitle
      });

      if (analysisResponse && analysisResponse.success && analysisResponse.data) {
        if (analysisResponse.data.candidates && analysisResponse.data.candidates[0] &&
            analysisResponse.data.candidates[0].content && analysisResponse.data.candidates[0].content.parts &&
            analysisResponse.data.candidates[0].content.parts[0] && analysisResponse.data.candidates[0].content.parts[0].text) {
          
          const responseText = analysisResponse.data.candidates[0].content.parts[0].text.trim();
          
          try {
            const analysisData = JSON.parse(responseText);
            renderAnalysis(analysisData);
          } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.log('Raw response:', responseText);
            throw new Error('Failed to parse analysis results. The AI response may be malformed.');
          }
        } else {
          throw new Error('Invalid response structure from AI service.');
        }
      } else {
        throw new Error(analysisResponse.error || 'Failed to analyze code. Please try again.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      showView(initialView);
      analysisStatusDiv.textContent = `Error: ${error.message}`;
      analysisStatusDiv.classList.remove('hidden');
      analysisStatusDiv.classList.add('error-message');
      analysisStatusDiv.classList.remove('info-message');
    } finally {
      analyzeButton.disabled = false;
    }
  });

  // Initialize on load
  initialize();
});