// Background script for unless Accessibility Analyzer

// Global state tracking
let userPreferences = {
  categories: {
    speech: true,
    cognitive: true, 
    vision: true,
    hearing: true
  },
  features: {
    speech: {
      voiceControl: true,
      speechToText: true,
      noSpeechOnly: true
    },
    vision: {
      screenReader: true,
      keyboardNavigation: true,
      highContrast: true
    },
    hearing: {
      captions: true,
      transcripts: true,
      visualAlerts: true
    },
    cognitive: {
      simpleLanguage: true,
      consistentNavigation: true,
      errorPrevention: true
    }
  },
  autoScan: true,
  showRecommendations: true,
  userAnalytics: true
};

// User analytics data
let userAnalytics = {
  scannedPages: 0,
  featureClicks: {
    speech: 0,
    vision: 0, 
    hearing: 0,
    cognitive: 0
  },
  solutionLinkClicks: 0,
  exportReports: 0,
  lastScanDate: null,
  timeSpentAnalyzing: 0
};

// Preload solutions data
let solutionsDatabase = {};

// Track pending analyses that need permissions
let pendingAnalyses = {};

// Initialize extension when installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed/updated:", details.reason);
  
  if (details.reason === 'install') {
    // First installation - set up initial state
    chrome.storage.local.set({ 
      firstUse: true,
      userPreferences: userPreferences,
      userAnalytics: userAnalytics
    }, () => {
      console.log('Initial extension state set up');
    });
  }
});

// Permission handling
function checkAndRequestPermission(url, tabId) {
  return new Promise((resolve) => {
    // Skip for chrome:// URLs which can't be accessed
    if (url.startsWith('chrome://')) {
      console.log('Chrome URLs cannot be accessed by extensions');
      return resolve(false);
    }
    
    // Create a pattern that matches the host
    try {
      const urlObj = new URL(url);
      const pattern = `${urlObj.protocol}//${urlObj.hostname}/*`;
      
      // Check if we already have permission
      chrome.permissions.contains({
        origins: [pattern]
      }, (hasPermission) => {
        if (hasPermission) {
          // We already have permission
          resolve(true);
        } else {
          // Store the pending analysis
          pendingAnalyses[pattern] = {
            url: url,
            tabId: tabId,
            timestamp: Date.now()
          };
          
          // We need to request permission - notify the UI
          chrome.tabs.sendMessage(tabId, {
            action: "permissionNeeded",
            url: url,
            pattern: pattern,
            tabId: tabId
          });
          
          // Return false as we don't have permission yet
          resolve(false);
        }
      });
    } catch (e) {
      console.error('Invalid URL format:', url);
      resolve(false);
    }
  });
}

// Clean up old pending analyses (older than 10 minutes)
function cleanupPendingAnalyses() {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const pattern in pendingAnalyses) {
    if (now - pendingAnalyses[pattern].timestamp > tenMinutes) {
      delete pendingAnalyses[pattern];
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupPendingAnalyses, 5 * 60 * 1000);

// Load user preferences and data on startup
chrome.storage.local.get(['userPreferences', 'firstUse', 'userAnalytics'], (result) => {
  if (result.userPreferences) {
    userPreferences = result.userPreferences;
  }
  
  if (result.userAnalytics) {
    userAnalytics = result.userAnalytics;
  }
  
  if (result.firstUse === undefined) {
    // First time user - set flag for onboarding
    chrome.storage.local.set({ firstUse: true });
  }
  
  // Load solutions database
  fetch(chrome.runtime.getURL('solutions-data.json'))
    .then(response => response.json())
    .then(data => {
      solutionsDatabase = data;
    })
    .catch(error => {
      console.error('Error loading solutions database:', error);
    });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check if we can access the tab
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    // Cannot inject scripts in chrome:// pages
    console.log('Cannot run in this page. Please try on a regular website.');
    return;
  }

  // First ensure content script is injected
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }).then(() => {
    // Now try to send the message to toggle overlay
    chrome.tabs.sendMessage(tab.id, { action: "toggleOverlay" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.visible) {
        // If overlay is now visible, run analysis (if not in onboarding)
        chrome.storage.local.get(['firstUse'], (result) => {
          if (!result.firstUse) {
            runAnalysis(tab.id);
          }
        });
      }
    });
  }).catch(err => {
    console.error('Error executing content script:', err);
  });
});

