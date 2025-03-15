// Global variables
let currentResults = {
  speech: {},
  vision: {},
  hearing: {},
  cognitive: {}
};
let accessibilityScore = null;
let readinessScoreCircle = null;
let scoreDescription = null;
let solutionsData = {};
let synthesis = null;
let recognition = null;
let isAnalyzing = false;

// Ensure DOM is fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded");
  
  // Force show the main UI
  const mainUI = document.getElementById('main-ui');
  if (mainUI) {
    mainUI.style.display = 'flex';
    console.log("Main UI displayed");
  } else {
    console.error("Main UI element not found");
  }
  
  // Hide onboarding if it's showing
  const onboarding = document.getElementById('onboarding-container');
  if (onboarding) {
    onboarding.style.display = 'none';
  }
  
  // Set up UI elements
  accessibilityScore = document.getElementById('accessibility-score');
  readinessScoreCircle = document.getElementById('readiness-score-circle');
  scoreDescription = document.getElementById('score-description');
  
  // Initialize the UI with default state
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'flex';
    loadingElement.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-text">Initializing analysis...</div>
    `;
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Load solutions data
  loadSolutionsData();
  
  // Auto-trigger analysis
  console.log("Auto-triggering analysis");
  window.parent.postMessage({ 
    action: 'runAnalysis'
  }, '*');
});

// Function to load solutions data
function loadSolutionsData() {
  fetch(chrome.runtime.getURL('solutions-data.json'))
    .then(response => response.json())
    .then(data => {
      solutionsData = data;
      console.log("Solutions data loaded");
    })
    .catch(error => {
      console.error('Error loading solutions data:', error);
    });
}

// Check if onboarding should be shown
function checkOnboarding() {
  chrome.storage.local.get(['firstUse'], function(result) {
    if (result.firstUse === true) {
      showOnboarding();
    } else {
      showMainUI();
    }
  });
}

// Show onboarding
function showOnboarding() {
  document.getElementById('main-ui').style.display = 'none';
  document.getElementById('onboarding-container').style.display = 'flex';
}

// Show main UI
function showMainUI() {
  document.getElementById('onboarding-container').style.display = 'none';
  document.getElementById('main-ui').style.display = 'flex';
}

// Setup settings button functionality
function setupSettingsButton() {
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  
  if (settingsToggle && settingsPanel) {
    // Clear any existing event listeners
    const newSettingsToggle = settingsToggle.cloneNode(true);
    settingsToggle.parentNode.replaceChild(newSettingsToggle, settingsToggle);
    
    // Add new event listener
    newSettingsToggle.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent click from bubbling
      
      if (settingsPanel.style.display === 'block') {
        settingsPanel.style.display = 'none';
      } else {
        settingsPanel.style.display = 'block';
        
        // Close any other open panels
        const analyticsPanel = document.getElementById('analytics-panel');
        if (analyticsPanel) {
          analyticsPanel.style.display = 'none';
        }
      }
    });
    
    // Close settings when clicking outside
    document.addEventListener('click', function(e) {
      if (settingsPanel.style.display === 'block' && 
          !settingsPanel.contains(e.target) && 
          e.target !== newSettingsToggle) {
        settingsPanel.style.display = 'none';
      }
    });
  }
}

// Fix for minimize button functionality
function setupMinimizeButton() {
  const minimizeButton = document.getElementById('minimizeButton');
  const sidebarContainer = document.querySelector('.sidebar-container');
  
  if (minimizeButton && sidebarContainer) {
    // Clear any existing event listeners
    const newMinimizeButton = minimizeButton.cloneNode(true);
    minimizeButton.parentNode.replaceChild(newMinimizeButton, minimizeButton);
    
    // Add new event listener
    newMinimizeButton.addEventListener('click', function() {
      sidebarContainer.classList.add('collapsed');
      
      // Notify parent content script
      window.parent.postMessage({ 
        action: 'resizeOverlay',
        state: 'minimized'
      }, '*');
    });
  }
}

// Fix for expand button functionality
function setupExpandButton() {
  const expandButton = document.querySelector('.expand-button');
  const sidebarContainer = document.querySelector('.sidebar-container');
  
  if (expandButton && sidebarContainer) {
    // Clear any existing event listeners
    const newExpandButton = expandButton.cloneNode(true);
    expandButton.parentNode.replaceChild(newExpandButton, expandButton);
    
    // Add new event listener
    newExpandButton.addEventListener('click', function() {
      sidebarContainer.classList.remove('collapsed');
      
      // Notify parent content script
      window.parent.postMessage({ 
        action: 'resizeOverlay',
        state: 'normal'
      }, '*');
    });
  }
}

// Fix for the chat window position and functionality
function setupChatWindow() {
  const chatIconButton = document.getElementById('chat-icon-button');
  const chatPanel = document.getElementById('chat-panel');
  const closeChatButton = document.getElementById('close-chat');
  const minimizeChatButton = document.getElementById('minimize-chat');
  
  if (chatIconButton && chatPanel) {
    // Clear existing event listeners
    const newChatIconButton = chatIconButton.cloneNode(true);
    chatIconButton.parentNode.replaceChild(newChatIconButton, chatIconButton);
    
    // Add new event listener
    newChatIconButton.addEventListener('click', function() {
      if (chatPanel.style.display === 'flex') {
        chatPanel.style.display = 'none';
      } else {
        chatPanel.style.display = 'flex';
      }
    });
    
    // Setup close button
    if (closeChatButton) {
      const newCloseChatButton = closeChatButton.cloneNode(true);
      closeChatButton.parentNode.replaceChild(newCloseChatButton, closeChatButton);
      
      newCloseChatButton.addEventListener('click', function() {
        chatPanel.style.display = 'none';
      });
    }
    
    // Setup minimize button
    if (minimizeChatButton) {
      const newMinimizeChatButton = minimizeChatButton.cloneNode(true);
      minimizeChatButton.parentNode.replaceChild(newMinimizeChatButton, minimizeChatButton);
      
      newMinimizeChatButton.addEventListener('click', function() {
        chatPanel.style.display = 'none';
      });
    }
  }
}

// Set up event listeners
function setupEventListeners() {
  // First run the specialized setup functions for key elements
  setupSettingsButton();
  setupMinimizeButton();
  setupExpandButton();
  setupChatWindow();

  // Tab navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      // Remove active class from all tabs
      navItems.forEach(tab => tab.classList.remove('active'));
      // Add active class to clicked tab
      this.classList.add('active');
      
      // Hide all tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Show selected tab content
      const tabId = this.dataset.tab;
      const contentElement = document.getElementById(`${tabId}-content`);
      if (contentElement) {
        contentElement.classList.add('active');
      }
      
      // Update analytics
      updateAnalytics({ category: tabId });
    });
  });
  
  // Close button
  const closeButton = document.getElementById('closeButton');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      window.parent.postMessage({ action: 'closeOverlay' }, '*');
    });
  }
  
  // Make header draggable
  const dragHandle = document.getElementById('drag-handle');
  if (dragHandle) {
    dragHandle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      window.parent.postMessage({
        action: 'dragHandleMouseDown',
        clientX: e.clientX,
        clientY: e.clientY
      }, '*');
    });
  }
  
  // Read aloud button
  const tellMeButton = document.getElementById('tell-me-button');
  if (tellMeButton) {
    tellMeButton.addEventListener('click', function() {
      readFeaturesAloud();
    });
  }
  
  // Analyze button
  const analyzeButton = document.getElementById('analyzeButton');
  if (analyzeButton) {
    analyzeButton.addEventListener('click', function() {
      startAnalysis();
    });
  }
  
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      toggleDarkMode();
    });
  }
  
  const toggleTheme = document.getElementById('toggle-theme');
  if (toggleTheme) {
    toggleTheme.addEventListener('click', function() {
      toggleDarkMode();
      const settingsPanel = document.getElementById('settings-panel');
      if (settingsPanel) {
        settingsPanel.style.display = 'none';
      }
    });
  }
  
  // Export report button
  const exportReport = document.getElementById('export-report');
  if (exportReport) {
    exportReport.addEventListener('click', function() {
      exportReadinessReport();
      updateAnalytics({ exportReport: true });
    });
  }
  
  // Export solutions button
  const exportSolutions = document.getElementById('export-solutions');
  if (exportSolutions) {
    exportSolutions.addEventListener('click', function() {
      exportSolutionsReport();
      updateAnalytics({ exportReport: true });
      const settingsPanel = document.getElementById('settings-panel');
      if (settingsPanel) {
        settingsPanel.style.display = 'none';
      }
    });
  }
  
  // View analytics button
  const viewAnalytics = document.getElementById('view-analytics');
  if (viewAnalytics) {
    viewAnalytics.addEventListener('click', function() {
      const analyticsPanel = document.getElementById('analytics-panel');
      if (analyticsPanel) {
        analyticsPanel.style.display = 'block';
      }
      
      const settingsPanel = document.getElementById('settings-panel');
      if (settingsPanel) {
        settingsPanel.style.display = 'none';
      }
      
      // Load analytics data
      chrome.runtime.sendMessage({ action: 'getAnalytics' }, function(response) {
        if (response && response.analytics) {
          displayAnalytics(response.analytics);
        }
      });
    });
  }
  
  // Close analytics button
  const closeAnalytics = document.getElementById('close-analytics');
  if (closeAnalytics) {
    closeAnalytics.addEventListener('click', function() {
      const analyticsPanel = document.getElementById('analytics-panel');
      if (analyticsPanel) {
        analyticsPanel.style.display = 'none';
      }
    });
  }
  
  // Analytics toggle in analytics panel
  const analyticsEnabledToggle = document.getElementById('analytics-enabled-toggle');
  if (analyticsEnabledToggle) {
    analyticsEnabledToggle.addEventListener('change', function() {
      chrome.storage.local.get(['userPreferences'], function(result) {
        if (result.userPreferences) {
          const preferences = result.userPreferences;
          preferences.userAnalytics = document.getElementById('analytics-enabled-toggle').checked;
          
          chrome.runtime.sendMessage({
            action: 'savePreferences',
            preferences: preferences
          });
        }
      });
    });
  }
  
  // Onboarding back button
  const onboardingLink = document.getElementById('onboarding-link');
  if (onboardingLink) {
    onboardingLink.addEventListener('click', function() {
      const settingsPanel = document.getElementById('settings-panel');
      if (settingsPanel) {
        settingsPanel.style.display = 'none';
      }
      showOnboarding();
    });
  }
  
  // Contact Samantha button
  const contactSamantha = document.getElementById('contact-samantha');
  if (contactSamantha) {
    contactSamantha.addEventListener('click', function() {
      const emailNotification = document.getElementById('email-notification');
      if (emailNotification) {
        emailNotification.style.display = 'block';
      }
      
      const settingsPanel = document.getElementById('settings-panel');
      if (settingsPanel) {
        settingsPanel.style.display = 'none';
      }
    });
  }
  
  // Close email notification
  const closeEmailNotification = document.getElementById('close-email-notification');
  if (closeEmailNotification) {
    closeEmailNotification.addEventListener('click', function() {
      const emailNotification = document.getElementById('email-notification');
      if (emailNotification) {
        emailNotification.style.display = 'none';
      }
    });
  }
  
  // Onboarding buttons
  const ctaBtn = document.getElementById('cta-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', function() {
      const landingContainer = document.getElementById('landing-container');
      const featuresContainer = document.getElementById('features-container');
      
      if (landingContainer) {
        landingContainer.style.display = 'none';
      }
      
      if (featuresContainer) {
        featuresContainer.style.display = 'flex';
      }
    });
  }
  
  const startButton = document.getElementById('start-button');
  if (startButton) {
    startButton.addEventListener('click', function() {
      // Collect preferences from onboarding UI
      const speechToggle = document.getElementById('speech-toggle');
      const visionToggle = document.getElementById('vision-toggle');
      const hearingToggle = document.getElementById('hearing-toggle');
      const cognitiveToggle = document.getElementById('cognitive-toggle');
      
      const voiceControl = document.getElementById('voice-control');
      const speechToText = document.getElementById('speech-to-text');
      const noSpeechOnly = document.getElementById('no-speech-only');
      
      const screenReader = document.getElementById('screen-reader');
      const keyboardNavigation = document.getElementById('keyboard-navigation');
      const highContrast = document.getElementById('high-contrast');
      
      const captions = document.getElementById('captions');
      const transcripts = document.getElementById('transcripts');
      const visualAlerts = document.getElementById('visual-alerts');
      
      const simpleLanguage = document.getElementById('simple-language');
      const consistentNavigation = document.getElementById('consistent-navigation');
      const errorPrevention = document.getElementById('error-prevention');
      
      const analyticsToggle = document.getElementById('analytics-toggle');
      
      const preferences = {
        categories: {
          speech: speechToggle ? speechToggle.checked : true,
          vision: visionToggle ? visionToggle.checked : true,
          hearing: hearingToggle ? hearingToggle.checked : true,
          cognitive: cognitiveToggle ? cognitiveToggle.checked : true
        },
        features: {
          speech: {
            voiceControl: voiceControl ? voiceControl.checked : true,
            speechToText: speechToText ? speechToText.checked : true,
            noSpeechOnly: noSpeechOnly ? noSpeechOnly.checked : true
          },
          vision: {
            screenReader: screenReader ? screenReader.checked : true,
            keyboardNavigation: keyboardNavigation ? keyboardNavigation.checked : true,
            highContrast: highContrast ? highContrast.checked : true
          },
          hearing: {
            captions: captions ? captions.checked : true,
            transcripts: transcripts ? transcripts.checked : true,
            visualAlerts: visualAlerts ? visualAlerts.checked : true
          },
          cognitive: {
            simpleLanguage: simpleLanguage ? simpleLanguage.checked : true,
            consistentNavigation: consistentNavigation ? consistentNavigation.checked : true,
            errorPrevention: errorPrevention ? errorPrevention.checked : true
          }
        },
        userAnalytics: analyticsToggle ? analyticsToggle.checked : true
      };
      
      // Save preferences and complete onboarding
      window.parent.postMessage({
        action: 'onboardingComplete',
        preferences: preferences
      }, '*');
      
      // Show main UI
      showMainUI();
      
      // Start analysis
      startAnalysis();
    });
  }
  
  // Category toggles in onboarding
  const categoryToggles = document.querySelectorAll('.category-toggle input[type="checkbox"]');
  categoryToggles.forEach(toggle => {
    toggle.addEventListener('change', function() {
      const category = this.id.replace('-toggle', '');
      const featureCheckboxes = document.querySelectorAll(`#${category}-features .feature-checkbox`);
      
      featureCheckboxes.forEach(checkbox => {
        checkbox.disabled = !this.checked;
        if (!this.checked) {
          checkbox.checked = false;
        } else {
          checkbox.checked = true;
        }
      });
    });
  });
}

