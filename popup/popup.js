console.log("Entered: ./popup.js");

document.addEventListener("DOMContentLoaded", function () {
  const avatar = document.getElementById("tyler-avatar");
  const glow = document.getElementById("avatar-glow");
  const statusBox = document.getElementById("status-box");
  const chatBox = document.getElementById("chat-box");
  const chatResponseEl = document.getElementById("chat-response");

  let isRecording = false;

  function setStatus(message) {
    statusBox.textContent = message;
  }

  function appendMessage(sender, text) {
    const message = document.createElement("div");
    message.className = "message";
    message.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  async function toggleRecording() {
    isRecording = !isRecording;

    if (isRecording) {
      glow.classList.add("recording");
      setStatus("Requesting mic access from Gmail tab...");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startMicRecording" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Could not message Gmail tab:", chrome.runtime.lastError.message);
            setStatus("Mic access blocked. Please enable in Chrome settings.");
            isRecording = false;
            glow.classList.remove("recording");
          } else {
            console.log("Mic recording triggered in Gmail tab");
            setStatus("Recording... Tyler is listening.");
          }
        });
      });
    } else {
      glow.classList.remove("recording");
      setStatus("Waiting for transcription...");
    }
  }

  avatar.addEventListener("click", toggleRecording);

  setStatus("Tyler is ready! Click on his avatar to start speaking.");

  chrome.runtime.onMessage.addListener((message) => {
    console.log("Message received in popup:", JSON.stringify(message, null, 2));
    console.log("Action:", message.action);
    console.log("Has transcription:", !!message.transcription);
    console.log("Has gptResponse:", !!message.gptResponse);
  
    if (message.action === "transcriptionReady" && message.transcription) {
      const normalizedTranscript = message.transcription.trim().toLowerCase();
  
      const alreadyAppended = [...chatBox.querySelectorAll(".message")]
        .some(m => m.textContent.trim().toLowerCase() === `you: ${normalizedTranscript}`);
  
      if (!alreadyAppended) {
        appendMessage("You", message.transcription);
      } else {
        console.log("⏭️ Skipping duplicate user message:", message.transcription);
      }
  
      setStatus("Got it! Tyler is thinking...");
      isRecording = false;
      glow.classList.remove("recording");
    }
  
    if (message.action === "gptResponseReady" && message.gptResponse) {
      appendMessage("Tyler", message.gptResponse);
      console.log("📥 Tyler response received");
      if (chatResponseEl) {
        chatResponseEl.textContent = message.gptResponse;
      }
      setStatus("Tyler responded! Click avatar to ask something else.");
  
      // ✅ Show action intent in UI if present
      if (message.data?.action) {
        const action = message.data.action;
        if (action.type === "draft_reply") {
          setStatus(`📤 Preparing draft to ${action.parameters.recipient || "recipient"}`);
          appendMessage("System", `Drafting a reply to ${action.parameters.recipient}`);
        } else if (action.type === "move_to_trash") {
          setStatus(`🗑️ Moving email to trash`);
          appendMessage("System", `Moving an email to trash.`);
        } else if (action.type === "mark_as_unread") {
          setStatus(`📩 Marking email as unread`);
          appendMessage("System", `Marking an email as unread.`);
        }
      }
    }
  });
  
});

