export default function detectSpeechFeatures() {
    // Results structure for speech features
    const results = {
      voiceControl: false,
      speechToText: false,
      noSpeechOnly: true // Assume true until we find evidence otherwise
    };
    
    // ======== VOICE CONTROL DETECTION ========
    // Fast checks first, deeper analysis only if needed
    
    // Quick check for voice API availability
    const hasVoiceAPI = !!(
      window.webkitSpeechRecognition || 
      window.SpeechRecognition
    );
    
    // Quick check for voice buttons
    const quickVoiceButtons = document.querySelectorAll(
      '[aria-label*="voice"], [class*="voice"], [id*="voice"], ' +
      '[aria-label*="speech"], [class*="speech"], [id*="speech"]'
    );
    
    // If we have quick indicators, set flag and skip detailed check
    if (hasVoiceAPI && quickVoiceButtons.length > 0) {
      results.voiceControl = true;
    } else {
      // Detailed check for button and link accessibility
      const clickableElements = document.querySelectorAll('button, [role="button"], a, [role="link"]');
      let accessibleClickables = 0;
      
      // Sample only a subset for performance (first 50 elements max)
      const samplesToCheck = Math.min(clickableElements.length, 50);
      for (let i = 0; i < samplesToCheck; i++) {
        const el = clickableElements[i];
        
        // Check for accessible name via aria-label, aria-labelledby, or text content
        const hasAriaLabel = el.hasAttribute('aria-label') && el.getAttribute('aria-label').trim() !== '';
        const hasAriaLabelledby = el.hasAttribute('aria-labelledby') && 
                                document.getElementById(el.getAttribute('aria-labelledby'));
        const hasTextContent = el.textContent && el.textContent.trim() !== '';
        
        if (hasAriaLabel || hasAriaLabelledby || hasTextContent) {
          accessibleClickables++;
        }
      }
      
      // If most sampled clickable elements are accessible and we have voice API, likely supports voice control
      if (hasVoiceAPI && (accessibleClickables / Math.max(samplesToCheck, 1) > 0.7)) {
        results.voiceControl = true;
      }
    }
    
    // ======== SPEECH-TO-TEXT DETECTION ========
    
    // Quick check for microphone UI elements
    const microphoneElements = document.querySelectorAll(
      '[class*="microphone"], [class*="mic-"], [class*="mic_"], [id*="microphone"], ' +
      'button[class*="mic"], button[id*="mic"], [aria-label*="microphone"], [aria-label*="dictate"]'
    );
    
    if (hasVoiceAPI && microphoneElements.length > 0) {
      results.speechToText = true;
    } else {
      // Check for input fields that might accept dictation
      const inputFields = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
      
      // Check if any input field has a microphone button nearby (sample first 20 max)
      const fieldsToCheck = Math.min(inputFields.length, 20);
      for (let i = 0; i < fieldsToCheck; i++) {
        const input = inputFields[i];
        const parent = input.parentElement;
        if (!parent) continue;
        
        const nearbyButtons = parent.querySelectorAll('button, [role="button"], i, svg');
        for (const btn of nearbyButtons) {
          const btnText = btn.textContent?.toLowerCase() || '';
          const btnClass = btn.className?.toLowerCase() || '';
          
          if (btnClass.includes('mic') || btnText.includes('mic')) {
            results.speechToText = true;
            break;
          }
        }
        
        if (results.speechToText) break;
      }
      
      // Check for speech attributes on inputs
      if (!results.speechToText) {
        results.speechToText = document.querySelectorAll('input[x-webkit-speech], input[speech]').length > 0;
      }
    }
    
    // ======== NO SPEECH-ONLY REQUIREMENTS ========
    
    // Check for voice-only elements
    const speechOnlyElements = document.querySelectorAll(
      '[aria-label*="voice only"], [aria-label*="speech only"], ' +
      '[class*="voice-only"], [class*="speech-only"]'
    );
    
    if (speechOnlyElements.length > 0) {
      results.noSpeechOnly = false;
    } else {
      // Quick scan of paragraphs for voice-only instructions (sample first 30)
      const paragraphs = document.querySelectorAll('p');
      const paragraphsToCheck = Math.min(paragraphs.length, 30);
      
      for (let i = 0; i < paragraphsToCheck; i++) {
        const text = paragraphs[i].textContent?.toLowerCase() || '';
        if (
          text.includes('say to activate') || 
          text.includes('speak to activate') || 
          text.includes('voice command only') || 
          (text.includes('voice command') && !text.includes('alternative'))
        ) {
          results.noSpeechOnly = false;
          break;
        }
      }
    }
    
    // Send results back to background script
    chrome.runtime.sendMessage({
      action: "analysisResults",
      category: "speech",
      results: results
    });
    
    return results;
  }