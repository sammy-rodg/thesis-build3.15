// Content script for unless Accessibility Analyzer

// Global variables
let overlayFrame = null;
let isOverlayVisible = false;

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "toggleOverlay") {
    if (isOverlayVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
    sendResponse({ success: true, visible: isOverlayVisible });
    return true;
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

// Create and show the overlay
function showOverlay() {
  console.log("Showing overlay");
  
  if (overlayFrame) {
    overlayFrame.style.display = 'block';
    isOverlayVisible = true;
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
    max-height: 90vh;
    border: none;
    z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    transition: all 0.3s ease;
    background-color: white;
  `;
  
  document.body.appendChild(overlayFrame);
  
  // Set visibility flag after frame is loaded
  overlayFrame.onload = function() {
    isOverlayVisible = true;
    console.log("Overlay frame loaded");
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
      action: "runAnalysis",
      tabId: chrome.runtime.id
    });
  }
  else if (message.action === "resizeOverlay") {
    if (message.state === "minimized") {
      // Set frame to minimized state
      overlayFrame.style.width = '70px';
      overlayFrame.style.height = '350px';
    } else if (message.state === "normal") {
      // Restore to normal size and position
      overlayFrame.style.width = '280px';
      overlayFrame.style.height = '600px';
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
    
    // Set new position
    frame.style.top = (frame.offsetTop - pos2) + "px";
    frame.style.right = 'auto'; // Clear right positioning if set
    frame.style.left = (frame.offsetLeft - pos1) + "px";
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

console.log("Content script loaded");