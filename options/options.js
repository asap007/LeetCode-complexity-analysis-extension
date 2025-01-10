// options/options.js
document.addEventListener('DOMContentLoaded', () => {
    // Load saved API key
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        document.getElementById('apiKey').value = result.geminiApiKey;
      }
    });
  
    // Save API key
    document.getElementById('save').addEventListener('click', () => {
      const apiKey = document.getElementById('apiKey').value;
      const status = document.getElementById('status');
  
      if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
      }
  
      // Validate API key format (basic check)
      if (!apiKey.match(/^[A-Za-z0-9-_]+$/)) {
        showStatus('Invalid API key format', 'error');
        return;
      }
  
      chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        showStatus('Settings saved successfully!', 'success');
      });
    });
  
    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = `status ${type}`;
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }
  });