export default function detectHearingFeatures() {
    // Results structure for hearing features
    const results = {
      captions: false,
      transcripts: false,
      visualAlerts: false
    };
    
    // ======== CAPTIONS DETECTION ========
    
    function checkCaptions() {
      // Check for video elements with tracks
      const videos = document.querySelectorAll('video');
      const videosWithCaptions = document.querySelectorAll('video > track[kind="captions"], video > track[kind="subtitles"]');
      
      // Check for YouTube embedded videos
      const youtubeIframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]');
      
      // Check for caption buttons or controls
      const captionControls = document.querySelectorAll(
        '[class*="caption"], [class*="subtitle"], [id*="caption"], [id*="subtitle"], ' +
        'button[aria-label*="caption"], button[aria-label*="subtitle"], ' +
        '[data-track-kind="captions"], [data-track-kind="subtitles"]'
      );
      
      // Check for video.js or other popular video players that support captions
      const videoPlayers = document.querySelectorAll(
        '.video-js, .jwplayer, .vjs-control-bar, .mejs__container, ' +
        '[class*="player"][class*="caption"], [class*="player"][class*="subtitle"]'
      );
      
      // If we have videos and any indicators of captions
      if (videos.length > 0) {
        if (videosWithCaptions.length > 0) {
          return true;
        }
      }
      
      // YouTube embeds often have caption capability
      if (youtubeIframes.length > 0 && (captionControls.length > 0 || videoPlayers.length > 0)) {
        return true;
      }
      
      // The presence of caption controls strongly suggests caption availability
      if (captionControls.length > 0) {
        return true;
      }
      
      return false;
    }
    
    // ======== TRANSCRIPTS DETECTION ========
    
    function checkTranscripts() {
      // Check for audio elements
      const audioElements = document.querySelectorAll('audio');
      
      // Check for podcast players
      const podcastPlayers = document.querySelectorAll(
        '[class*="podcast"], [id*="podcast"], [class*="audio-player"], [id*="audio-player"]'
      );
      
      // Check for transcript sections
      const transcriptSections = document.querySelectorAll(
        '[class*="transcript"], [id*="transcript"], [aria-label*="transcript"], ' +
        'section:contains("Transcript"), div:contains("Transcript"), h2:contains("Transcript"), ' +
        'h3:contains("Transcript"), h4:contains("Transcript")'
      );
      
      // Check for download transcript links
      const transcriptLinks = document.querySelectorAll(
        'a:contains("transcript"), a[href*="transcript"], a[download*="transcript"], ' +
        'a[aria-label*="transcript"], button:contains("transcript")'
      );
      
      // If we have audio elements and transcript indicators
      if ((audioElements.length > 0 || podcastPlayers.length > 0) && 
          (transcriptSections.length > 0 || transcriptLinks.length > 0)) {
        return true;
      }
      
      // Strong indicators of transcript availability
      if (transcriptSections.length > 0) {
        return true;
      }
      
      return false;
    }
    
    // ======== VISUAL ALERTS DETECTION ========
    
    function checkVisualAlerts() {
      // Check for notification elements
      const notifications = document.querySelectorAll(
        '[role="alert"], [aria-live="assertive"], [aria-live="polite"], ' +
        '.alert, .notification, .toast, [class*="alert"], [class*="notification"], ' +
        '[id*="alert"], [id*="notification"]'
      );
      
      // Check for flashing elements or animations for notifications
      const animatedAlerts = document.querySelectorAll(
        '.animated, .animation, .flash, [class*="animate"], [class*="flash"], ' +
        '[class*="blink"], [class*="pulse"]'
      );
      
      // Check for icon indicators
      const visualIndicators = document.querySelectorAll(
        '.badge, .indicator, [class*="badge"], [class*="indicator"], ' +
        '[class*="icon"][class*="notification"], [class*="status-icon"]'
      );
      
      // Combined score for visual alerts
      const visualAlertScore = notifications.length + 
                              (animatedAlerts.length > 0 ? 1 : 0) + 
                              (visualIndicators.length > 0 ? 1 : 0);
      
      return visualAlertScore >= 2; // At least 2 indicators of visual alerts
    }
    
    // Run all checks
    results.captions = checkCaptions();
    results.transcripts = checkTranscripts();
    results.visualAlerts = checkVisualAlerts();
    
    // Send results back to background script
    chrome.runtime.sendMessage({
      action: "analysisResults",
      category: "hearing",
      results: results
    });
    
    return results;
  }