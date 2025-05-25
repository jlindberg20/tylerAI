console.log("Entered: ./popup.js");

import { fetchContacts } from "../getGoogleContacts.js";

window.addEventListener("DOMContentLoaded", () => {
  console.log("⚡ Tyler popup loaded");

  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    const handleNewToken = async (newToken) => {
      console.log("🔑 Fresh token:", newToken);

      try {
        const contacts = await fetchContacts(newToken);
        console.log("📇 Contacts fetched:", contacts);

        await fetch("http://localhost:5001/api/initContacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "user-001", contacts })
        });

        console.log("✅ Contacts sent to backend");
      } catch (err) {
        console.error("❌ Failed to fetch/send contacts:", err);
      }
    };

    if (token) {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        chrome.identity.getAuthToken({ interactive: true }, handleNewToken);
      });
    } else {
      chrome.identity.getAuthToken({ interactive: true }, handleNewToken);
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const avatar = document.getElementById("tyler-avatar");
  const glow = document.getElementById("avatar-glow");
  const statusBox = document.getElementById("status-box");

  let isRecording = false;

  function setStatus(message) {
    if (statusBox) statusBox.textContent = message;
  }

  async function toggleRecording() {
    isRecording = !isRecording;

    if (isRecording) {
      glow.classList.add("recording");
      avatar.classList.add("spin");
      setStatus("Requesting mic access from Gmail tab...");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startMicRecording" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Could not message Gmail tab:", chrome.runtime.lastError.message);
            setStatus("Mic access blocked. Please enable in Chrome settings.");
            isRecording = false;
            glow.classList.remove("recording");
            avatar.classList.remove("spin");
          } else {
            console.log("Mic recording triggered in Gmail tab");
            setStatus("Recording... Tyler is listening.");
          }
        });
      });
    } else {
      glow.classList.remove("recording");
      avatar.classList.remove("spin");
      setStatus("Waiting for transcription...");
    }
  }

  avatar.addEventListener("click", toggleRecording);
  setStatus("Tyler is ready! Click on his avatar to start speaking.");

  chrome.runtime.onMessage.addListener((message) => {
    console.log("Message received in popup:", JSON.stringify(message, null, 2));

    if (message.action === "transcriptionReady" && message.transcription) {
      setStatus("Got it! Tyler is thinking...");
      isRecording = false;
      glow.classList.remove("recording");
      avatar.classList.remove("spin");
    }

    if (message.action === "gptResponseReady" && message.gptResponse) {
      setStatus(message.gptResponse);
      console.log("📥 Tyler response displayed");

      if (message.data?.action) {
        const action = message.data.action;
        if (action.type === "draft_reply") {
          setStatus(`📤 Preparing draft to ${action.parameters.recipient || "recipient"}`);
        } else if (action.type === "move_to_trash") {
          setStatus(`🗑️ Moving email to trash`);
        } else if (action.type === "mark_as_unread") {
          setStatus(`📩 Marking email as unread`);
        }
      }
    }
  });
});
