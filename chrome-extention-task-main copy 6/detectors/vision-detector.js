export default function detectVisionFeatures() {
    // Results structure for vision features
    const results = {
      screenReader: false,
      keyboardNavigation: false,
      highContrast: false
    };
    
    // Check for screen reader compatibility
    function checkScreenReaderCompatibility() {
      // Check for ARIA attributes
      const ariaElements = document.querySelectorAll(
        '[aria-label], [aria-labelledby], [aria-describedby], [aria-description], ' +
        '[role="application"], [role="article"], [role="document"], [role="heading"]'
      );
      
      // Check for alt text on images
      const images = document.querySelectorAll('img');
      const imagesWithAlt = document.querySelectorAll('img[alt]');
      const altTextRatio = images.length > 0 ? imagesWithAlt.length / images.length : 0;
      
      // Check for heading structure
      const hasHeadings = document.querySelectorAll('h1, h2, h3').length > 0;
      
      // Check for proper semantic structure
      const hasSemanticStructure = document.querySelectorAll(
        'header, main, footer, nav, article, section, aside'
      ).length > 0;
      
      // Combine factors
      return (ariaElements.length > 5 || altTextRatio > 0.7 || (hasHeadings && hasSemanticStructure));
    }
    
    // Check for keyboard navigation support
    function checkKeyboardNavigation() {
      // Check for focusable elements with tabindex
      const hasCustomTabindex = document.querySelectorAll('[tabindex]').length > 0;
      
      // Check for focus outline styles in stylesheets
      let hasFocusStyles = false;
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          try {
            const rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
            for (let j = 0; j < rules.length; j++) {
              if (rules[j].selectorText && rules[j].selectorText.includes(':focus')) {
                hasFocusStyles = true;
                break;
              }
            }
            if (hasFocusStyles) break;
          } catch (e) {
            // Likely a CORS issue with external stylesheet
            continue;
          }
        }
      } catch (e) {
        console.error('Error checking CSS rules:', e);
      }
      
      // Check for sufficient interactive elements that can be tabbed to
      const interactiveElements = document.querySelectorAll('a[href], button, input, select, textarea');
      
      return (hasCustomTabindex || hasFocusStyles || interactiveElements.length > 5);
    }
    
    // Check for high contrast and resizable text
    function checkHighContrastAndResizableText() {
      // Check for relative font size units
      let hasRelativeFontSizes = false;
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          try {
            const rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
            for (let j = 0; j < rules.length; j++) {
              if (rules[j].style && rules[j].style.fontSize) {
                const fontSize = rules[j].style.fontSize;
                if (fontSize.includes('em') || fontSize.includes('rem') || fontSize.includes('%')) {
                  hasRelativeFontSizes = true;
                  break;
                }
              }
            }
            if (hasRelativeFontSizes) break;
          } catch (e) {
            // CORS issue
            continue;
          }
        }
      } catch (e) {
        console.error('Error checking CSS rules:', e);
      }
      
      // Check for viewport meta tag with user-scalable
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const allowsScaling = !viewportMeta || 
                           !viewportMeta.content.includes('user-scalable=no') ||
                           viewportMeta.content.includes('maximum-scale');
      
      // Check for color contrast (simplified)
      let hasGoodContrast = false;
      const bodyStyle = window.getComputedStyle(document.body);
      const bodyColor = bodyStyle.color;
      const bodyBg = bodyStyle.backgroundColor;
      
      if (bodyColor && bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)') {
        // Very simple contrast check (would need more sophisticated algorithm in production)
        const textRGB = extractRGB(bodyColor);
        const bgRGB = extractRGB(bodyBg);
        
        if (textRGB && bgRGB) {
          // Calculate luminance difference (simplified)
          const textLuminance = 0.299 * textRGB.r + 0.587 * textRGB.g + 0.114 * textRGB.b;
          const bgLuminance = 0.299 * bgRGB.r + 0.587 * bgRGB.g + 0.114 * bgRGB.b;
          hasGoodContrast = Math.abs(textLuminance - bgLuminance) > 125;
        }
      }
      
      return (hasRelativeFontSizes || allowsScaling || hasGoodContrast);
    }
    
    // Helper function to extract RGB values
    function extractRGB(colorString) {
      const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        };
      }
      return null;
    }
    
    // Run all checks
    results.screenReader = checkScreenReaderCompatibility();
    results.keyboardNavigation = checkKeyboardNavigation();
    results.highContrast = checkHighContrastAndResizableText();
    
    // Send results back to background script
    chrome.runtime.sendMessage({
      action: "analysisResults",
      category: "vision",
      results: results
    });
    
    return results;
  }