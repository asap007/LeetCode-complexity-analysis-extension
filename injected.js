(function() {
    'use strict';
    
    // Function to extract code from Monaco editor
    function extractMonacoCode() {
      try {
        // Method 1: Try to get Monaco editor models
        if (window.monaco?.editor?.getModels) {
          const models = window.monaco.editor.getModels();
          if (models && models.length > 0) {
            // Get the main solution model (usually the last one or one with specific URI)
            const solutionModel = models.find(model => 
              model.uri?.path?.includes('solution') || 
              model.uri?.path?.includes('main') ||
              !model.uri?.path?.includes('readonly')
            ) || models[models.length - 1];
            
            if (solutionModel) {
              return {
                success: true,
                code: solutionModel.getValue(),
                method: 'monaco-models'
              };
            }
          }
        }
  
        // Method 2: Try to get active editor instance
        if (window.monaco?.editor?.getEditors) {
          const editors = window.monaco.editor.getEditors();
          if (editors && editors.length > 0) {
            // Find the main editor (not readonly)
            const mainEditor = editors.find(editor => 
              !editor.getOption(window.monaco.editor.EditorOption.readOnly)
            ) || editors[0];
            
            if (mainEditor) {
              return {
                success: true,
                code: mainEditor.getValue(),
                method: 'monaco-editors'
              };
            }
          }
        }
  
        // Method 3: Try to find editor through DOM with Monaco API
        const editorElements = document.querySelectorAll('.monaco-editor');
        for (const element of editorElements) {
          if (element._monacoEditor) {
            return {
              success: true,
              code: element._monacoEditor.getValue(),
              method: 'dom-monaco-reference'
            };
          }
        }
  
        // Method 4: Try global editor variables that LeetCode might use
        if (window.editor && typeof window.editor.getValue === 'function') {
          return {
            success: true,
            code: window.editor.getValue(),
            method: 'global-editor'
          };
        }
  
        return { success: false, error: 'Monaco editor not found or not accessible' };
  
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  
    // Function to detect programming language
    function detectLanguage() {
      try {
        // Method 1: Check language selector button (most reliable)
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
            if (language.includes('go')) return 'go';
            if (language.includes('rust')) return 'rust';
            if (language.includes('kotlin')) return 'kotlin';
            if (language.includes('swift')) return 'swift';
            if (language.includes('scala')) return 'scala';
            if (language.includes('ruby')) return 'ruby';
            if (language.includes('php')) return 'php';
            
            return language;
          }
        }
  
        // Method 2: Try to detect from Monaco editor language
        if (window.monaco?.editor?.getModels) {
          const models = window.monaco.editor.getModels();
          if (models && models.length > 0) {
            const mainModel = models[models.length - 1];
            if (mainModel.getLanguageId) {
              return mainModel.getLanguageId();
            }
          }
        }
  
        return 'unknown';
      } catch (error) {
        console.error('Error detecting language:', error);
        return 'unknown';
      }
    }
  
    // Function to get problem title
    function getProblemTitle() {
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
        console.error('Error getting problem title:', error);
        return 'Unknown Problem';
      }
    }
  
    // Listen for messages from content script
    window.addEventListener('message', function(event) {
      if (event.source !== window || event.data.type !== 'LEETCODE_ANALYZER_GET_CODE') {
        return;
      }
  
      const codeResult = extractMonacoCode();
      const language = detectLanguage();
      const problemTitle = getProblemTitle();
  
      // Send response back to content script
      window.postMessage({
        type: 'LEETCODE_ANALYZER_CODE_RESPONSE',
        data: {
          ...codeResult,
          language: language,
          problemTitle: problemTitle
        }
      }, '*');
    });
  
    // Notify that injection is complete
    window.postMessage({
      type: 'LEETCODE_ANALYZER_INJECTION_COMPLETE'
    }, '*');
  
  })();