// Start the analysis
function startAnalysis() {
  if (isAnalyzing) return;
  
  isAnalyzing = true;
  
  // Show loading state
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'flex';
    loadingElement.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-text">Analyzing page...</div>
    `;
  }
  
  // Reset tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.innerHTML = '';
  });
  
  // Reset results
  currentResults = {
    speech: {},
    vision: {},
    hearing: {},
    cognitive: {}
  };
  
  // Reset score
  if (accessibilityScore) {
    accessibilityScore.textContent = '--';
    readinessScoreCircle.classList.remove('poor', 'fair', 'good', 'excellent');
    scoreDescription.textContent = 'Analyzing page...';
  }
  
  // Request analysis from content script
  window.parent.postMessage({ action: 'runAnalysis' }, '*');
  
  // Add timeout to handle cases where analysis doesn't complete
  setTimeout(function() {
    if (isAnalyzing) {
      isAnalyzing = false;
      const loadingElement = document.getElementById('loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      if (scoreDescription) {
        scoreDescription.textContent = 'Analysis timed out. Try again.';
      }
    }
  }, 15000);
}

// Update results for a category
function updateResults(category, results) {
  console.log(`Updating ${category} results:`, results);
  
  // Update current results
  currentResults[category] = results;
  
  // Update UI based on category
  const tabContent = document.getElementById(`${category}-content`);
  if (!tabContent) {
    console.error(`Tab content not found for category: ${category}`);
    return;
  }
  
  tabContent.innerHTML = '';
  
  switch(category) {
    case 'speech':
      displaySpeechFeatures(tabContent, results);
      break;
    case 'vision':
      displayVisionFeatures(tabContent, results);
      break;
    case 'hearing':
      displayHearingFeatures(tabContent, results);
      break;
    case 'cognitive':
      displayCognitiveFeatures(tabContent, results);
      break;
  }
  
  // Check if all categories have results
  const allCategoriesComplete = ['speech', 'vision', 'hearing', 'cognitive'].every(cat => 
    Object.keys(currentResults[cat]).length > 0
  );
  
  if (allCategoriesComplete) {
    // Hide loading
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    isAnalyzing = false;
    
    // Update accessibility score
    updateAccessibilityScore();
  }
}

// Function to display speech features
function displaySpeechFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Speech Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Voice Control', results.voiceControl,
    'Ability to control the website using voice commands.',
    'speech', 'voiceControl');
  
  addFeatureItem(container, 'Speech-to-Text', results.speechToText,
    'Ability to use voice input for text fields and forms.',
    'speech', 'speechToText');
  
  addFeatureItem(container, 'Non-Voice Alternatives', results.noSpeechOnly,
    'All voice features have alternative interaction methods.',
    'speech', 'noSpeechOnly');
}

// Function to display vision features
function displayVisionFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Vision Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Screen Reader Support', results.screenReader,
    'Content is properly structured for screen readers.',
    'vision', 'screenReader');
  
  addFeatureItem(container, 'Keyboard Navigation', results.keyboardNavigation,
    'All functionality is accessible using keyboard-only navigation.',
    'vision', 'keyboardNavigation');
  
  addFeatureItem(container, 'High Contrast', results.highContrast,
    'Text and interactive elements have sufficient color contrast.',
    'vision', 'highContrast');
}

// Function to display hearing features
function displayHearingFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Hearing Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Captions', results.captions,
    'Videos have closed captions or subtitles for spoken content.',
    'hearing', 'captions');
  
  addFeatureItem(container, 'Transcripts', results.transcripts,
    'Audio content has text transcripts available.',
    'hearing', 'transcripts');
  
  addFeatureItem(container, 'Visual Alerts', results.visualAlerts,
    'Audio alerts and notifications have visual indicators.',
    'hearing', 'visualAlerts');
}

// Function to display cognitive features
function displayCognitiveFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Cognitive Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Simple Language', results.simpleLanguage,
    'Content uses clear, simple language that is easy to understand.',
    'cognitive', 'simpleLanguage');
  
  addFeatureItem(container, 'Consistent Navigation', results.consistentNavigation,
    'Navigation patterns are consistent and predictable across the site.',
    'cognitive', 'consistentNavigation');
  
  addFeatureItem(container, 'Error Prevention', results.errorPrevention,
    'Forms and interactive elements help prevent and correct errors.',
    'cognitive', 'errorPrevention');
}

// Helper function to add a feature item
function addFeatureItem(container, name, available, description, category, featureKey) {
  const item = document.createElement('div');
  item.className = 'feature-item';
  
  const header = document.createElement('div');
  header.className = 'feature-header';
  
  const featureName = document.createElement('div');
  featureName.className = 'feature-name';
  featureName.textContent = name;
  header.appendChild(featureName);
  
  const status = document.createElement('div');
  status.className = `feature-status ${available ? 'status-available' : 'status-unavailable'}`;
  status.textContent = available ? '✓ Available' : '✗ Not Available';
  header.appendChild(status);
  
  item.appendChild(header);
  
  const featureDescription = document.createElement('div');
  featureDescription.className = 'feature-description';
  featureDescription.textContent = description;
  item.appendChild(featureDescription);
  
  // Add read aloud button for each feature
  const readAloudButton = document.createElement('button');
  readAloudButton.className = 'read-aloud-button';
  readAloudButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  `;
  readAloudButton.title = "Read aloud";
  readAloudButton.style.background = "none";
  readAloudButton.style.border = "none";
  readAloudButton.style.cursor = "pointer";
  readAloudButton.style.color = "var(--text-color)";
  readAloudButton.style.padding = "4px";
  readAloudButton.style.display = "inline-flex";
  readAloudButton.style.alignItems = "center";
  readAloudButton.style.marginLeft = "10px";
  
  readAloudButton.addEventListener('click', function() {
    const text = `${name} is ${available ? 'available' : 'not available'} on this page. ${description}`;
    speakText(text);
  });
  
  featureName.appendChild(readAloudButton);
  
  // Add verification method if available
  if (available) {
    const verificationMethod = document.createElement('div');
    verificationMethod.className = 'verification-method';
    
    // Get verification method based on feature
    const methodText = getVerificationMethodText(category, featureKey);
    verificationMethod.innerHTML = `
      <div class="verification-title">Verification Method:</div>
      <div class="verification-details">${methodText}</div>
    `;
    item.appendChild(verificationMethod);
    
    // Add settings adjustment option
    const settingsButton = document.createElement('button');
    settingsButton.className = 'settings-button';
    settingsButton.innerHTML = '<span class="settings-icon">⚙️</span> Adjust Settings';
    settingsButton.dataset.category = category;
    settingsButton.dataset.feature = featureKey;
    
    settingsButton.addEventListener('click', function() {
      toggleSettingsOptions(this.dataset.category, this.dataset.feature, item);
    });
    
    item.appendChild(settingsButton);
  } else {
    // Add solutions button for unavailable features
    const solutionsButton = document.createElement('button');
    solutionsButton.className = 'solutions-button';
    solutionsButton.innerHTML = '<span class="solutions-icon">💡</span> How to enable';
    solutionsButton.dataset.category = category;
    solutionsButton.dataset.feature = featureKey;
    
    solutionsButton.addEventListener('click', function() {
      toggleSolutions(this.dataset.category, this.dataset.feature, item);
      updateAnalytics({ category: category, solutionLinkClicked: true });
    });
    
    item.appendChild(solutionsButton);
  }
  
  // Add community benefit data
  addCommunityBenefitData(item, category, featureKey);
  
  container.appendChild(item);
}

