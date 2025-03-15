// Content script for unless Accessibility Analyzer

// Global variables
let overlayFrame = null;
let isOverlayVisible = false;

// Initialize when content script loads
console.log("Unless content script initialized");

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "toggleOverlay") {
    try {
      if (isOverlayVisible) {
        hideOverlay();
      } else {
        showOverlay();
      }
      sendResponse({ success: true, visible: isOverlayVisible });
    } catch (error) {
      console.error("Error toggling overlay:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;  // Keep the message channel open for async response
  } 
  else if (message.action === "updateResults" || 
           message.action === "analysisTimeout" || 
           message.action === "analysisError" ||
           message.action === "permissionNeeded" ||
           message.action === "permissionResult") {
    // Forward results to the overlay
    if (overlayFrame && isOverlayVisible) {
      overlayFrame.contentWindow.postMessage(message, "*");
    }
    return true;
  }
});

// Debug and fix overlay function
function debugAndFixOverlay() {
  console.log("Debugging overlay issues...");
  
  // Check if overlay frame exists
  if (!overlayFrame) {
    console.error("Overlay frame is null");
    // Try to recreate it
    showOverlay();
    return;
  }
  
  // Force visibility on the frame
  overlayFrame.style.display = 'block';
  
  try {
    // Try to access the overlay document to check if it's loaded
    const overlayDoc = overlayFrame.contentDocument || overlayFrame.contentWindow.document;
    
    // Check if main UI is visible
    const mainUI = overlayDoc.getElementById('main-ui');
    if (mainUI && mainUI.style.display === 'none') {
      console.log("Forcing main UI to display");
      mainUI.style.display = 'flex';
    }
    
    // Send a test message to the overlay
    overlayFrame.contentWindow.postMessage({
      action: "testConnection",
      message: "Testing overlay connection"
    }, "*");
    
    // Force-run analysis
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "runAnalysis"
      });
    }, 1000);
    
  } catch (e) {
    console.error("Error accessing overlay document:", e);
  }
}

// Create and show the overlay
function showOverlay() {
  console.log("Showing overlay");
  
  if (overlayFrame) {
    overlayFrame.style.display = 'block';
    isOverlayVisible = true;
    
    // Try to force analysis to run
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "runAnalysis"
      });
    }, 1000);
    
    return;
  }

  // Create iframe to contain our overlay UI
  overlayFrame = document.createElement('iframe');
  overlayFrame.id = 'accessibility-analyzer-overlay';
  overlayFrame.src = chrome.runtime.getURL('overlay.html');
  
  // Set up styles for the overlay
  overlayFrame.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 280px;
    height: 600px;
    max-height: calc(100vh - 40px);
    border: none;
    z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    transition: all 0.3s ease;
    background-color: white;
    overflow: visible !important;
  `;
  
  document.body.appendChild(overlayFrame);
  
  // Set visibility flag after frame is loaded
  overlayFrame.onload = function() {
    isOverlayVisible = true;
    console.log("Overlay frame loaded");
    
    // Auto-run analysis after overlay is loaded
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "runAnalysis"
      });
    }, 1000);
  };
  
  // Make the overlay draggable
  makeFrameDraggable(overlayFrame);
  
  // Listen for messages from the iframe
  window.addEventListener('message', handleFrameMessages);
}

// Hide the overlay
function hideOverlay() {
  console.log("Hiding overlay");
  if (overlayFrame) {
    overlayFrame.style.display = 'none';
    isOverlayVisible = false;
  }
}

// Handle messages from the iframe
function handleFrameMessages(event) {
  // Make sure message is from our overlay
  if (!overlayFrame || event.source !== overlayFrame.contentWindow) return;
  
  console.log("Received message from overlay:", event.data);
  
  const message = event.data;
  
  if (message.action === "closeOverlay") {
    hideOverlay();
  }
  else if (message.action === "runAnalysis") {
    // Forward to background script
    chrome.runtime.sendMessage({
      action: "runAnalysis"
    });
  }
  else if (message.action === "resizeOverlay") {
    if (message.state === "minimized") {
      // Set frame to minimized state
      overlayFrame.style.width = '70px';
      overlayFrame.style.height = '350px';
      overlayFrame.style.borderRadius = '40px';
    } else if (message.state === "normal") {
      // Restore to normal size and position
      overlayFrame.style.width = '280px';
      overlayFrame.style.height = '600px';
      overlayFrame.style.borderRadius = '12px';
    }
  }
  else if (message.action === "saveSettings") {
    // Forward settings to background script
    chrome.runtime.sendMessage({
      action: "saveSettings",
      settings: message.settings
    });
  }
  else if (message.action === "updateAnalytics") {
    // Forward analytics update to background script
    chrome.runtime.sendMessage(message);
  }
  else if (message.action === "onboardingComplete") {
    // Forward onboarding completion to background script
    chrome.runtime.sendMessage({
      action: "onboardingComplete",
      preferences: message.preferences
    });
    
    // Run analysis after onboarding
    chrome.runtime.sendMessage({
      action: "runAnalysis"
    });
  }
  else if (message.action === "requestPermission") {
    // Forward permission request to background script
    chrome.runtime.sendMessage(message);
  }
}

// Make the overlay draggable
function makeFrameDraggable(frame) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let isDragging = false;
  
  // Listen for messages from iframe to start dragging
  window.addEventListener('message', function(e) {
    if (e.data.action === 'dragHandleMouseDown') {
      // Start dragging
      isDragging = true;
      pos3 = e.data.clientX;
      pos4 = e.data.clientY;
      
      // Prevent any weird iframe interactions while dragging
      frame.style.pointerEvents = 'none';
      
      // Create overlay for dragging
      const overlay = document.createElement('div');
      overlay.id = 'accessibility-overlay-drag-cover';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2147483646;
        cursor: grabbing;
        background: transparent;
      `;
      document.body.appendChild(overlay);
    }
  });
  
  // Mouse move event for dragging
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Make sure frame stays within viewport bounds
    const newTop = Math.max(0, Math.min(window.innerHeight - 100, frame.offsetTop - pos2));
    const newLeft = Math.max(0, Math.min(window.innerWidth - 70, frame.offsetLeft - pos1));
    
    // Set new position
    frame.style.top = newTop + "px";
    frame.style.right = 'auto'; // Clear right positioning if set
    frame.style.left = newLeft + "px";
  });
  
  // Mouse up event to stop dragging
  document.addEventListener('mouseup', function() {
    if (!isDragging) return;
    
    // Stop dragging
    isDragging = false;
    frame.style.pointerEvents = 'auto';
    const cover = document.getElementById('accessibility-overlay-drag-cover');
    if (cover) cover.remove();
  });
}

// Fix for chat window position when opened
function ensureChatWindowVisible() {
  if (!overlayFrame || !isOverlayVisible) return;
  
  try {
    const overlayDoc = overlayFrame.contentDocument || overlayFrame.contentWindow.document;
    const chatPanel = overlayDoc.getElementById('chat-panel');
    
    if (chatPanel && chatPanel.style.display === 'flex') {
      // Make sure chat panel is properly positioned
      chatPanel.style.position = 'fixed';
      chatPanel.style.zIndex = '9999';
      chatPanel.style.width = '280px';
      chatPanel.style.height = '450px';
      chatPanel.style.maxHeight = '70vh';
      chatPanel.style.right = '20px';
      chatPanel.style.bottom = '80px';
      chatPanel.style.overflow = 'hidden';
    }
  } catch (e) {
    console.log("Chat window adjustment error:", e);
  }
}

// Check chat window periodically
setInterval(ensureChatWindowVisible, 1000);