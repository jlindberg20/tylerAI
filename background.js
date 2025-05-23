// CREATE THE OAUTH AND THE GMAIL FETCH
// MAY 21 2025

let originalTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log("TylerAI extension installed!");
});

async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// Unified message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "transcriptionReady") {
    // Store in memory or just relay
    console.log("📨 Background received transcription:", message.transcription);
  
    // Relay to popup if open
    chrome.runtime.sendMessage({
      action: "transcriptionReady",
      transcription: message.transcription
    });
  }
  
  if (message.action === "gptResponseReady") {
    console.log("📨 Background received GPT response:", message.gptResponse);
  
    // Relay to popup if open
    chrome.runtime.sendMessage({
      action: "gptResponseReady",
      gptResponse: message.gptResponse
    });
  }
  
    if (message.action === "requestMicPermissionWithReturn") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTabId = tabs[0].id;
          chrome.storage.local.set({ tylerAIOriginTabId: activeTabId }, () => {
            chrome.tabs.create({ url: chrome.runtime.getURL("permission/mic.html") });
          });
        });
      }

      if (message.action === "micPermissionGranted") {
        chrome.runtime.sendMessage({action: "micReady"});
      }

  if (message.action === "fetchEmails") {
    fetchRecentEmails().then((emails) => sendResponse({ emails }));
    return true; // Needed for async response
  }
});

// fetch recent emails using the Gmail API
async function fetchRecentEmails() {
  try {
    const token = await getAuthToken();
    const response = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages?q=in:inbox+category:primary&maxResults=20',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    const emails = await Promise.all(
      (data.messages || []).map(async (msg) => {
        const res = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        return res.json();
      })
    );
    console.log("Fetched Emails:", emails);
    return emails;
  } catch (err) {
    console.error("There was an error fetching emails:", err);
    return [];
  }
};

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup/tylerAI.html") });
});