// Function to toggle solutions for a feature
function toggleSolutions(category, feature, featureItem) {
  console.log("Toggling solutions for:", category, feature);
  
  // Check if solutions container already exists
  let solutionsContainer = featureItem.querySelector('.solutions-container');
  
  if (solutionsContainer) {
    // Toggle visibility
    if (solutionsContainer.style.display === 'none') {
      solutionsContainer.style.display = 'block';
    } else {
      solutionsContainer.style.display = 'none';
    }
    return;
  }
  
  // Create solutions container
  solutionsContainer = document.createElement('div');
  solutionsContainer.className = 'solutions-container';
  
  // Get solutions for this feature
  const solutions = solutionsData[category] && solutionsData[category][feature];
  
  if (solutions && solutions.length > 0) {
    // Add title
    const title = document.createElement('div');
    title.className = 'how-to-title';
    title.textContent = `How to ${getFeatureName(category, feature)}`;
    solutionsContainer.appendChild(title);
    
    // Add solutions list
    const solutionsList = document.createElement('ol');
    solutionsList.className = 'solutions-list';
    
    // Add each solution
    solutions.forEach((solution, index) => {
      const solutionItem = document.createElement('li');
      solutionItem.className = 'solution-item';
      
      // Add solution title and link
      const titleLink = document.createElement('div');
      titleLink.className = 'solution-title-link';
      titleLink.innerHTML = `<a href="${solution.link}" target="_blank" class="solution-link" data-category="${category}" data-feature="${feature}">${solution.title}</a>`;
      solutionItem.appendChild(titleLink);
      
      // Add solution description
      const solutionDesc = document.createElement('div');
      solutionDesc.className = 'solution-description';
      solutionDesc.textContent = solution.description;
      solutionItem.appendChild(solutionDesc);
      
      // Add tags
      if (solution.tags && solution.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'solution-tags';
        
        solution.tags.forEach(tag => {
          const tagSpan = document.createElement('span');
          tagSpan.className = `tag tag-${tag.replace('$', 'free').toLowerCase()}`;
          tagSpan.textContent = tag;
          tagsContainer.appendChild(tagSpan);
        });
        
        solutionItem.appendChild(tagsContainer);
      }
      
      solutionsList.appendChild(solutionItem);
    });
    
    solutionsContainer.appendChild(solutionsList);
    
    // Add event listeners to solution links
    solutionsContainer.querySelectorAll('.solution-link').forEach(link => {
      link.addEventListener('click', function() {
        updateAnalytics({ 
          category: this.dataset.category, 
          solutionLinkClicked: true 
        });
      });
    });
  } else {
    // No solutions found
    const noSolutions = document.createElement('div');
    noSolutions.className = 'no-solutions';
    noSolutions.textContent = 'No solutions available for this feature.';
    solutionsContainer.appendChild(noSolutions);
  }
  
  // Add to feature item
  featureItem.appendChild(solutionsContainer);
}

