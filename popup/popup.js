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
            console.warn("❌ Could not message Gmail tab:", chrome.runtime.lastError.message);
            setStatus("Mic access blocked. Please enable in Chrome settings.");
            isRecording = false;
            glow.classList.remove("recording");
          } else {
            console.log("✅ Mic recording triggered in Gmail tab");
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
    console.log("📬 Message received in popup:", JSON.stringify(message, null, 2));
    // DEBUGGING STATEMENTS //
    console.log("🔍 Action:", message.action);
    console.log("🔍 Has transcription:", !!message.transcription);
    console.log("🔍 Has gptResponse:", !!message.gptResponse);
    if (message.action === "transcriptionReady" && message.transcription) {
      appendMessage("You", message.transcription);
      console.log("I am inside the transcription section. thinking");
      setStatus("Got it! Tyler is thinking...");
      isRecording = false;
      glow.classList.remove("recording");
    }

    if (message.action === "gptResponseReady" && message.gptResponse) {
      appendMessage("Tyler", message.gptResponse);
      console.log("I am inside the response section");
      if (chatResponseEl) {
        chatResponseEl.textContent = message.gptResponse;
      }
      console.log("I am outside the response section. thinking");
      setStatus("Tyler responded! Click avatar to ask something else.");
    }
  });
});

