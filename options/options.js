// options/options.js
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('save');
  const testKeyButton = document.getElementById('testKey');
  const statusDiv = document.getElementById('status');

  // Load saved API key
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Save API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Please enter an API key.', 'error');
      return;
    }

    // Basic format check (Gemini keys are usually longer, but this is a generic check)
    if (!apiKey.match(/^[A-Za-z0-9-_]{10,}$/)) {
      showStatus('Invalid API key format. It should be a string of letters, numbers, hyphens, and underscores, and typically longer.', 'error');
      return;
    }

    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      showStatus('Settings saved successfully!', 'success');
    });
  });

  // Test API key
  testKeyButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Please enter an API key to test.', 'error');
      return;
    }

    showStatus('Testing API key...', 'info');
    testKeyButton.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testApiKey',
        apiKey: apiKey
      });

      if (response.success) {
        showStatus('API key is valid and working!', 'success');
      } else {
        showStatus(`API key test failed: ${response.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showStatus(`Error testing API key: ${error.message}`, 'error');
    } finally {
      testKeyButton.disabled = false;
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`; // type will be 'success', 'error', or 'info'
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000); // Increased timeout for better readability
  }
});