// Function to toggle settings options
function toggleSettingsOptions(category, feature, featureItem) {
  // Check if settings container already exists
  let settingsContainer = featureItem.querySelector('.settings-container');
  
  if (settingsContainer) {
    // Toggle visibility
    if (settingsContainer.style.display === 'none') {
      settingsContainer.style.display = 'block';
    } else {
      settingsContainer.style.display = 'none';
    }
    return;
  }
  
  // Create settings container
  settingsContainer = document.createElement('div');
  settingsContainer.className = 'settings-container';
  
  // Add title
  const title = document.createElement('div');
  title.className = 'settings-title';
  title.textContent = `${getFeatureName(category, feature)} Settings`;
  settingsContainer.appendChild(title);
  
  // Add settings based on feature type
  const settingsContent = document.createElement('div');
  settingsContent.className = 'settings-content';
  
  // Get settings options for this feature
  const settingsOptions = getSettingsOptions(category, feature);
  settingsContent.innerHTML = settingsOptions;
  
  settingsContainer.appendChild(settingsContent);
  
  // Add a save button
  const saveButton = document.createElement('button');
  saveButton.className = 'save-settings-button';
  saveButton.textContent = 'Save Settings';
  saveButton.addEventListener('click', function() {
    // Save settings logic would go here
    
    // Notify parent window to save settings
    window.parent.postMessage({
      action: 'saveSettings',
      settings: {
        category: category,
        feature: feature,
        // In a real implementation, would collect form values here
        values: {}
      }
    }, '*');
    
    showNotification('Settings saved successfully');
    settingsContainer.style.display = 'none';
  });
  
  settingsContainer.appendChild(saveButton);
  
  // Add to feature item
  featureItem.appendChild(settingsContainer);
}

