// popup/popup.js
document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyMissing = document.getElementById('apiKeyMissing');
    const mainContent = document.getElementById('mainContent');
    const setupButton = document.getElementById('setupButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const analysisStatus = document.getElementById('analysisStatus');
  
    // Check if API key exists
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    
    if (!geminiApiKey) {
      apiKeyMissing.classList.remove('hidden');
      mainContent.classList.add('hidden');
    } else {
      apiKeyMissing.classList.add('hidden');
      mainContent.classList.remove('hidden');
    }
  
    // Setup button click handler
    setupButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  
    // Analyze button click handler
    analyzeButton.addEventListener('click', async () => {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('leetcode.com/problems')) {
        analysisStatus.textContent = 'Please navigate to a LeetCode problem page first.';
        analysisStatus.style.backgroundColor = '#f8d7da';
        analysisStatus.classList.remove('hidden');
        return;
      }
  
      // Show loading state
      analyzeButton.disabled = true;
      analysisStatus.textContent = 'Analyzing code...';
      analysisStatus.style.backgroundColor = '#e2e3e5';
      analysisStatus.classList.remove('hidden');
  
      // Send message to content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCode' });
        
        if (response.success) {
          // Send code to background script for analysis
          const analysis = await chrome.runtime.sendMessage({
            action: 'analyzeCode',
            code: response.code,
            language: response.language
          });
  
          if (analysis.success) {
            analysisStatus.textContent = 'Analysis complete! Check the LeetCode page for results.';
            analysisStatus.style.backgroundColor = '#d4edda';
          } else {
            throw new Error(analysis.error);
          }
        } else {
          throw new Error('Could not retrieve code from the page.');
        }
      } catch (error) {
        analysisStatus.textContent = `Error: ${error.message}`;
        analysisStatus.style.backgroundColor = '#f8d7da';
      } finally {
        analyzeButton.disabled = false;
      }
    });
  });