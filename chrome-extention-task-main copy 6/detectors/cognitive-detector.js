export default function detectCognitiveFeatures() {
    // Results structure for cognitive features
    const results = {
      simpleLanguage: false,
      consistentNavigation: false,
      errorPrevention: false
    };
    
    // ======== SIMPLE LANGUAGE DETECTION ========
    
    // Check for simple language - we'll analyze text content
    function checkSimpleLanguage() {
      // Get paragraphs and headings
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th');
      
      // Sample text for analysis (max 50 elements)
      const samplesToCheck = Math.min(textElements.length, 50);
      let totalWords = 0;
      let complexWords = 0;
      let longSentences = 0;
      let sentenceCount = 0;
      
      for (let i = 0; i < samplesToCheck; i++) {
        const text = textElements[i].textContent.trim();
        if (!text) continue;
        
        // Split into sentences (roughly)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        sentenceCount += sentences.length;
        
        // Count words with 3+ syllables as complex
        const words = text.split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
        
        // Simple heuristic for complex words (3+ syllables)
        for (const word of words) {
          // Count vowel groups as syllables (rough approximation)
          const syllables = word.toLowerCase().replace(/[^aeiouy]+/g, ' ').trim().split(' ').length;
          if (syllables >= 3 && word.length > 6) {
            complexWords++;
          }
        }
        
        // Check for long sentences (more than 20 words)
        for (const sentence of sentences) {
          const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
          if (wordCount > 20) {
            longSentences++;
          }
        }
      }
      
      // Calculate readability metrics
      if (totalWords > 0 && sentenceCount > 0) {
        const complexWordPercentage = complexWords / totalWords;
        const longSentencePercentage = longSentences / sentenceCount;
        
        // Simplistic readability check
        return (complexWordPercentage < 0.15 && longSentencePercentage < 0.3);
      }
      
      return false;
    }
    
    // ======== CONSISTENT NAVIGATION DETECTION ========
    
    function checkConsistentNavigation() {
      // Check for standard navigation patterns
      const hasNavElement = document.querySelectorAll('nav, [role="navigation"]').length > 0;
      const hasHeaderElement = document.querySelectorAll('header, [role="banner"]').length > 0;
      const hasMainElement = document.querySelectorAll('main, [role="main"]').length > 0;
      const hasFooterElement = document.querySelectorAll('footer, [role="contentinfo"]').length > 0;
      
      // Check for breadcrumbs
      const hasBreadcrumbs = document.querySelectorAll(
        '[aria-label*="breadcrumb"], [class*="breadcrumb"], [id*="breadcrumb"], nav ol, .breadcrumbs'
      ).length > 0;
      
      // Check for consistent heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let isHeadingStructureConsistent = false;
      
      if (headings.length > 0) {
        // Check if h1 exists and appears before h2, etc.
        const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
        
        let isSequential = true;
        let currentLevel = 0;
        
        for (const level of headingLevels) {
          // Heading levels should not skip more than one level
          if (level > currentLevel + 1 && currentLevel > 0) {
            isSequential = false;
            break;
          }
          currentLevel = Math.max(currentLevel, level);
        }
        
        isHeadingStructureConsistent = isSequential;
      }
      
      // Combined score for consistent navigation
      const navigationScore = [
        hasNavElement, 
        hasHeaderElement, 
        hasMainElement,
        hasFooterElement,
        hasBreadcrumbs,
        isHeadingStructureConsistent
      ].filter(Boolean).length;
      
      return navigationScore >= 3; // At least 3 indicators of consistent navigation
    }
    
    // ======== ERROR PREVENTION DETECTION ========
    
    function checkErrorPrevention() {
      // Check for forms with validation
      const forms = document.querySelectorAll('form');
      let hasFormValidation = false;
      
      if (forms.length > 0) {
        // Check for required fields
        const requiredFields = document.querySelectorAll('[required], [aria-required="true"]');
        
        // Check for input validation attributes
        const validationAttributes = document.querySelectorAll(
          '[type="email"], [type="tel"], [type="url"], [type="number"], [type="date"], ' +
          '[minlength], [maxlength], [min], [max], [pattern]'
        );
        
        // Check for aria-invalid attribute (indicates form validation)
        const ariaInvalid = document.querySelectorAll('[aria-invalid]');
        
        // Check for common error message patterns
        const errorMessages = document.querySelectorAll(
          '[class*="error"], [id*="error"], [class*="validation"], [id*="validation"], ' +
          '[role="alert"], .invalid-feedback, .form-error'
        );
        
        hasFormValidation = (
          requiredFields.length > 0 || 
          validationAttributes.length > 0 || 
          ariaInvalid.length > 0 ||
          errorMessages.length > 0
        );
      }
      
      // Check for confirmation dialogs
      const hasConfirmationDialogs = document.querySelectorAll(
        '[role="dialog"], [role="alertdialog"], dialog, .modal, .dialog, #confirm, .confirm'
      ).length > 0;
      
      // Check for undo functionality
      const hasUndoButtons = document.querySelectorAll(
        'button:contains("Undo"), [aria-label*="undo"], [class*="undo"], [id*="undo"]'
      ).length > 0;
      
      return hasFormValidation || hasConfirmationDialogs || hasUndoButtons;
    }
    
    // Run all checks
    results.simpleLanguage = checkSimpleLanguage();
    results.consistentNavigation = checkConsistentNavigation();
    results.errorPrevention = checkErrorPrevention();
    
    // Send results back to background script
    chrome.runtime.sendMessage({
      action: "analysisResults",
      category: "cognitive",
      results: results
    });
    
    return results;
  }