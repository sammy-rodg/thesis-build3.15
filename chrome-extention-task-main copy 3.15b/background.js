// Improved Background Script for "unless" Extension

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
  userAnalytics: true,
  darkMode: false
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

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First time installation - set onboarding flag
    chrome.storage.local.set({ firstUse: true });
  }
  
  // Load solutions data
  loadSolutionsData();
  
  // Load any saved preferences
  loadUserPreferences();
});

// Load user preferences from storage
function loadUserPreferences() {
  chrome.storage.local.get(['userPreferences', 'userAnalytics'], (result) => {
    if (result.userPreferences) {
      userPreferences = { ...userPreferences, ...result.userPreferences };
    }
    
    if (result.userAnalytics) {
      userAnalytics = { ...userAnalytics, ...result.userAnalytics };
    }
  });
}

// Load solutions data (in a real extension, this might be from a JSON file)
function loadSolutionsData() {
  // Use data from solutions-data.json
  solutionsDatabase = {
    "speech": {
      "voiceControl": [
        {
          "id": "browser-voice-control",
          "title": "Chrome Voice Control Settings",
          "description": "Enable built-in voice commands in Chrome",
          "link": "chrome://settings/accessibility",
          "users": 8742,
          "tags": ["popular", "easiest", "$0"]
        },
        {
          "id": "voice-in-mind",
          "title": "Voice In Mind Extension",
          "description": "Third-party extension for enhanced voice control with customizable commands",
          "link": "https://chrome.google.com/webstore/detail/voice-in-mind/sample",
          "users": 3521,
          "tags": ["AI", "$0"]
        },
        {
          "id": "windows-voice",
          "title": "Windows Speech Recognition",
          "description": "Use Windows built-in speech recognition for voice control",
          "link": "ms-settings:easeofaccess-speechrecognition",
          "users": 12453,
          "tags": ["popular", "$0"]
        }
      ],
      "speechToText": [
        {
          "id": "dictation-chrome",
          "title": "Chrome Dictation",
          "description": "Use Chrome's built-in dictation feature",
          "link": "https://support.google.com/chromebook/answer/177794",
          "users": 15632,
          "tags": ["popular", "easiest", "$0"]
        },
        {
          "id": "speechify",
          "title": "Speechify",
          "description": "Advanced speech-to-text service with AI enhancement",
          "link": "https://speechify.com/",
          "users": 9587,
          "tags": ["AI", "premium"]
        },
        {
          "id": "dragon-naturally",
          "title": "Dragon Naturally Speaking",
          "description": "Professional speech recognition software",
          "link": "https://www.nuance.com/dragon.html",
          "users": 7548,
          "tags": ["NLP", "premium"]
        }
      ],
      "noSpeechOnly": [
        {
          "id": "keyboard-shortcuts",
          "title": "Keyboard Shortcuts",
          "description": "Use keyboard shortcuts as alternatives to voice commands",
          "link": "https://support.google.com/chrome/answer/157179",
          "users": 24879,
          "tags": ["popular", "easiest", "$0"]
        },
        {
          "id": "mouse-gestures",
          "title": "CrxMouse Gestures",
          "description": "Use mouse gestures as an alternative to voice commands",
          "link": "https://chrome.google.com/webstore/detail/crxmouse-chrome-gestures/jlgkpaicikihijadgifklkbpdajbkhjo",
          "users": 8932,
          "tags": ["$0"]
        }
      ]
    },
    "vision": {
      "screenReader": [
        {
          "id": "chrome-screen-reader",
          "title": "ChromeVox Screen Reader",
          "description": "Built-in screen reader for Chrome",
          "link": "chrome://settings/accessibility",
          "users": 18754,
          "tags": ["popular", "easiest", "$0"]
        },
        {
          "id": "nvda-screen-reader",
          "title": "NVDA Screen Reader",
          "description": "Free, open-source screen reader for Windows",
          "link": "https://www.nvaccess.org/download/",
          "users": 32154,
          "tags": ["popular", "$0"]
        }
      ],
      "keyboardNavigation": [
        {
          "id": "vimium",
          "title": "Vimium Extension",
          "description": "Navigate and control Chrome with keyboard shortcuts",
          "link": "https://chrome.google.com/webstore/detail/vimium/dbepggeogbaibhgnhhndojpepiihcmeb",
          "users": 15467,
          "tags": ["popular", "$0"]
        },
        {
          "id": "tab-navigation",
          "title": "Tab Navigation",
          "description": "Navigate websites using the Tab key",
          "link": "https://www.w3.org/WAI/people-use-web/user-stories/",
          "users": 29876,
          "tags": ["easiest", "$0"]
        }
      ],
      "highContrast": [
        {
          "id": "high-contrast",
          "title": "High Contrast Extension",
          "description": "Improve readability with custom color schemes",
          "link": "https://chrome.google.com/webstore/detail/high-contrast/djcfdncoelnlbldjfhinnjlhdjlikmph",
          "users": 21543,
          "tags": ["popular", "$0"]
        },
        {
          "id": "dark-reader",
          "title": "Dark Reader",
          "description": "Dark mode for every website to reduce eye strain",
          "link": "https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh",
          "users": 35421,
          "tags": ["popular", "easiest", "$0"]
        }
      ]
    },
    "hearing": {
      "captions": [
        {
          "id": "live-caption",
          "title": "Live Caption",
          "description": "Automatic captions for audio and video content",
          "link": "chrome://settings/accessibility",
          "users": 14752,
          "tags": ["popular", "easiest", "$0", "AI"]
        },
        {
          "id": "webcaptioner",
          "title": "Web Captioner",
          "description": "Real-time captioning for any audio source",
          "link": "https://webcaptioner.com/",
          "users": 8965,
          "tags": ["AI", "$0"]
        }
      ],
      "transcripts": [
        {
          "id": "otter-ai",
          "title": "Otter.ai",
          "description": "AI-powered meeting notes and transcription",
          "link": "https://otter.ai/",
          "users": 12543,
          "tags": ["popular", "AI", "premium"]
        },
        {
          "id": "youtube-transcripts",
          "title": "YouTube Transcripts",
          "description": "Access transcripts for YouTube videos",
          "link": "https://support.google.com/youtube/answer/6373554",
          "users": 28754,
          "tags": ["popular", "easiest", "$0"]
        }
      ],
      "visualAlerts": [
        {
          "id": "flash-notifications",
          "title": "Flash Notifications",
          "description": "Flash the screen for audio notifications",
          "link": "chrome://settings/accessibility",
          "users": 9856,
          "tags": ["easiest", "$0"]
        },
        {
          "id": "visual-notification-alerts",
          "title": "Visual Notification Alerts",
          "description": "Convert audio alerts to visual notifications",
          "link": "https://chrome.google.com/webstore/detail/visual-notification-alert/sample",
          "users": 6754,
          "tags": ["$0"]
        }
      ]
    },
    "cognitive": {
      "simpleLanguage": [
        {
          "id": "hemingway-editor",
          "title": "Hemingway Editor",
          "description": "Make your text clear and bold with readability suggestions",
          "link": "https://hemingwayapp.com/",
          "users": 18542,
          "tags": ["popular", "$0"]
        },
        {
          "id": "rewordify",
          "title": "Rewordify",
          "description": "Simplifies difficult English into easier text",
          "link": "https://rewordify.com/",
          "users": 12654,
          "tags": ["NLP", "$0"]
        }
      ],
      "consistentNavigation": [
        {
          "id": "reader-view",
          "title": "Reader View",
          "description": "Simplify page layout for distraction-free reading",
          "link": "https://support.mozilla.org/en-US/kb/firefox-reader-view-clutter-free-web-pages",
          "users": 24857,
          "tags": ["popular", "easiest", "$0"]
        },
        {
          "id": "mercury-reader",
          "title": "Mercury Reader",
          "description": "Clear away clutter from articles",
          "link": "https://chrome.google.com/webstore/detail/mercury-reader/oknpjjbmpnndlpmnhmekjpocelpnlfdi",
          "users": 14532,
          "tags": ["easiest", "$0"]
        }
      ],
      "errorPrevention": [
        {
          "id": "grammarly",
          "title": "Grammarly",
          "description": "Catch errors and improve writing",
          "link": "https://chrome.google.com/webstore/detail/grammarly-grammar-checker/kbfnbcaeplbcioakkpcpgfkobkghlhen",
          "users": 42568,
          "tags": ["popular", "AI", "freemium"]
        },
        {
          "id": "form-filler",
          "title": "Form Filler",
          "description": "Automatically fill forms to prevent errors",
          "link": "https://chrome.google.com/webstore/detail/form-filler/bnjjngeaknajbdcgpfkgnonkmififhfo",
          "users": 15487,
          "tags": ["$0"]
        }
      ]
    }
  };
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check if this is first use
  chrome.storage.local.get(['firstUse'], (result) => {
    if (result.firstUse === true) {
      // Show onboarding page
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    } else {
      // Toggle overlay on current page
      chrome.tabs.sendMessage(tab.id, { action: "toggleOverlay" }, (response) => {
        // If no response, content script may not be loaded (e.g., Chrome settings page)
        if (chrome.runtime.lastError) {
          console.log("Content script not available:", chrome.runtime.lastError.message);
        }
      });
    }
  });
});

