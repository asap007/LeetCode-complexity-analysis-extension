// content.js

function extractCodeAndLanguage() {
    try {
      // Try to find the Monaco editor instance for more robust code extraction
      // This is a common way LeetCode structures its editor, but might need updates if LeetCode changes its DOM significantly.
      let code = '';
      const editorInstances = window.monaco?.editor?.getModels();
      if (editorInstances && editorInstances.length > 0) {
          // Usually, the last model is the active editor for the solution.
          // Or, you might need to find one associated with a specific file URI if available.
          // For LeetCode, it's often just one primary model for the solution.
          code = editorInstances[editorInstances.length - 1].getValue();
      } else {
          // Fallback to DOM scraping if Monaco API is not available or fails
          const linesContainer = document.querySelector('.monaco-editor .view-lines');
          if (!linesContainer) {
              // A more specific selector for the new UI if the above fails
              const newUiEditor = document.querySelector('div.relative > div.overflow-hidden > div > div.cm-editor > div.cm-scroller > div.cm-content');
              if (newUiEditor) {
                  code = newUiEditor.innerText.replace(/\u200B/g, ''); // Remove zero-width spaces if any
              } else {
                   throw new Error('Code editor (Monaco or fallback) not found on the page.');
              }
          } else {
               code = Array.from(linesContainer.children)
                          .map(line => line.textContent || '')
                          .join('\n')
                          .replace(/\u200B/g, ''); // Remove zero-width spaces
          }
      }
  
      if (!code.trim()) {
          throw new Error('Extracted code is empty. Editor might not be loaded or is empty.');
      }
  
      // Language detection: LeetCode usually has a dropdown or display for the language.
      // This selector targets the language display typically found near the code editor.
      let language = 'unknown';
      const languageElement = document.querySelector('button[id^="headlessui-listbox-button"] > div > div'); // New UI selector
      
      if (languageElement && languageElement.textContent) {
          language = languageElement.textContent.trim().toLowerCase();
      } else {
          // Fallback for older UI or different structures
          const oldUiLangElement = document.querySelector('[data-track-load="description_content"] .inline-flex.cursor-pointer.items-center');
          if (oldUiLangElement && oldUiLangElement.textContent) {
               language = oldUiLangElement.textContent.trim().toLowerCase();
          } else {
              // Try another common selector pattern for language
              const anotherLangElement = document.querySelector('div[class*="justify-between"] > div[class*="text-xs"]');
              if (anotherLangElement && anotherLangElement.textContent) {
                  language = anotherLangElement.textContent.trim().toLowerCase();
              }
          }
      }
      
      // Normalize common language names
      if (language.includes('c++')) language = 'cpp';
      if (language.includes('python3')) language = 'python';
      if (language.includes('javascript')) language = 'javascript';
      // Add more normalizations if needed
  
      return { success: true, code, language };
  
    } catch (error) {
      console.error('LeetCode Analyzer - Error extracting code/language:', error);
      return { success: false, error: `Failed to extract code/language: ${error.message}. Ensure you are on a problem page with code editor visible.` };
    }
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCodeAndLanguage') {
      const result = extractCodeAndLanguage();
      sendResponse(result);
    }
    return true; // Keep the message channel open for async response if needed elsewhere (though not strictly for this simple sync operation)
  });