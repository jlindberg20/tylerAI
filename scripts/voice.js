let transcriptEl;
let chatResponseEl;
let askOpenAIInProgress = false;
let lastDraftState = {
  recipient: '',
  body: '',
  timestamp: 0
};

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ voice.js loaded");

  transcriptEl = document.getElementById("transcript");
  chatResponseEl = document.getElementById("chat-response");
});

export async function transcribeWithWhisper(audioBlob) {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
  
    if (typeof Open_AI_Whisper_API_Key === "undefined") {
      console.error("🔑 Missing OpenAI API key (private.js)");
      return "";
    }
  
    console.log("📤 Sending to Whisper...");
  
    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Open_AI_Whisper_API_Key}`
        },
        body: formData
      });
  
      const data = await response.json();
      console.log("📥 Whisper Response:", data);  // ADD THIS LINE
      return data.text;
    } catch (err) {
      console.error("❌ Whisper fetch failed:", err);  // ADD THIS LINE TOO
      return "";
    }
  }

function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

function getPlainTextBody(payload) {
  if (!payload) return "";

  const decodeAndClean = (data) => {
    const decoded = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    return decoded.replace(/\r\n|\n/g, ' ').replace(/\s+/g, ' ').trim(); // clean line breaks + extra spaces
  };

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeAndClean(payload.body.data);
  }

  const parts = payload.parts || [];
  for (let part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeAndClean(part.body.data);
    }
    // Recursive scan
    if (part.parts) {
      const nested = getPlainTextBody(part);
      if (nested) return nested;
    }
  }

  return "";
}


async function askOpenAI(transcription, emails) {
    if (typeof Open_AI_Whisper_API_Key === "undefined") {
      console.error("🔑 Missing OpenAI API key (private.js)");
      return;
    }
    // PROMPT FOR WHISPER //
    const prompt = `You are an AI email agent with control over the user's inbox. You can perform actions like deleting emails, drafting replies, marking messages read/unread, and summarizing content. 
                    The user said: "${transcription}". Interpret their intent and take one or more appropriate actions based on the emails below. Your response should briefly describe what you did, in a calm, natural tone.
                    Do not include labels like "Action:", "Response:", or "Summary:". Avoid over-explaining. Just clearly express what you're doing or what the user needs to know.\n\n` + emails.map(e => `- Snippet: ${e.snippet}`).join("\n");
  
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Open_AI_Whisper_API_Key}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }]
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat API Error:", errorText);
        speakText("There was an error with the AI response.");
        return;
      }
  
      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || "Sorry, I couldn’t figure that out.";
      const [spoken, ...rest] = output.split("Summary:");
      const cleaned = output.replace(/^Spoken response:\s*/i, "").split("Summary:")[0].trim();
      console.log("🧠 GPT Output:", cleaned);
      speakText(cleaned);
  
      // ✅ Send GPT response to popup UI
      chrome.runtime.sendMessage({ action: "gptResponseReady", gptResponse: cleaned});
  
    } catch (err) {
      console.error("Chat API error:", err);
      speakText("Something went wrong when contacting the AI.");
    }
  } 

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "micAudioBlob" && message.audioBase64) {
      console.log("🎧 Received mic audio blob from Gmail tab");
  
      try {
        const blob = base64ToBlob(message.audioBase64);
  
        if (askOpenAIInProgress) {
          console.warn("⚠️ GPT request already in progress. Skipping duplicate.");
          return;
        }
        askOpenAIInProgress = true;
  
        transcribeWithWhisper(blob).then(transcription => {
          console.log("📝 Transcription received:", transcription);
  
          chrome.runtime.sendMessage({
            action: "transcriptionReady",
            transcription: transcription
          });
  
          chrome.runtime.sendMessage({ action: "fetchEmails" }, (response) => {
            const formData = new FormData();
            formData.append("audio", blob, "voice.webm");
  
            const trimmedEmails = (response?.emails || []).map(email => {
              const headers = email.payload?.headers || [];
              const subject = headers.find(h => h.name === "Subject")?.value || "";
              const sender = headers.find(h => h.name === "From")?.value || "";
            
              return {
                id: email.id,
                threadId: email.threadId,
                labelIds: email.labelIds || [],
                unread: email.labelIds?.includes("UNREAD") || false,
                hasAttachments: (email.payload?.parts || []).some(p => p.filename) || false,
                attachmentFilenames: (email.payload?.parts || [])
                  .filter(p => p.filename)
                  .map(p => p.filename),
                snippet: email.snippet,
                internalDate: email.internalDate,
                ageInHours: (Date.now() - Number(email.internalDate)) / (1000 * 60 * 60),
                sizeEstimate: email.sizeEstimate,
                historyId: email.historyId,
                subject,
                from: headers.find(h => h.name === "From")?.value || "",
                sender,
                to: headers.find(h => h.name === "To")?.value || "",
                date: headers.find(h => h.name === "Date")?.value || "",
                isReply: subject?.startsWith("Re:") || false,
                recipients: {
                  to: headers.filter(h => h.name === "To").map(h => h.value),
                  cc: headers.filter(h => h.name === "Cc").map(h => h.value),
                  bcc: headers.filter(h => h.name === "Bcc").map(h => h.value)
                },
                messageBody: getPlainTextBody(email.payload) || "",
                threadMessageCount: email.threadMessageCount || 1,
              
                // 🔥 Importance Heuristic Score (0–100)
                importanceScore: (() => {
                  let score = 0;
              
                  // High-value keywords
                  const importantPhrases = ["urgent", "asap", "action required", "reply needed"];
                  const lowerBody = getPlainTextBody(email.payload || {}).toLowerCase() || "";
              
                  if (email.labelIds?.includes("UNREAD")) score += 15;
                  if (email.subject?.toLowerCase().includes("invoice") || email.subject?.toLowerCase().includes("payment")) score += 15;
                  if (email.snippet?.toLowerCase().includes("interview") || email.snippet?.toLowerCase().includes("application")) score += 15;
                  if (importantPhrases.some(p => lowerBody.includes(p))) score += 15;
                  if (email.threadMessageCount && email.threadMessageCount > 3) score += 10;
                  if ((Date.now() - Number(email.internalDate)) / (1000 * 60 * 60) < 12) score += 10; // less than 12 hours old
                  if (email.hasAttachments) score += 5;
                  if (email.sender?.toLowerCase().includes("spacex") || email.sender?.toLowerCase().includes("recruiting")) score += 10;
              
                  return Math.min(score, 100);
                })()
              };
              
            });
            
            const realEmailData = { emails: trimmedEmails };
            formData.append("meta", JSON.stringify(realEmailData));
            console.log("📤 Sending request to backend with real email data...");
            const requestBody = {
              transcription,
              emailContext: { emails: trimmedEmails },
              userId: "user-001"
            };
            
            fetch("http://localhost:5001/api/query", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(requestBody)
            })
            
              .then(res => res.json())
              .then(data => {
                console.log("🧠 Backend returned:", data);
                if (data.action) {
                  const fullAction = {
                    type: data.action,
                    parameters: data.parameters || {}
                  };
                  console.log("✅ Executing backend-defined action:", fullAction);
                  executeAction(fullAction);
                }
              
                chrome.runtime.sendMessage({
                  action: "transcriptionReady",
                  transcription: data.transcription || ""
                });
              
                chrome.runtime.sendMessage({
                  action: "gptResponseReady",
                  gptResponse: data.response
                });
              
                speakText(data.response);
                askOpenAIInProgress = false;
              })
              .catch(err => {
                console.error("❌ Backend fetch error:", err);
                askOpenAIInProgress = false;
              });
          });
        }).catch(err => {
          console.error("❌ Error in transcribeWithWhisper .then():", err);
          askOpenAIInProgress = false;
        });
      } catch (e) {
        console.error("❌ Error converting blob or calling Whisper:", e);
        askOpenAIInProgress = false;
      }
    }
  });
  
  