// Run the accessibility analysis
async function runAnalysis(tabId) {
  try {
    // Get the current tab URL
    const tab = await chrome.tabs.get(tabId);
    const url = tab.url;
    
    // Skip analyzing extension pages and chrome:// URLs
    if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) {
      chrome.tabs.sendMessage(tabId, {
        action: "analysisSkipped",
        reason: "Cannot analyze browser or extension pages",
        url: url
      });
      return;
    }
    
    // Check permission first before running analysis
    const hasPermission = await checkAndRequestPermission(url, tabId);
    if (!hasPermission) {
      // We'll wait for the user to grant permission via the dialog
      console.log(`Waiting for permission to access ${url}`);
      return;
    }

    // Update analytics for scanned pages
    if (userPreferences.userAnalytics) {
      userAnalytics.scannedPages++;
      userAnalytics.lastScanDate = new Date().toISOString();
      chrome.storage.local.set({ userAnalytics: userAnalytics });
    }
    
    // Create analysis timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: "analysisTimeout",
        tabId: tabId
      });
    }, 5000); // 5 second timeout
    
    // Track which detectors have completed
    let completedDetectors = {
      speech: !userPreferences.categories.speech,
      cognitive: !userPreferences.categories.cognitive,
      vision: !userPreferences.categories.vision,
      hearing: !userPreferences.categories.hearing
    };
    
    // Store scan start timestamp
    const scanStartTime = Date.now();
    
    // Listen for detector completions
    const detectorListener = (message, sender, sendResponse) => {
      if (message.action === "analysisResults") {
        completedDetectors[message.category] = true;
        
        // Forward results to the overlay
        chrome.tabs.sendMessage(tabId, {
          action: "updateResults",
          category: message.category,
          results: message.results,
          url: sender.tab ? sender.tab.url : null,
          scanTime: Date.now() - scanStartTime
        });
        
        // If all detectors have completed, clear timeout
        if (Object.values(completedDetectors).every(Boolean)) {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(detectorListener);
          
          // Update analytics for time spent analyzing
          if (userPreferences.userAnalytics) {
            userAnalytics.timeSpentAnalyzing += (Date.now() - scanStartTime);
            chrome.storage.local.set({ userAnalytics: userAnalytics });
          }
        }
      }
      return true;
    };
    
    // Add listener for detector completions
    chrome.runtime.onMessage.addListener(detectorListener);
    
    // Execute the simplified detection script
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function() {
        try {
          // Run feature detection for all categories
          function runDetection() {
            // Speech features
            detectSpeechFeatures();
            
            // Vision features
            detectVisionFeatures();
            
            // Hearing features
            detectHearingFeatures();
            
            // Cognitive features
            detectCognitiveFeatures();
          }
          
          // Speech feature detection
          function detectSpeechFeatures() {
            const results = {
              voiceControl: false,
              speechToText: false,
              noSpeechOnly: true
            };
            
            // Voice control detection
            const hasVoiceAPI = !!(window.webkitSpeechRecognition || window.SpeechRecognition);
            const voiceControls = document.querySelectorAll(
              '[aria-label*="voice"], [class*="voice"], [id*="voice"], ' +
              '[aria-label*="speech"], [class*="speech"], [id*="speech"]'
            );
            results.voiceControl = hasVoiceAPI || voiceControls.length > 0;
            
            // Speech-to-text detection
            const micButtons = document.querySelectorAll(
              '[class*="microphone"], [class*="mic-"], [id*="microphone"], ' +
              'button[class*="mic"], [aria-label*="microphone"], [aria-label*="dictate"]'
            );
            results.speechToText = hasVoiceAPI || micButtons.length > 0;
            
            // Check for speech-only interfaces
            const speechOnlyElements = document.querySelectorAll(
              '[aria-label*="voice only"], [aria-label*="speech only"], ' +
              '[class*="voice-only"], [class*="speech-only"]'
            );
            if (speechOnlyElements.length > 0) {
              results.noSpeechOnly = false;
            }
            
            // Report results
            chrome.runtime.sendMessage({
              action: "analysisResults",
              category: "speech",
              results: results
            });
          }
          
          // Vision feature detection
          function detectVisionFeatures() {
            const results = {
              screenReader: false,
              keyboardNavigation: false,
              highContrast: false
            };
            
            // Screen reader detection
            const ariaAttributes = document.querySelectorAll(
              '[aria-label], [aria-labelledby], [aria-describedby], [aria-description], ' +
              '[aria-hidden], [aria-live], [role]'
            );
            
            const images = document.querySelectorAll('img');
            const imagesWithAlt = document.querySelectorAll('img[alt]');
            const altTextRatio = images.length > 0 ? imagesWithAlt.length / images.length : 0;
            
            results.screenReader = ariaAttributes.length > 5 || altTextRatio > 0.7;
            
            // Keyboard navigation detection
            const focusableElements = document.querySelectorAll(
              'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const customTabIndex = document.querySelectorAll('[tabindex]:not([tabindex="-1"])');
            
            results.keyboardNavigation = focusableElements.length > 0 || customTabIndex.length > 0;
            
            // High contrast detection
            const hasViewportMeta = document.querySelector('meta[name="viewport"][content*="user-scalable=yes"]') !== null ||
                               document.querySelector('meta[name="viewport"][content*="maximum-scale"]') === null;
                             
            // Basic contrast check on body
            const bodyStyle = window.getComputedStyle(document.body);
            const bodyColor = bodyStyle.color;
            const bodyBg = bodyStyle.backgroundColor;
            let hasGoodContrast = false;
            
            if (bodyColor && bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)') {
              // Extract RGB values for contrast calculation
              const textRGB = extractRGB(bodyColor);
              const bgRGB = extractRGB(bodyBg);
              
              if (textRGB && bgRGB) {
                const textLuminance = 0.299 * textRGB.r + 0.587 * textRGB.g + 0.114 * textRGB.b;
                const bgLuminance = 0.299 * bgRGB.r + 0.587 * bgRGB.g + 0.114 * bgRGB.b;
                hasGoodContrast = Math.abs(textLuminance - bgLuminance) > 125;
              }
            }
            
            results.highContrast = hasViewportMeta || hasGoodContrast;
            
            // Helper function to extract RGB values
            function extractRGB(colorString) {
              const match = colorString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/i);
              if (match) {
                return {
                  r: parseInt(match[1]),
                  g: parseInt(match[2]),
                  b: parseInt(match[3])
                };
              }
              return null;
            }
            
            // Report results
            chrome.runtime.sendMessage({
              action: "analysisResults",
              category: "vision",
              results: results
            });
          }
          
          // Hearing feature detection
          function detectHearingFeatures() {
            const results = {
              captions: false,
              transcripts: false,
              visualAlerts: false
            };
            
            // Captions detection
            const videosWithCaptions = document.querySelectorAll('video > track[kind="captions"], video > track[kind="subtitles"]');
            const captionControls = document.querySelectorAll(
              '[class*="caption"], [class*="subtitle"], [id*="caption"], [id*="subtitle"], ' +
              'button[aria-label*="caption"], button[aria-label*="subtitle"]'
            );
            
            results.captions = videosWithCaptions.length > 0 || captionControls.length > 0;
            
            // Transcripts detection
            const transcriptSections = document.querySelectorAll(
              '[class*="transcript"], [id*="transcript"], [aria-label*="transcript"]'
            );
            
            const transcriptLinks = document.querySelectorAll(
              'a[href*="transcript"], a[download*="transcript"], ' +
              'a[aria-label*="transcript"], button[contains*="transcript"]'
            );
            
            // Also check text content for transcript mentions
            let hasTranscriptText = false;
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(heading => {
              if (heading.textContent.toLowerCase().includes('transcript')) {
                hasTranscriptText = true;
              }
            });
            
            results.transcripts = transcriptSections.length > 0 || transcriptLinks.length > 0 || hasTranscriptText;
            
            // Visual alerts detection
            const notifications = document.querySelectorAll(
              '[role="alert"], [aria-live="assertive"], [aria-live="polite"], ' +
              '.alert, .notification, .toast, [class*="alert"], [class*="notification"], ' +
              '[id*="alert"], [id*="notification"]'
            );
            
            const visualIndicators = document.querySelectorAll(
              '.badge, .indicator, [class*="badge"], [class*="indicator"], ' +
              '[class*="icon"][class*="notification"], [class*="status-icon"]'
            );
            
            results.visualAlerts = notifications.length > 0 || visualIndicators.length > 0;
            
            // Report results
            chrome.runtime.sendMessage({
              action: "analysisResults",
              category: "hearing",
              results: results
            });
          }
          
          // Cognitive feature detection
          function detectCognitiveFeatures() {
            const results = {
              simpleLanguage: false,
              consistentNavigation: false,
              errorPrevention: false
            };
            
            // Simple language detection
            const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th');
            const samplesToCheck = Math.min(textElements.length, 10);
            let totalWords = 0;
            let complexWords = 0;
            let longSentences = 0;
            let sentenceCount = 0;
            
            for (let i = 0; i < samplesToCheck; i++) {
              const text = textElements[i].textContent.trim();
              if (!text) continue;
              
              const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
              sentenceCount += sentences.length;
              
              const words = text.split(/\s+/).filter(w => w.length > 0);
              totalWords += words.length;
              
              for (const word of words) {
                const syllables = word.toLowerCase().replace(/[^aeiouy]+/g, ' ').trim().split(' ').length;
                if (syllables >= 3 && word.length > 6) {
                  complexWords++;
                }
              }
              
              for (const sentence of sentences) {
                const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
                if (wordCount > 20) {
                  longSentences++;
                }
              }
            }
            
            if (totalWords > 0 && sentenceCount > 0) {
              const complexWordPercentage = complexWords / totalWords;
              const longSentencePercentage = longSentences / sentenceCount;
              results.simpleLanguage = (complexWordPercentage < 0.15 && longSentencePercentage < 0.3);
            }
            
            // Consistent navigation detection
            const hasNavElement = document.querySelectorAll('nav, [role="navigation"]').length > 0;
            const hasHeaderElement = document.querySelectorAll('header, [role="banner"]').length > 0;
            const hasMainElement = document.querySelectorAll('main, [role="main"]').length > 0;
            const hasFooterElement = document.querySelectorAll('footer, [role="contentinfo"]').length > 0;
            
            const navigationScore = [
              hasNavElement, 
              hasHeaderElement, 
              hasMainElement,
              hasFooterElement
            ].filter(Boolean).length;
            
            results.consistentNavigation = navigationScore >= 2;
            
            // Error prevention detection
            const requiredFields = document.querySelectorAll('[required], [aria-required="true"]');
            
            const validationAttributes = document.querySelectorAll(
              '[type="email"], [type="tel"], [type="url"], [type="number"], [type="date"], ' +
              '[minlength], [maxlength], [min], [max], [pattern]'
            );
            
            const errorMessages = document.querySelectorAll(
              '[class*="error"], [id*="error"], [class*="validation"], [id*="validation"], ' +
              '[role="alert"], .invalid-feedback, .form-error'
            );
            
            results.errorPrevention = requiredFields.length > 0 || 
                                    validationAttributes.length > 0 || 
                                    errorMessages.length > 0;
            
            // Report results
            chrome.runtime.sendMessage({
              action: "analysisResults",
              category: "cognitive",
              results: results
            });
          }
          
          // Run all feature detections
          runDetection();
        } catch (error) {
          console.error('Error in detector execution:', error);
          chrome.runtime.sendMessage({
            action: "analysisError",
            error: error.toString()
          });
        }
      }
    }).catch(error => {
      console.error('Error executing script:', error);
      chrome.tabs.sendMessage(tabId, {
        action: "analysisError",
        error: error.message,
        tabId: tabId
      });
      clearTimeout(timeout);
      chrome.runtime.onMessage.removeListener(detectorListener);
    });
  } catch (error) {
    console.error('Error in runAnalysis:', error);
    chrome.tabs.sendMessage(tabId, {
      action: "analysisError",
      error: error.message,
      tabId: tabId
    });
  }
}

