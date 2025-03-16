// Function to export readiness report
function exportReadinessReport() {
  if (Object.keys(currentResults).length === 0) {
    showNotification("Please analyze the page first to generate a report");
    return;
  }
  
  // Build report content
  let report = `# Accessibility Readiness Report\n\n`;
  report += `**Date:** ${new Date().toLocaleDateString()}\n`;
  report += `**URL:** ${window.parent.location.href}\n\n`;
  
  report += `## Overall Score: ${accessibilityScore.textContent}%\n`;
  report += `**Status:** ${scoreDescription.textContent}\n\n`;
  
  // Add category reports
  const categories = ['speech', 'vision', 'hearing', 'cognitive'];
  categories.forEach(category => {
    if (currentResults[category]) {
      const results = currentResults[category];
      
      report += `## ${capitalizeFirstLetter(category)} Features\n\n`;
      
      Object.keys(results).forEach(feature => {
        const status = results[feature] ? '✓ Available' : '✗ Not Available';
        report += `### ${getFeatureName(category, feature)}: ${status}\n`;
        
        // Add verification method for available features
        if (results[feature]) {
          report += `**Verification:** ${getVerificationMethodText(category, feature)}\n\n`;
        } else {
          // Add recommendations for unavailable features
          const solutions = solutionsData[category] && solutionsData[category][feature];
          if (solutions && solutions.length > 0) {
            report += `**Recommendations:**\n`;
            solutions.forEach(solution => {
              report += `- ${solution.title}: ${solution.description}\n`;
            });
            report += '\n';
          }
        }
      });
    }
  });
  
  // Create and download the report file
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'accessibility-report.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification("Report downloaded successfully");
}

