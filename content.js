// content.js

// Inject the external script file into the page context
function injectScript() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = function() {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      console.error('Failed to inject script:', error);
    }
  }
  
  // Enhanced fallback DOM scraping method
  function fallbackExtractCode() {
    try {
      let code = '';
      let method = 'unknown';
      
      // Try different selectors for different LeetCode UI versions
      const codeSelectors = [
        // Monaco editor
        {
          selector: '.monaco-editor .view-lines',
          extractor: (container) => {
            return Array.from(container.children)
                       .map(line => line.textContent || '')
                       .join('\n');
          },
          method: 'monaco-dom'
        },
        // CodeMirror 6 (newer LeetCode)
        {
          selector: 'div.cm-editor div.cm-content',
          extractor: (container) => container.innerText,
          method: 'codemirror6'
        },
        // Alternative CodeMirror
        {
          selector: '.CodeMirror-code',
          extractor: (container) => {
            return Array.from(container.querySelectorAll('.CodeMirror-line'))
                       .map(line => line.textContent || '')
                       .join('\n');
          },
          method: 'codemirror-legacy'
        },
        // Generic pre elements
        {
          selector: 'pre[class*="language-"]',
          extractor: (container) => container.textContent,
          method: 'pre-element'
        },
        // Ace editor
        {
          selector: '.ace_content',
          extractor: (container) => container.textContent,
          method: 'ace-editor'
        }
      ];
  
      for (const { selector, extractor, method: methodName } of codeSelectors) {
        const container = document.querySelector(selector);
        if (container) {
          try {
            code = extractor(container);
            if (code && code.trim()) {
              method = methodName;
              break;
            }
          } catch (e) {
            console.warn(`Failed to extract with ${methodName}:`, e);
          }
        }
      }
  
      // Clean up the code
      if (code) {
        code = code.replace(/\u200B/g, '') // Remove zero-width spaces
                   .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
                   .trim();
      }
  
      return code ? { success: true, code, method } 
                  : { success: false, error: 'No code found in DOM with any method' };
  
    } catch (error) {
      return { success: false, error: `Fallback extraction failed: ${error.message}` };
    }
  }
  
  // Function to detect language from DOM (fallback)
  function fallbackDetectLanguage() {
    try {
      const langSelectors = [
        'button[id^="headlessui-listbox-button"] > div > div',
        '[data-track-load="description_content"] .inline-flex.cursor-pointer.items-center',
        'div[class*="justify-between"] > div[class*="text-xs"]',
        '.text-label-2.dark\\:text-dark-label-2',
        '[data-cy="language-select-button"]',
        'button[class*="rounded"][class*="px-3"] span',
        '.ant-select-selection-item'
      ];
  
      for (const selector of langSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          let language = element.textContent.trim().toLowerCase();
          
          // Normalize language names
          if (language.includes('c++')) return 'cpp';
          if (language.includes('python3') || language.includes('python')) return 'python';
          if (language.includes('javascript')) return 'javascript';
          if (language.includes('java') && !language.includes('javascript')) return 'java';
          if (language.includes('c#')) return 'csharp';
          if (language.includes('typescript')) return 'typescript';
          
          return language;
        }
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
  
  // Function to get problem title from DOM (fallback)
  function fallbackGetProblemTitle() {
    try {
      const titleSelectors = [
        '[data-cy="question-title"]',
        'h1[class*="text-title"]',
        '.text-title-large',
        'div[data-track-load="description_content"] h1',
        '.question-title h3',
        'div[class*="flex-1"] div[class*="text-title"] a',
        'span[class*="text-title-large"]'
      ];
  
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          return element.textContent.trim();
        }
      }
      return 'Unknown Problem';
    } catch (error) {
      return 'Unknown Problem';
    }
  }
  
  // Function to extract code and language using injection
  function extractCodeAndLanguage() {
    return new Promise((resolve) => {
      let timeoutId;
      let responseReceived = false;
  
      // Set up message listener
      const messageListener = (event) => {
        if (event.source !== window || 
            event.data.type !== 'LEETCODE_ANALYZER_CODE_RESPONSE' ||
            responseReceived) {
          return;
        }
  
        responseReceived = true;
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageListener);
  
        const result = event.data.data;
        
        // If injection method failed, try fallback
        if (!result.success) {
          console.warn('Injection method failed, trying fallback:', result.error);
          const fallbackResult = fallbackExtractCode();
          
          if (fallbackResult.success) {
            resolve({
              success: true,
              code: fallbackResult.code,
              language: fallbackDetectLanguage(),
              problemTitle: fallbackGetProblemTitle(),
              method: fallbackResult.method
            });
          } else {
            resolve({
              success: false,
              error: `Both injection and fallback failed. Injection: ${result.error}, Fallback: ${fallbackResult.error}`
            });
          }
        } else {
          resolve(result);
        }
      };
  
      window.addEventListener('message', messageListener);
  
      // Send request to injected script
      window.postMessage({
        type: 'LEETCODE_ANALYZER_GET_CODE'
      }, '*');
  
      // Set timeout for fallback
      timeoutId = setTimeout(() => {
        if (responseReceived) return;
        
        responseReceived = true;
        window.removeEventListener('message', messageListener);
        
        console.warn('Injection method timed out, trying fallback');
        const fallbackResult = fallbackExtractCode();
        
        if (fallbackResult.success) {
          resolve({
            success: true,
            code: fallbackResult.code,
            language: fallbackDetectLanguage(),
            problemTitle: fallbackGetProblemTitle(),
            method: fallbackResult.method
          });
        } else {
          resolve({
            success: false,
            error: `Injection timed out and fallback failed: ${fallbackResult.error}`
          });
        }
      }, 2000); // Reduced timeout to 2 seconds
    });
  }
  
  // Wait for page to load and inject script
  function initialize() {
    // Wait for LeetCode to load
    const checkAndInject = () => {
      // Check if we're on a problem page
      if (window.location.pathname.includes('/problems/')) {
        injectScript();
      }
    };
  
    // Initial check
    setTimeout(checkAndInject, 1000);
    
    // Also listen for navigation changes (SPA)
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(checkAndInject, 1000);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCodeAndLanguage') {
      extractCodeAndLanguage()
        .then(result => {
          //console.log('Code extraction result:', result);
          sendResponse(result);
        })
        .catch(error => sendResponse({
          success: false,
          error: `Extraction failed: ${error.message}`
        }));
      return true; // Keep message channel open for async response
    }
  });