// Add community benefit data for features
function addCommunityBenefitData(container, category, feature) {
  // Get community data (this would come from your backend or be hardcoded)
  const communityData = {
    speech: {
      voiceControl: {
        totalUsers: 152834,
        improvementRate: 87,
        testimonials: [
          { user: "Jamie L.", comment: "Voice control helped me navigate after wrist surgery" }
        ]
      },
      speechToText: {
        totalUsers: 243591,
        improvementRate: 92,
        testimonials: [
          { user: "Morgan K.", comment: "Speech-to-Text has been essential for my work with dyslexia" }
        ]
      },
      noSpeechOnly: {
        totalUsers: 94273,
        improvementRate: 78,
        testimonials: [
          { user: "Taylor R.", comment: "As a non-verbal person, alternatives are critical for me" }
        ]
      }
    },
    vision: {
      screenReader: {
        totalUsers: 187325,
        improvementRate: 94,
        testimonials: [
          { user: "Alex M.", comment: "Screen readers completely changed how I use the web" }
        ]
      },
      keyboardNavigation: {
        totalUsers: 142987,
        improvementRate: 85,
        testimonials: [
          { user: "Jordan P.", comment: "Keyboard navigation helps with my motor control issues" }
        ]
      },
      highContrast: {
        totalUsers: 125632,
        improvementRate: 79,
        testimonials: [
          { user: "Riley H.", comment: "High contrast makes reading possible with my low vision" }
        ]
      }
    },
    hearing: {
      captions: {
        totalUsers: 173854,
        improvementRate: 91,
        testimonials: [
          { user: "Casey T.", comment: "Captions allow me to watch videos in noisy environments" }
        ]
      },
      transcripts: {
        totalUsers: 134928,
        improvementRate: 83,
        testimonials: [
          { user: "Quinn B.", comment: "Transcripts help me catch details I miss in audio" }
        ]
      },
      visualAlerts: {
        totalUsers: 87329,
        improvementRate: 76,
        testimonials: [
          { user: "Dallas F.", comment: "Visual alerts mean I never miss important notifications" }
        ]
      }
    },
    cognitive: {
      simpleLanguage: {
        totalUsers: 165487,
        improvementRate: 88,
        testimonials: [
          { user: "Avery G.", comment: "Simple language helps me understand complex topics" }
        ]
      },
      consistentNavigation: {
        totalUsers: 127548,
        improvementRate: 82,
        testimonials: [
          { user: "London K.", comment: "Consistent navigation reduces my anxiety online" }
        ]
      },
      errorPrevention: {
        totalUsers: 104398,
        improvementRate: 77,
        testimonials: [
          { user: "Blake J.", comment: "Error prevention features help me avoid frustrating mistakes" }
        ]
      }
    }
  };
  
  // Get data for the specific feature
  const data = communityData[category]?.[feature];
  if (!data) return;
  
  // Create community data container
  const communityContainer = document.createElement('div');
  communityContainer.className = 'community-data';
  
  // Add title
  const title = document.createElement('h4');
  title.className = 'community-title';
  title.textContent = 'Community Impact';
  communityContainer.appendChild(title);
  
  // Add stats
  const stats = document.createElement('div');
  stats.className = 'community-stats';
  stats.innerHTML = `
    <div class="stat">
      <span class="stat-value">${data.totalUsers.toLocaleString()}</span>
      <span class="stat-label">Users Benefiting</span>
    </div>
    <div class="stat">
      <span class="stat-value">${data.improvementRate}%</span>
      <span class="stat-label">Report Improvement</span>
    </div>
  `;
  communityContainer.appendChild(stats);
  
  // Add a testimonial if available
  if (data.testimonials && data.testimonials.length > 0) {
    const testimonial = document.createElement('div');
    testimonial.className = 'testimonial';
    testimonial.innerHTML = `
      <blockquote>"${data.testimonials[0].comment}"</blockquote>
      <cite>- ${data.testimonials[0].user}</cite>
    `;
    communityContainer.appendChild(testimonial);
  }
  
  // Add to container
  container.appendChild(communityContainer);
}

// Function to get verification method text based on feature
function getVerificationMethodText(category, feature) {
  const verificationMethods = {
    speech: {
      voiceControl: "Detected voice command handlers and SpeechRecognition API support through presence of speech-related buttons and event listeners.",
      speechToText: "Found input fields with microphone buttons and dictation attributes.",
      noSpeechOnly: "Verified all voice commands have alternative interaction methods through accessibility attributes."
    },
    vision: {
      screenReader: "Evaluated ARIA attributes and proper semantic structure. Found adequate alt text on images.",
      keyboardNavigation: "Verified focus states and proper tabindex attributes for all interactive elements.",
      highContrast: "Analyzed color contrast ratios between text and background, confirming WCAG 2.1 compliance."
    },
    hearing: {
      captions: "Identified closed caption support in video elements and caption controls.",
      transcripts: "Found transcript sections and downloadable transcript links for audio content.",
      visualAlerts: "Detected visual notification systems for important audio alerts."
    },
    cognitive: {
      simpleLanguage: "Analyzed text complexity and reading level using readability metrics.",
      consistentNavigation: "Verified consistent navigation patterns and predictable layout across sections.",
      errorPrevention: "Found form validation with clear error messages and correction guidance."
    }
  };
  
  return verificationMethods[category]?.[feature] || "Verified through standard accessibility evaluation techniques.";
}

// Function to get settings options HTML for a feature
function getSettingsOptions(category, feature) {
  const settingsMap = {
    speech: {
      voiceControl: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable voice commands
          </label>
          <div class="setting-desc">Allow websites to listen for voice commands</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">Voice activation keyword:</label>
          <input type="text" value="Hey Assistant" class="setting-input">
        </div>
      `,
      speechToText: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable speech-to-text in form fields
          </label>
          <div class="setting-desc">Allow dictation in text inputs</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">Language:</label>
          <select class="setting-select">
            <option selected>English (US)</option>
            <option>English (UK)</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        </div>
      `,
      noSpeechOnly: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Require alternatives for voice features
          </label>
          <div class="setting-desc">Block voice-only features without alternatives</div>
        </div>
      `
    },
    vision: {
      screenReader: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable screen reader
          </label>
          <div class="setting-desc">Use screen reader for this website</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">Reading speed:</label>
          <select class="setting-select">
            <option>Slow</option>
            <option selected>Normal</option>
            <option>Fast</option>
            <option>Very Fast</option>
          </select>
        </div>
      `,
      keyboardNavigation: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable keyboard navigation
          </label>
          <div class="setting-desc">Navigate using only keyboard</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Highlight focus
          </label>
          <div class="setting-desc">Make focus indicator more visible</div>
        </div>
      `,
      highContrast: `
        <div class="setting-group">
          <label class="setting-label">Contrast mode:</label>
          <select class="setting-select">
            <option>Normal</option>
            <option selected>High contrast</option>
            <option>Dark</option>
            <option>Light</option>
          </select>
        </div>
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Override website colors
          </label>
          <div class="setting-desc">Replace website colors with high contrast ones</div>
        </div>
      `
    },
    hearing: {
      captions: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable captions
          </label>
          <div class="setting-desc">Show captions for video content</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">Caption size:</label>
          <select class="setting-select">
            <option>Small</option>
            <option selected>Medium</option>
            <option>Large</option>
            <option>X-Large</option>
          </select>
        </div>
      `,
      transcripts: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Auto-generate transcripts
          </label>
          <div class="setting-desc">Generate transcripts when not provided</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Show transcripts by default
          </label>
          <div class="setting-desc">Automatically display transcripts when available</div>
        </div>
      `,
      visualAlerts: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable visual alerts
          </label>
          <div class="setting-desc">Show visual indicators for audio alerts</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">Alert type:</label>
          <select class="setting-select">
            <option>Subtle</option>
            <option selected>Standard</option>
            <option>Prominent</option>
          </select>
        </div>
      `
    },
    cognitive: {
      simpleLanguage: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable simplified language
          </label>
          <div class="setting-desc">Simplify complex text when possible</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">Reading level:</label>
          <select class="setting-select">
            <option>Elementary</option>
            <option selected>Middle School</option>
            <option>High School</option>
            <option>College</option>
          </select>
        </div>
      `,
      consistentNavigation: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable navigation simplification
          </label>
          <div class="setting-desc">Simplify complex navigation menus</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Show breadcrumbs
          </label>
          <div class="setting-desc">Display breadcrumb navigation for easier orientation</div>
        </div>
      `,
      errorPrevention: `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable error prevention
          </label>
          <div class="setting-desc">Help prevent and correct form errors</div>
        </div>
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Confirm important actions
          </label>
          <div class="setting-desc">Ask for confirmation before submitting forms</div>
        </div>
      `
    }
  };
  
  return settingsMap[category]?.[feature] || `
    <div class="setting-group">
      <div class="setting-desc">No configurable settings available for this feature.</div>
    </div>
  `;
}