// Function to export solutions report
function exportSolutionsReport() {
  if (Object.keys(currentResults).length === 0) {
    showNotification("Please analyze the page first to generate solutions");
    return;
  }
  
  // Build solutions content
  let solutions = `# Accessibility Solutions Report\n\n`;
  solutions += `**Date:** ${new Date().toLocaleDateString()}\n`;
  solutions += `**URL:** ${window.parent.location.href}\n\n`;
  
  // Find missing features
  const categories = ['speech', 'vision', 'hearing', 'cognitive'];
  let hasMissingFeatures = false;
  
  categories.forEach(category => {
    if (currentResults[category]) {
      const results = currentResults[category];
      const missingFeatures = Object.keys(results).filter(feature => !results[feature]);
      
      if (missingFeatures.length > 0) {
        hasMissingFeatures = true;
        solutions += `## ${capitalizeFirstLetter(category)} Solutions\n\n`;
        
        missingFeatures.forEach(feature => {
          solutions += `### ${getFeatureName(category, feature)}\n\n`;
          
          const featureSolutions = solutionsData[category] && solutionsData[category][feature];
          if (featureSolutions && featureSolutions.length > 0) {
            featureSolutions.forEach((solution, index) => {
              solutions += `${index + 1}. **${solution.title}**\n`;
              solutions += `   ${solution.description}\n`;
              solutions += `   Link: ${solution.link}\n`;
              if (solution.tags && solution.tags.length > 0) {
                solutions += `   Tags: ${solution.tags.join(', ')}\n`;
              }
              solutions += '\n';
            });
          } else {
            solutions += `No specific solutions available for this feature.\n\n`;
          }
        });
      }
    }
  });
  
  if (!hasMissingFeatures) {
    solutions += `## Great News!\n\nAll accessibility features have been detected on this page. No specific solutions are needed at this time.\n\n`;
  }
  
  solutions += `## Additional Resources\n\n`;
  solutions += `- [W3C Web Accessibility Initiative](https://www.w3.org/WAI/)\n`;
  solutions += `- [WebAIM](https://webaim.org/)\n`;
  solutions += `- [A11Y Project](https://www.a11yproject.com/)\n`;
  
  // Create and download the solutions file
  const blob = new Blob([solutions], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'accessibility-solutions.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification("Solutions report downloaded successfully");
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Listen for messages from parent window
window.addEventListener('message', function(event) {
  console.log("Overlay received message:", event.data);
  
  const message = event.data;
  
  if (message.action === 'updateResults') {
    // Update results for a category
    updateResults(message.category, message.results);
  }
  else if (message.action === 'analysisTimeout') {
    // Analysis timed out
    loadingElement.style.display = 'none';
    showNotification("Analysis timed out. The page may be too complex or slow to respond.");
  }
  else if (message.action === 'analysisError') {
    // Analysis error
    loadingElement.style.display = 'none';
    showNotification(`Analysis error: ${message.error || 'Unknown error'}`);
  }
  else if (message.action === 'permissionNeeded') {
    // Need permission to access site
    loadingElement.style.display = 'none';
    
    // Show permission request
    const permissionText = `Permission needed to analyze ${message.url}`;
    showNotification(permissionText);
    
    // Create permission request in UI
    const permissionRequest = document.createElement('div');
    permissionRequest.className = 'permission-request';
    permissionRequest.innerHTML = `
      <div class="permission-message">${permissionText}</div>
      <button class="grant-permission-button">Grant Permission</button>
    `;
    
    // Add to loading area
    loadingElement.innerHTML = '';
    loadingElement.style.display = 'flex';
    loadingElement.appendChild(permissionRequest);
    
    // Add event listener for grant button
    permissionRequest.querySelector('.grant-permission-button').addEventListener('click', function() {
      // Request permission from background script
      chrome.runtime.sendMessage({
        action: 'requestPermission',
        pattern: message.pattern,
        url: message.url
      });
      
      // Update UI
      loadingElement.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">Requesting permission...</div>
      `;
    });
  }
  else if (message.action === 'permissionResult') {
    if (message.granted) {
      // Permission granted, show analyzing screen
      loadingElement.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">Analyzing page...</div>
      `;
    } else {
      // Permission denied
      loadingElement.style.display = 'none';
      showNotification("Permission denied. Cannot analyze page.");
    }
  }
});

// Set up drag handle functionality
const dragHandle = document.getElementById('drag-handle');
if (dragHandle) {
  dragHandle.addEventListener('mousedown', function(e) {
    window.parent.postMessage({
      action: 'dragHandleMouseDown',
      clientX: e.clientX,
      clientY: e.clientY
    }, '*');
  });
}

// Initialize by hiding loading until analyze button is clicked
loadingElement.style.display = 'none';
});// Overlay script for unless Accessibility Analyzer

document.addEventListener('DOMContentLoaded', function() {
console.log("Overlay DOM loaded");

// DOM elements
const closeButton = document.getElementById('closeButton');
const minimizeButton = document.getElementById('minimizeButton');
const expandButton = document.querySelector('.expand-button');
const analyzeButton = document.getElementById('analyzeButton');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const loadingElement = document.getElementById('loading');
const accessibilityScore = document.getElementById('accessibility-score');
const scoreDescription = document.getElementById('score-description');
const readinessScoreCircle = document.getElementById('readiness-score-circle');
const exportButton = document.getElementById('export-report');
const sidebarContainer = document.querySelector('.sidebar-container');
const tellMeButton = document.getElementById('tell-me-button');

// Settings Panel Elements
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const exportSolutions = document.getElementById('export-solutions');
const viewAnalytics = document.getElementById('view-analytics');
const contactSamantha = document.getElementById('contact-samantha');
const themeToggle = document.getElementById('toggle-theme');
const themeToggleButton = document.getElementById('theme-toggle');

// Analytics Panel Elements
const analyticsPanel = document.getElementById('analytics-panel');
const closeAnalytics = document.getElementById('close-analytics');
const scannedPagesCount = document.getElementById('scanned-pages-count');
const solutionClicksCount = document.getElementById('solution-clicks-count');
const featureCategoryChart = document.getElementById('feature-category-chart');
const analyticsEnabledToggle = document.getElementById('analytics-enabled-toggle');

// Chat Elements
const chatIconButton = document.getElementById('chat-icon-button');
const chatPanel = document.getElementById('chat-panel');
const minimizeChat = document.getElementById('minimize-chat');
const closeChat = document.getElementById('close-chat');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageButton = document.getElementById('send-message');
const voiceInputButton = document.getElementById('voice-input-button');

// Speech Recognition
let recognition;
let synthesis;

// Current results storage
let currentResults = {};

// Solutions data storage
let solutionsData = {};

// Analytics data
let analyticsData = {
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

// Load solutions data
fetch(chrome.runtime.getURL('solutions-data.json'))
  .then(response => response.json())
  .then(data => {
    console.log("Solutions data loaded");
    solutionsData = data;
  })
  .catch(error => {
    console.error("Error loading solutions data:", error);
  });

// Initialize functionality
initializeTheme();
loadAnalyticsData();

// Close button event listener
closeButton.addEventListener('click', function() {
  window.parent.postMessage({ action: 'closeOverlay' }, '*');
});

// Minimize button event listener
minimizeButton.addEventListener('click', function() {
  sidebarContainer.classList.add('collapsed');
  window.parent.postMessage({ 
    action: 'resizeOverlay',
    state: 'minimized'
  }, '*');
});

// Expand button event listener
expandButton.addEventListener('click', function() {
  sidebarContainer.classList.remove('collapsed');
  window.parent.postMessage({ 
    action: 'resizeOverlay',
    state: 'normal'
  }, '*');
});

// Settings toggle event listener
settingsToggle.addEventListener('click', function() {
  settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  analyticsPanel.style.display = 'none'; // Hide analytics panel
});

// Hide settings panel when clicking outside
document.addEventListener('click', function(event) {
  if (!settingsPanel.contains(event.target) && event.target !== settingsToggle) {
    settingsPanel.style.display = 'none';
  }
  
  if (!analyticsPanel.contains(event.target) && event.target !== viewAnalytics) {
    analyticsPanel.style.display = 'none';
  }
});

// Settings menu items
exportSolutions.addEventListener('click', function() {
  exportSolutionsReport();
  settingsPanel.style.display = 'none';
  updateAnalytics({ exportReport: true });
});

viewAnalytics.addEventListener('click', function() {
  settingsPanel.style.display = 'none';
  analyticsPanel.style.display = 'block';
  loadAnalyticsData();
});

closeAnalytics.addEventListener('click', function() {
  analyticsPanel.style.display = 'none';
});

analyticsEnabledToggle.addEventListener('change', function() {
  const userPrefs = {
    userAnalytics: this.checked
  };
  chrome.runtime.sendMessage({ 
    action: "savePreferences", 
    preferences: userPrefs 
  });
  
  showNotification(this.checked ? 
    "Analytics collection enabled" : 
    "Analytics collection disabled");
});

contactSamantha.addEventListener('click', function() {
  showNotification("Contacting Samantha...");
  settingsPanel.style.display = 'none';
  // In a real implementation, this would open an email or contact form
  window.open('mailto:samantha@unless.com?subject=Unless Support Request', '_blank');
});

// Theme toggle in settings
themeToggle.addEventListener('click', function() {
  toggleTheme();
  settingsPanel.style.display = 'none';
});

// Theme toggle button
themeToggleButton.addEventListener('click', function() {
  toggleTheme();
});

// Analyze button event listener
analyzeButton.addEventListener('click', function() {
  // Show loading state
  loadingElement.style.display = 'flex';
  loadingElement.querySelector('.loading-text').textContent = 'Analyzing page...';
  
  // Request analysis
  window.parent.postMessage({ action: 'runAnalysis' }, '*');
});

// Tab switching functionality
navItems.forEach(item => {
  item.addEventListener('click', () => {
    // Remove active class from all items
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // Add active class to clicked item
    item.classList.add('active');
    
    // Get the tab name
    const tabName = item.getAttribute('data-tab');
    
    // Hide all tab content
    tabContents.forEach(content => {
      content.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-content`);
    if (selectedTab) {
      selectedTab.classList.add('active');
      
      // Update analytics
      updateAnalytics({ category: tabName });
    }
  });
});

// Export button event listener
exportButton.addEventListener('click', function() {
  exportReadinessReport();
  updateAnalytics({ exportReport: true });
});

// Tell Me Button event listener
tellMeButton.addEventListener('click', function() {
  readFeaturesAloud();
});

// Chat Icon Button event listener
chatIconButton.addEventListener('click', function() {
  chatPanel.style.display = 'flex';
});

// Minimize Chat Button event listener
minimizeChat.addEventListener('click', function() {
  chatPanel.style.display = 'none';
});

// Close Chat Button event listener
closeChat.addEventListener('click', function() {
  chatPanel.style.display = 'none';
});

// Send message button event listener
sendMessageButton.addEventListener('click', function() {
  sendUserMessage();
});

// Send message on Enter key
chatInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendUserMessage();
  }
});

// Voice input button event listener
voiceInputButton.addEventListener('click', function() {
  startVoiceInput();
});

// Function to initialize theme based on saved preference
function initializeTheme() {
  chrome.storage.local.get(['theme'], function(result) {
    if (result.theme === 'dark') {
      document.body.classList.add('dark-mode');
      updateThemeIcons(true);
    } else {
      document.body.classList.remove('dark-mode');
      updateThemeIcons(false);
    }
  });
}

// Function to load analytics data
function loadAnalyticsData() {
  chrome.runtime.sendMessage({ action: "getAnalytics" }, function(response) {
    if (response && response.analytics) {
      analyticsData = response.analytics;
      
      // Update UI
      scannedPagesCount.textContent = analyticsData.scannedPages;
      solutionClicksCount.textContent = analyticsData.solutionLinkClicks;
      
      // Simple chart rendering
      renderCategoryChart();
    }
  });
  
  // Also get user preferences to check if analytics is enabled
  chrome.storage.local.get(['userPreferences'], function(result) {
    if (result.userPreferences && result.userPreferences.userAnalytics !== undefined) {
      analyticsEnabledToggle.checked = result.userPreferences.userAnalytics;
    }
  });
}

// Function to render a simple category chart
function renderCategoryChart() {
  const categories = ['speech', 'vision', 'hearing', 'cognitive'];
  const colors = ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0'];
  
  // Clear previous chart
  featureCategoryChart.innerHTML = '';
  
  // Create simple bar chart
  const chartContainer = document.createElement('div');
  chartContainer.style.display = 'flex';
  chartContainer.style.alignItems = 'flex-end';
  chartContainer.style.justifyContent = 'space-between';
  chartContainer.style.height = '100%';
  
  // Find the max value for scaling
  const maxValue = Math.max(
    ...categories.map(cat => analyticsData.featureClicks[cat])
  );
  
  // Create bars
  categories.forEach((category, index) => {
    const count = analyticsData.featureClicks[category];
    const barHeight = maxValue > 0 ? (count / maxValue * 100) : 0;
    
    const barContainer = document.createElement('div');
    barContainer.style.display = 'flex';
    barContainer.style.flexDirection = 'column';
    barContainer.style.alignItems = 'center';
    barContainer.style.width = '20%';
    
    const bar = document.createElement('div');
    bar.style.width = '80%';
    bar.style.backgroundColor = colors[index];
    bar.style.height = `${barHeight}%`;
    bar.style.minHeight = '1px';
    bar.style.borderRadius = '3px 3px 0 0';
    
    const label = document.createElement('div');
    label.textContent = category;
    label.style.fontSize = '10px';
    label.style.marginTop = '5px';
    label.style.textTransform = 'capitalize';
    
    const value = document.createElement('div');
    value.textContent = count;
    value.style.fontSize = '12px';
    value.style.fontWeight = 'bold';
    value.style.marginTop = '3px';
    
    barContainer.appendChild(bar);
    barContainer.appendChild(label);
    barContainer.appendChild(value);
    
    chartContainer.appendChild(barContainer);
  });
  
  featureCategoryChart.appendChild(chartContainer);
}

// Function to update analytics
function updateAnalytics(data) {
  chrome.runtime.sendMessage({
    action: "updateAnalytics",
    category: data.category,
    solutionLinkClicked: data.solutionLinkClicked,
    exportReport: data.exportReport
  });
}

// Function to toggle theme
function toggleTheme() {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  updateThemeIcons(isDarkMode);
  
  // Save theme preference
  chrome.storage.local.set({ theme: isDarkMode ? 'dark' : 'light' });
}

// Function to update theme icons
function updateThemeIcons(isDarkMode) {
  const lightIcons = document.querySelectorAll('.light-icon');
  const darkIcons = document.querySelectorAll('.dark-icon');
  
  lightIcons.forEach(icon => {
    icon.style.display = isDarkMode ? 'none' : 'block';
  });
  
  darkIcons.forEach(icon => {
    icon.style.display = isDarkMode ? 'block' : 'none';
  });
}

// Function to update results in UI
function updateResults(category, results) {
  console.log("Updating results for category:", category, results);
  
  // Store results
  currentResults[category] = results;
  
  // Hide loading state
  loadingElement.style.display = 'none';
  
  // Update tab content based on category
  const tabContent = document.getElementById(`${category}-content`);
  if (tabContent) {
    // Clear previous results
    tabContent.innerHTML = '';
    
    // Create category section
    const categorySection = document.createElement('div');
    categorySection.className = 'feature-category';
    
    // Add features based on category
    if (category === 'speech') {
      displaySpeechFeatures(categorySection, results);
    } else if (category === 'vision') {
      displayVisionFeatures(categorySection, results);
    } else if (category === 'hearing') {
      displayHearingFeatures(categorySection, results);
    } else if (category === 'cognitive') {
      displayCognitiveFeatures(categorySection, results);
    }
    
    // Add to tab content
    tabContent.appendChild(categorySection);
  }
  
  // Calculate and update overall score
  updateAccessibilityScore();
}

// Function to display speech features
function displaySpeechFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Speech Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Voice Control Support', results.voiceControl, 
    'Ability to control the website using voice commands and voice assistants.',
    'speech', 'voiceControl');
  
  addFeatureItem(container, 'Speech-to-Text Input', results.speechToText,
    'Ability to use voice input for text fields, forms, and other interactive elements.',
    'speech', 'speechToText');
  
  addFeatureItem(container, 'Non-Voice Alternatives', results.noSpeechOnly,
    'All voice-controlled features have alternative methods of interaction.',
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
  addFeatureItem(container, 'Screen Reader Compatibility', results.screenReader,
    'Content is properly structured for screen readers and other assistive technologies.',
    'vision', 'screenReader');
  
  addFeatureItem(container, 'Keyboard Navigation', results.keyboardNavigation,
    'All functionality is accessible using keyboard-only navigation.',
    'vision', 'keyboardNavigation');
  
  addFeatureItem(container, 'High Contrast', results.highContrast,
    'Text and interactive elements have sufficient color contrast for readability.',
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