// Run the accessibility analysis
function runAnalysis(tabId) {
  try {
    console.log("Running analysis on tab:", tabId);
    
    // Skip analyzing extension pages and Chrome settings
    chrome.tabs.get(tabId, (tab) => {
      const url = tab.url || '';
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(tabId, {
          action: "analysisSkipped",
          reason: "Cannot analyze browser or extension pages",
          url: url
        });
        return;
      }
      
      // Proceed with analysis
      performAnalysis(tabId, url);
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

// Perform the actual analysis
function performAnalysis(tabId, url) {
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
  }, 10000); // 10 second timeout
  
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
        url: sender.tab ? sender.tab.url : url,
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
        
        // Send analysis complete message
        chrome.tabs.sendMessage(tabId, {
          action: "analysisComplete"
        });
      }
      
      return true;
    }
  };
  
  // Add listener for detector completions
  chrome.runtime.onMessage.addListener(detectorListener);
  
  // Tell content script to run detectors
  const categoriesToDetect = [];
  for (const category in userPreferences.categories) {
    if (userPreferences.categories[category]) {
      categoriesToDetect.push(category);
    }
  }
  
  chrome.tabs.sendMessage(tabId, {
    action: "runDetectors",
    categories: categoriesToDetect
  });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);
  
  if (message.action === "savePreferences") {
    // Update user preferences
    userPreferences = { ...userPreferences, ...message.preferences };
    chrome.storage.local.set({ userPreferences: userPreferences });
    
    // If the message includes a tabId, run analysis with new preferences
    if (message.tabId) {
      runAnalysis(message.tabId);
    }
    
    sendResponse({ success: true });
    return true;
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
    return true;
  }
  else if (message.action === "saveThemePreference") {
    // Save theme preference
    userPreferences.darkMode = message.darkMode;
    chrome.storage.local.set({ userPreferences: userPreferences });
    
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "openOnboarding") {
    // Open the onboarding page
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "onboardingComplete") {
    // Mark first use as false after completing onboarding
    chrome.storage.local.set({ firstUse: false });
    
    // Update user preferences if provided
    if (message.preferences) {
      userPreferences = { ...userPreferences, ...message.preferences };
      chrome.storage.local.set({ userPreferences: userPreferences });
    }
    
    // Open active tab with overlay if requested
    if (message.showOverlay) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "toggleOverlay" });
        }
      });
    }
    
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "updateAnalytics") {
    // Update analytics data
    if (userPreferences.userAnalytics) {
      if (message.category) {
        userAnalytics.featureClicks[message.category] = 
          (userAnalytics.featureClicks[message.category] || 0) + 1;
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
    return true;
  }
  else if (message.action === "getAnalytics") {
    // Return analytics data
    sendResponse({ analytics: userAnalytics });
    return true;
  }
  else if (message.action === "getSolutionsData") {
    // Return solutions data
    sendResponse({ solutionsData: solutionsDatabase });
    return true;
  }
  
  return false; // No async response needed
});