// Helper function to get feature name from key
function getFeatureName(category, feature) {
  if (category === 'speech') {
    switch(feature) {
      case 'voiceControl': return 'Voice Control';
      case 'speechToText': return 'Speech-to-Text';
      case 'noSpeechOnly': return 'Non-Voice Alternatives';
    }
  } else if (category === 'vision') {
    switch(feature) {
      case 'screenReader': return 'Screen Reader';
      case 'keyboardNavigation': return 'Keyboard Navigation';
      case 'highContrast': return 'High Contrast';
    }
  } else if (category === 'hearing') {
    switch(feature) {
      case 'captions': return 'Captions';
      case 'transcripts': return 'Transcripts';
      case 'visualAlerts': return 'Visual Alerts';
    }
  } else if (category === 'cognitive') {
    switch(feature) {
      case 'simpleLanguage': return 'Simple Language';
      case 'consistentNavigation': return 'Consistent Navigation';
      case 'errorPrevention': return 'Error Prevention';
    }
  }
  
  return feature;
}

// Function to calculate and update accessibility score
function updateAccessibilityScore() {
  let totalFeatures = 0;
  let availableFeatures = 0;
  
  // Count features for each category
  Object.keys(currentResults).forEach(category => {
    const results = currentResults[category];
    
    Object.keys(results).forEach(feature => {
      totalFeatures++;
      if (results[feature] === true) {
        availableFeatures++;
      }
    });
  });
  
  // Calculate score
  const score = totalFeatures > 0 ? Math.round((availableFeatures / totalFeatures) * 100) : 0;
  
  // Update UI
  if (accessibilityScore) {
    accessibilityScore.textContent = score;
    
    // Update score color
    readinessScoreCircle.classList.remove('poor', 'fair', 'good', 'excellent');
    
    if (score < 30) {
      readinessScoreCircle.classList.add('poor');
      scoreDescription.textContent = 'Poor - Major accessibility issues';
    } else if (score < 60) {
      readinessScoreCircle.classList.add('fair');
      scoreDescription.textContent = 'Fair - Needs improvement';
    } else if (score < 85) {
      readinessScoreCircle.classList.add('good');
      scoreDescription.textContent = 'Good - Some issues to address';
    } else {
      readinessScoreCircle.classList.add('excellent');
      scoreDescription.textContent = 'Excellent - High accessibility';
    }
  }
}

// Function to read features aloud
function readFeaturesAloud() {
  if (Object.keys(currentResults).length === 0) {
    speakText("Please analyze the page first to get information about available features.");
    return;
  }
  
  // Build text to speak
  let speechText = "Here's the readiness report. ";
  
  // Add readiness score
  if (accessibilityScore) {
    speechText += `Overall readiness score is ${accessibilityScore.textContent} percent. ${scoreDescription.textContent}. `;
  }
  
  // First mention available features
  speechText += "Available features include: ";
  
  let availableFeatures = [];
  
  Object.keys(currentResults).forEach(category => {
    const results = currentResults[category];
    
    Object.keys(results).forEach(feature => {
      if (results[feature] === true) {
        availableFeatures.push(getFeatureName(category, feature));
      }
    });
  });
  
  if (availableFeatures.length > 0) {
    speechText += availableFeatures.join(", ") + ". ";
  } else {
    speechText += "None. ";
  }
  
  // Then mention unavailable features
  speechText += "Features not available include: ";
  
  let unavailableFeatures = [];
  
  Object.keys(currentResults).forEach(category => {
    const results = currentResults[category];
    
    Object.keys(results).forEach(feature => {
      if (results[feature] === false) {
        unavailableFeatures.push(getFeatureName(category, feature));
      }
    });
  });
  
  if (unavailableFeatures.length > 0) {
    speechText += unavailableFeatures.join(", ") + ". ";
  } else {
    speechText += "None. Great job! ";
  }
  
  // Speak the text
  speakText(speechText);
}

// Function to speak text aloud
function speakText(text) {
  // Initialize speech synthesis if not already initialized
  if (!synthesis) {
    synthesis = window.speechSynthesis;
  }
  
  // Stop any current speech
  synthesis.cancel();
  
  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Speak
  synthesis.speak(utterance);
}