function base64ToBlob(base64DataURL) {
  const parts = base64DataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) buffer[i] = binary.charCodeAt(i);
  return new Blob([buffer], { type: mime });
}

function executeAction(action) {
  if (!action || !action.type) {
    console.log("⚠️ No action to execute.");
    return;
  }

  console.log("🚀 executeAction() called with:", action);

  const { type, parameters } = action;
  const {
    recipient = "",
    body = "",
    to = [],
    cc = [],
    bcc = [],
    subject = "",
    threadId = null
  } = parameters;

  if (
    type === "draft_reply" &&
    recipient === lastDraftState.recipient &&
    body === lastDraftState.body &&
    Date.now() - lastDraftState.timestamp < 10000
  ) {
    console.log("⛔ Duplicate draft detected — skipping");
    return;
  }

  if (type === "draft_reply") {
    lastDraftState = {
      recipient,
      body,
      timestamp: Date.now()
    };
  }

  chrome.tabs.query({ url: "*://mail.google.com/*" }, (tabs) => {
    console.log("🔍 Gmail tabs found:", tabs);
    if (!tabs.length) {
      console.warn("⚠️ No Gmail tab found");
      return alert("Gmail tab not found.");
    }

    const tabId = tabs[0].id;
    console.log("📨 Injecting script into Gmail tab...");

    chrome.scripting.executeScript({
      target: { tabId },
      func: (action) => {
        const { type, parameters } = action;
        console.log("🧠 Executing action inside Gmail:", type, parameters);

        function waitForElement(selector, timeout = 5000) {
          return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsed = 0;
            const check = () => {
              const el = document.querySelector(selector);
              if (el) return resolve(el);
              elapsed += interval;
              if (elapsed >= timeout) return reject("Timeout waiting for element: " + selector);
              setTimeout(check, interval);
            };
            check();
          });
        }

        const {
          recipient = "",
          body = "",
          to = [],
          cc = [],
          bcc = [],
          subject = "",
          threadId = null
        } = parameters;

        if (type === "draft_reply") {
          console.log("📥 Draft reply requested");

          if (threadId) {
            const threadSelector = `div[data-legacy-thread-id='${threadId}']`;
            console.log("🔍 Looking for thread:", threadSelector);

            waitForElement(threadSelector).then(thread => {
              console.log("✅ Found thread, clicking...");
              thread.click();

              setTimeout(() => {
                const replyBtn = document.querySelector("div[aria-label='Reply']") || document.querySelector(".ams.bkH");
                if (replyBtn) {
                  console.log("✅ Found reply button, clicking...");
                  replyBtn.click();
                } else {
                  console.warn("⚠️ Reply button not found");
                }

                setTimeout(() => {
                  const bodyField = document.querySelector("div[aria-label='Message Body']");
                  if (bodyField) {
                    console.log("✅ Found body field, inserting text");
                    bodyField.focus();
                    document.execCommand("insertText", false, body);
                  } else {
                    console.warn("⚠️ Body field not found");
                  }
                }, 1000);
              }, 1000);
            }).catch(err => console.error("❌ Error finding thread:", err));
          } else {
            const composeDialogs = document.querySelectorAll("div[role='dialog'][aria-label*='New Message'], div[role='dialog'][aria-label*='Compose']");
            const hasActiveDraft = Array.from(composeDialogs).some(dialog => {
              const toField = dialog.querySelector("input[aria-label='To recipients']");
              return toField && toField.value.trim().length > 0;
            });

            if (!hasActiveDraft) {
              const composeBtn = document.querySelector(".T-I.T-I-KE.L3");
              if (composeBtn) {
                console.log("✅ No active draft — clicking compose");
                composeBtn.click();
              } else {
                console.warn("⚠️ Compose button not found");
              }
            } else {
              console.log("✉️ Active draft already open — skipping compose");
            }

            Promise.all([
              waitForElement("input[aria-label='To recipients']"),
              waitForElement("div[aria-label='Message Body']")
            ]).then(([toField, bodyField]) => {
              if (toField && to.length) {
              console.log("✅ Inserting TO:", to.join(", "));
              toField.focus();
              toField.value = to.join(", ");
              toField.dispatchEvent(new InputEvent("input", { bubbles: true }));

              setTimeout(() => {
                // Try to click Gmail's recipient suggestion bubble
                const suggestion = document.querySelector("div[role='listbox'] div[role='option']");
                if (suggestion) {
                  console.log("🖱️ Clicking Gmail recipient suggestion");
                  suggestion.click();
                } else {
                  console.warn("⚠️ No recipient suggestion found to click");
                }
              }, 300);
            }
              // ✅ Reveal CC if necessary
              if (cc.length > 0) {
                const showCc = document.querySelector("span[aria-label='Add Cc recipients']");
                if (showCc) {
                  console.log("➕ Clicking 'Add Cc' to reveal CC field");
                  showCc.click();
                }
              }

              const ccField = document.querySelector("input[aria-label='Cc recipients']");
              if (ccField && cc.length) {
                console.log("✅ Inserting CC:", cc.join(", "));
                ccField.focus();
                ccField.value = cc.join(", ");
                ccField.dispatchEvent(new InputEvent("input", { bubbles: true }));
              }

              // ✅ Reveal BCC if necessary
              if (bcc.length > 0) {
                const showBcc = document.querySelector("span[aria-label='Add Bcc recipients']");
                if (showBcc) {
                  console.log("➕ Clicking 'Add Bcc' to reveal BCC field");
                  showBcc.click();
                }
              }

              const bccField = document.querySelector("input[aria-label='Bcc recipients']");
              if (bccField && bcc.length) {
                console.log("✅ Inserting BCC:", bcc.join(", "));
                bccField.focus();
                bccField.value = bcc.join(", ");
                bccField.dispatchEvent(new InputEvent("input", { bubbles: true }));
              }

              const subjectField = document.querySelector("input[name='subjectbox']");
              if (subjectField && subject) {
                console.log("✅ Inserting subject:", subject);
                subjectField.focus();
                subjectField.value = subject;
                subjectField.dispatchEvent(new InputEvent("input", { bubbles: true }));
              }

              if (bodyField && body) {
                console.log("✅ Inserting body");
                bodyField.focus();
                document.execCommand("insertText", false, body);
              } else {
                console.warn("⚠️ Body field not found");
              }
            }).catch(err => {
              console.error("❌ Error preparing compose fields:", err);
            });
          }
        }

        if (type === "send_email") {
          const sendBtn = document.querySelector("div[aria-label*='Send'][role='button'], .T-I.J-J5-Ji.aoO.v7.T-I-atl.L3");
          if (sendBtn) {
            console.log("✅ Found send button, clicking...");
            sendBtn.click();
          } else {
            console.warn("⚠️ Send button not found");
          }
        }
      },
      args: [action]
    });
  });
}