// Handle messages from content script and UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "savePreferences") {
    // Update user preferences
    userPreferences = message.preferences;
    chrome.storage.local.set({ userPreferences: userPreferences });
    
    // If the message includes a tabId, run analysis with new preferences
    if (message.tabId) {
      runAnalysis(message.tabId);
    }
    
    sendResponse({ success: true });
  } 
  else if (message.action === "runAnalysis") {
    // Run analysis for the specified tab
    if (message.tabId) {
      runAnalysis(message.tabId);
    } else if (sender.tab) {
      runAnalysis(sender.tab.id);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          runAnalysis(tabs[0].id);
        }
      });
    }
    
    sendResponse({ success: true });
  }
  else if (message.action === "requestPermission") {
    // Handle permission request
    chrome.permissions.request({
      origins: [message.pattern]
    }, (granted) => {
      // Inform UI of the result
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "permissionResult",
        granted: granted,
        pattern: message.pattern,
        url: message.url
      });
      
      // If granted and we have a pending analysis, run it
      if (granted && pendingAnalyses[message.pattern]) {
        const pendingAnalysis = pendingAnalyses[message.pattern];
        delete pendingAnalyses[message.pattern];
        
        if (pendingAnalysis.tabId) {
          runAnalysis(pendingAnalysis.tabId);
        }
      }
      
      sendResponse({granted: granted});
    });
    return true; // Required for async sendResponse
  }
  else if (message.action === "onboardingComplete") {
    // Mark first use as false after completing onboarding
    chrome.storage.local.set({ firstUse: false });
    
    // Update user preferences if provided
    if (message.preferences) {
      userPreferences = message.preferences;
      chrome.storage.local.set({ userPreferences: userPreferences });
    }
    
    // Run analysis if tabId is provided
    if (sender.tab && sender.tab.id) {
      runAnalysis(sender.tab.id);
    }
    
    sendResponse({ success: true });
  }
  else if (message.action === "updateAnalytics") {
    // Update analytics data
    if (userPreferences.userAnalytics) {
      if (message.category) {
        userAnalytics.featureClicks[message.category]++;
      }
      
      if (message.solutionLinkClicked) {
        userAnalytics.solutionLinkClicks++;
      }
      
      if (message.exportReport) {
        userAnalytics.exportReports++;
      }
      
      chrome.storage.local.set({ userAnalytics: userAnalytics });
    }
    
    sendResponse({ success: true });
  }
  else if (message.action === "getAnalytics") {
    // Return analytics data
    sendResponse({ analytics: userAnalytics });
  }
  
  return true; // Keep message channel open for async responses
});