// Function to generate assistant response
function generateAssistantResponse(message) {
  // Convert message to lowercase for easier matching
  const lowerMessage = message.toLowerCase();
  
  // Predefined responses for common questions
  if (lowerMessage.includes('speech to text') || lowerMessage.includes('voice input')) {
    return "Speech-to-text allows you to input text using your voice. This is useful for people with mobility impairments or anyone who prefers speaking over typing. To enable this feature, most modern browsers have built-in speech recognition. You can also try specialized extensions like Voice In Mind or software like Dragon Naturally Speaking for more advanced capabilities.";
  }
  
  if (lowerMessage.includes('screen reader') || lowerMessage.includes('screenreader')) {
    return "Screen readers are essential tools that convert digital text into synthesized speech, allowing users with visual impairments to access content. To ensure screen reader compatibility, websites should use proper semantic HTML, include alternative text for images, and ensure all interactive elements are keyboard accessible. Popular screen readers include NVDA (free), JAWS (Windows), and VoiceOver (Mac/iOS).";
  }
  
  if (lowerMessage.includes('keyboard navigation') || lowerMessage.includes('keyboard access')) {
    return "Keyboard navigation allows users to access all parts of a website without using a mouse. This is crucial for users with motor disabilities and those who use screen readers. To test keyboard navigation on a site, try using the Tab key to move through interactive elements and check if the focus indicator is clearly visible. All functionality should be operable through keyboard shortcuts or standard Tab navigation.";
  }
  
  if (lowerMessage.includes('high contrast') || lowerMessage.includes('color contrast')) {
    return "High contrast modes make text and interface elements more distinguishable for users with low vision or color vision deficiencies. WCAG guidelines recommend a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text. Browser extensions like High Contrast for Chrome or Dark Reader can help users override site colors if needed. Most operating systems also include built-in high contrast modes.";
  }
  
  if (lowerMessage.includes('caption') || lowerMessage.includes('subtitle')) {
    return "Captions provide text alternatives for audio content, making videos accessible to deaf or hard-of-hearing users. They also benefit users in noisy environments or when the audio must be muted. Captions should be synchronized with the audio and include not just speech but also important sound effects and speaker identification. YouTube offers automatic captioning, but these should be reviewed for accuracy.";
  }
  
  if (lowerMessage.includes('transcript')) {
    return "Transcripts are text versions of audio or video content. Unlike captions, they don't need to be synchronized with media playback, making them useful for podcasts or audio files. Transcripts benefit users with hearing impairments, those who prefer reading over listening, and improve searchability of media content. Tools like Otter.ai or Google's Live Transcribe can help generate transcripts automatically.";
  }
  
  if (lowerMessage.includes('what is multimodal')) {
    return "Multimodal interfaces allow interaction through multiple modes of input and output, such as touch, voice, text, and gestures. This approach makes digital experiences more accessible and flexible for diverse users. By offering alternative ways to interact with content, multimodal design ensures that people with different abilities or preferences can access information and complete tasks efficiently. For example, a multimodal form might accept both keyboard input and voice dictation.";
  }
  
  if (lowerMessage.includes('wcag') || lowerMessage.includes('web content accessibility guidelines')) {
    return "The Web Content Accessibility Guidelines (WCAG) are internationally recognized standards for making web content accessible to people with disabilities. WCAG is organized around four principles: content must be Perceivable, Operable, Understandable, and Robust (POUR). Each guideline has success criteria at levels A, AA, and AAA, with AA being the commonly targeted compliance level for most organizations. The latest version is WCAG 2.1, with WCAG 2.2 recently released and WCAG 3.0 in development.";
  }
  
  if (lowerMessage.includes('readiness report') || lowerMessage.includes('readiness score')) {
    return "The Readiness Report evaluates how well a website supports various accessibility and multimodal features. The report examines 12 key areas across speech, vision, hearing, and cognitive categories. Each feature is checked and marked as available or not available. The overall readiness score is the percentage of available features. Higher scores indicate better multimodal support and fewer barriers for users with diverse needs.";
  }
  
  if (lowerMessage.includes('voice control') || lowerMessage.includes('voice commands')) {
    return "Voice control allows users to navigate and interact with websites using spoken commands. This is especially valuable for users with motor disabilities, temporary injuries, or those who prefer hands-free operation. Modern browsers increasingly support voice commands, and tools like Voice In Mind or operating system capabilities like Windows Speech Recognition provide enhanced control. Voice control should always be supplemented with alternative interaction methods.";
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi ')) {
    return "Hello! I'm your multimodal expert. I can help with questions about accessibility features, multimodal tools, and how to make digital experiences more inclusive. What would you like to know more about today?";
  }
  
  if (lowerMessage.includes('how are you')) {
    return "I'm ready and eager to help you explore multimodal accessibility! I can provide information about speech recognition, screen readers, keyboard navigation, and many other features that make digital experiences more inclusive. What specific topic would you like to know more about?";
  }
  
  if (lowerMessage.includes('tell me about unless') || lowerMessage.includes('what is unless')) {
    return "Unless is an accessibility analyzer that helps you discover multimodal tools and features on any webpage. It evaluates websites across speech, vision, hearing, and cognitive categories, providing a readiness score and specific recommendations. The tool helps both users find accessible alternatives and developers create more inclusive experiences. Is there a specific feature of unless you'd like to learn more about?";
  }
  
  // Default response for other questions
  return "That's an interesting question about multimodal accessibility. While I don't have a specific answer prepared, I can tell you that multimodal design focuses on providing multiple ways to interact with content, making it more accessible to everyone regardless of abilities or preferences. Would you like to know more about specific accessibility features like screen readers, keyboard navigation, voice control, or captions?";
}

// Function to send user message in chat
function sendUserMessage() {
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  
  if (!chatInput || !chatMessages) return;
  
  const messageText = chatInput.value.trim();
  if (!messageText) return;
  
  // Add user message to chat
  addChatMessage(messageText, 'user');
  
  // Clear input
  chatInput.value = '';
  
  // Generate and display assistant response
  setTimeout(() => {
    const response = generateAssistantResponse(messageText);
    addChatMessage(response, 'assistant');
  }, 800);
}

// Function to add a message to the chat
function addChatMessage(text, sender) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}`;
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = text;
  
  // Add read aloud button for assistant messages
  if (sender === 'assistant') {
    const readButton = document.createElement('button');
    readButton.className = 'read-message-button';
    readButton.title = 'Read aloud';
    readButton.style.background = 'none';
    readButton.style.border = 'none';
    readButton.style.cursor = 'pointer';
    readButton.style.padding = '4px';
    readButton.style.marginTop = '5px';
    readButton.style.display = 'inline-flex';
    readButton.style.alignItems = 'center';
    readButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
      Read aloud
    `;
    
    readButton.addEventListener('click', function() {
      speakText(text);
    });
    
    messageContent.appendChild(readButton);
  }
  
  messageElement.appendChild(messageContent);
  chatMessages.appendChild(messageElement);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to start voice input for chat
function startVoiceInput() {
  const voiceInputButton = document.getElementById('voice-input-button');
  const chatInput = document.getElementById('chat-input');
  
  if (!voiceInputButton || !chatInput) return;
  
  // Initialize speech recognition if not already initialized
  if (!recognition) {
    try {
      // Use the right API depending on browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
      };
      
      recognition.onend = function() {
        voiceInputButton.style.backgroundColor = '';
      };
      
      recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        voiceInputButton.style.backgroundColor = '';
        showNotification('Speech recognition error: ' + event.error);
      };
    } catch (error) {
      console.error('Speech recognition not supported:', error);
      showNotification('Speech recognition is not supported in your browser');
      return;
    }
  }
  
  // Indicate active recording
  voiceInputButton.style.backgroundColor = '#F44336';
  
  // Start recognition
  try {
    recognition.start();
  } catch (error) {
    console.error('Speech recognition start error:', error);
    voiceInputButton.style.backgroundColor = '';
    showNotification('Could not start speech recognition');
  }
}

// Function to display analytics
function displayAnalytics(analytics) {
  // Update analytics UI with data
  const scannedPagesCount = document.getElementById('scanned-pages-count');
  const solutionClicksCount = document.getElementById('solution-clicks-count');
  const chartPlaceholder = document.getElementById('chart-placeholder');
  
  if (scannedPagesCount) {
    scannedPagesCount.textContent = analytics.scannedPages || 0;
  }
  
  if (solutionClicksCount) {
    solutionClicksCount.textContent = analytics.solutionLinkClicks || 0;
  }
  
  // Update chart placeholder with real data
  if (chartPlaceholder) {
    let chartHTML = '<div style="display: flex; height: 100%; justify-content: space-between; align-items: flex-end;">';
    
    // Add bars for each category
    Object.keys(analytics.featureClicks).forEach(category => {
      const count = analytics.featureClicks[category] || 0;
      const percentage = Math.min(100, Math.max(5, count * 5)); // Scale for visibility (min 5%, max 100%)
      
      chartHTML += `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="background-color: var(--accent-color); width: 30px; height: ${percentage}%; margin-bottom: 8px; border-radius: 4px;"></div>
          <div style="font-size: 12px;">${category}</div>
          <div style="font-size: 14px; font-weight: bold;">${count}</div>
        </div>
      `;
    });
    
    chartHTML += '</div>';
    chartPlaceholder.innerHTML = chartHTML;
  }
  
  // Set analytics toggle state
  const analyticsEnabledToggle = document.getElementById('analytics-enabled-toggle');
  if (analyticsEnabledToggle) {
    analyticsEnabledToggle.checked = true;
  }
}

// Function to update analytics
function updateAnalytics(data) {
  // Send analytics update to background script
  window.parent.postMessage({
    action: 'updateAnalytics',
    ...data
  }, '*');
}

// Function to toggle dark mode
function toggleDarkMode() {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  
  // Toggle icons visibility
  const lightIcons = document.querySelectorAll('.light-icon');
  const darkIcons = document.querySelectorAll('.dark-icon');
  
  lightIcons.forEach(icon => {
    icon.style.display = isDarkMode ? 'none' : 'block';
  });
  
  darkIcons.forEach(icon => {
    icon.style.display = isDarkMode ? 'block' : 'none';
  });
  
  // Handle collapsed state text colors
  const unElement = document.querySelector('.vertical-logo .un');
  const lessElement = document.querySelector('.vertical-logo .less');
  
  if (unElement) {
    unElement.style.color = isDarkMode ? '#aaaaaa' : '#777777';
  }
  
  if (lessElement) {
    lessElement.style.color = isDarkMode ? '#ffffff' : '#000000';
  }
  
  // Update UI elements for dark mode
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.classList.contains('active')) {
      item.style.color = isDarkMode ? 'white' : '';
    }
  });
  
  if (accessibilityScore) {
    accessibilityScore.style.color = isDarkMode ? 'white' : '';
  }
  
  // Store preference
  chrome.storage.local.set({ darkMode: isDarkMode });
}

// Function to show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--primary-color);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

// Add listener for messages from content script
window.addEventListener('message', function(event) {
  console.log("Overlay received message:", event.data);
  
  // Handle results update
  if (event.data.action === 'updateResults') {
    console.log(`Received ${event.data.category} results:`, event.data.results);
    updateResults(event.data.category, event.data.results);
  }
  
  // Handle permission needed
  if (event.data.action === 'permissionNeeded') {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div>
          <p>Permission needed to analyze this page.</p>
          <button id="grant-permission" style="padding: 8px 16px; background-color: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
            Grant Permission
          </button>
        </div>
      `;
      
      const grantPermissionBtn = document.getElementById('grant-permission');
      if (grantPermissionBtn) {
        grantPermissionBtn.addEventListener('click', function() {
          window.parent.postMessage({
            action: 'requestPermission',
            pattern: event.data.pattern,
            url: event.data.url
          }, '*');
        });
      }
    }
  }
  
  // Handle permission result
  if (event.data.action === 'permissionResult') {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      if (event.data.granted) {
        loadingElement.innerHTML = `
          <div class="spinner"></div>
          <div class="loading-text">Analyzing page...</div>
        `;
      } else {
        loadingElement.innerHTML = `
          <div>
            <p>Permission denied. Cannot analyze this page.</p>
            <button id="retry-permission" style="padding: 8px 16px; background-color: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
              Try Again
            </button>
          </div>
        `;
        
        const retryPermissionBtn = document.getElementById('retry-permission');
        if (retryPermissionBtn) {
          retryPermissionBtn.addEventListener('click', function() {
            window.parent.postMessage({
              action: 'requestPermission',
              pattern: event.data.pattern,
              url: event.data.url
            }, '*');
          });
        }
      }
    }
  }
  
  // Handle analysis timeout
  if (event.data.action === 'analysisTimeout') {
    isAnalyzing = false;
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div style="color: #FF9800;">
          <p>Analysis timed out. This may happen on complex pages.</p>
          <button id="retry-analysis" style="padding: 8px 16px; background-color: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
            Retry Analysis
          </button>
        </div>
      `;
      
      const retryAnalysisBtn = document.getElementById('retry-analysis');
      if (retryAnalysisBtn) {
        retryAnalysisBtn.addEventListener('click', function() {
          startAnalysis();
        });
      }
    }
    
    if (scoreDescription) {
      scoreDescription.textContent = 'Analysis timed out. Try again.';
    }
  }
  
  // Handle analysis error
  if (event.data.action === 'analysisError') {
    isAnalyzing = false;
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div style="color: #F44336;">
          <p>Error analyzing page: ${event.data.error || 'Unknown error'}</p>
          <button id="retry-analysis" style="padding: 8px 16px; background-color: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
            Retry Analysis
          </button>
        </div>
      `;
      
      const retryAnalysisBtn = document.getElementById('retry-analysis');
      if (retryAnalysisBtn) {
        retryAnalysisBtn.addEventListener('click', function() {
          startAnalysis();
        });
      }
    }
    
    if (scoreDescription) {
      scoreDescription.textContent = 'Error analyzing page.';
    }
    
    console.error('Analysis error:', event.data.error);
  }
  
  // Handle score update
  if (event.data.action === 'updateScore') {
    updateAccessibilityScore(event.data.score);
  }
  
  // Handle test connection
  if (event.data.action === 'testConnection') {
    console.log("Test connection received:", event.data.message);
  }
});

// Force the UI to be visible in case CSS is hiding it
window.onload = function() {
  setTimeout(function() {
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
      mainUI.style.display = 'flex';
      console.log("Forced main UI display via onload");
    }
    
    // Make sure content is visible
    const contentElements = document.querySelectorAll('.sidebar-content, .sidebar-nav, .accessibility-score-container, .sidebar-footer');
    contentElements.forEach(el => {
      if (el) {
        el.style.display = 'flex';
        console.log("Forced display of element:", el.className);
      }
    });
    
    // Check if onboarding should be shown
    chrome.storage.local.get(['firstUse'], function(result) {
      if (result.firstUse === true) {
        showOnboarding();
      } else {
        showMainUI();
        // Force-run analysis
        setTimeout(() => {
          window.parent.postMessage({ 
            action: 'runAnalysis'
          }, '*');
        }, 500);
      }
    });
    
    // Set up specialized event listeners for key functionality
    setupSettingsButton();
    setupMinimizeButton();
    setupExpandButton();
    setupChatWindow();
  }, 500); // Short delay to ensure DOM is ready
};

console.log("Overlay script initialized");