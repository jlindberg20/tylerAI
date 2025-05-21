let mediaRecorder;
let audioChunks = [];
let transcriptEl;
let recordBtn;
let chatResponseEl;

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ voice.js loaded");

  // DOM references
  transcriptEl = document.getElementById("transcript");
  recordBtn = document.getElementById("record-btn");
  chatResponseEl = document.getElementById("chat-response");

  // Record button click handler
  recordBtn.addEventListener("click", () => {
    console.log("🎤 Record button clicked");
  
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0].id;
  
      chrome.tabs.sendMessage(activeTabId, { action: "startMicRecording" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("❌ Could not send message to Gmail tab:", chrome.runtime.lastError.message);
          transcriptEl.textContent = "❌ Please refresh your Gmail tab and try again.";
        } else {
          console.log("📨 Mic recording triggered in Gmail tab");
        }
      });
    });
  });
});

/*async function startRecording() {
  try {
    console.log("📞 Requesting microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("🎤 Microphone access granted.");

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      console.log("📦 Audio Blob:", audioBlob.type, audioBlob.size, "bytes");

      const transcription = await transcribeWithWhisper(audioBlob);
      transcriptEl.textContent = transcription;

      chrome.runtime.sendMessage({ action: "fetchEmails" }, (response) => {
        askOpenAI(transcription, response.emails);
      });
    };

    mediaRecorder.start();
    recordBtn.textContent = "⏹️ Stop";
  } catch (err) {
    console.error("❌ Failed to start recording:", err);

    if (err.name === "NotAllowedError") {
      transcriptEl.textContent = "❌ You denied mic access. Please allow it and try again.";
      setTimeout(() => {
        transcriptEl.textContent = "🎤 Click the button again to retry.";
      }, 5000);
    } else {
      transcriptEl.textContent = "❌ Mic error: " + err.message;
    }
  }
}

function stopRecording() {
  mediaRecorder.stop();
  recordBtn.textContent = "🎙️ Speak to Tyler";
}*/

async function transcribeWithWhisper(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");

  if (typeof Open_AI_Whisper_API_Key === "undefined") {
    console.error("🔑 Missing OpenAI API key (private.js)");
    return "";
  }

  console.log("📤 Sending to Whisper...");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Open_AI_Whisper_API_Key}`
    },
    body: formData
  });

  const data = await response.json();
  return data.text;
}

async function askOpenAI(transcription, emails) {
  if (typeof Open_AI_Whisper_API_Key === "undefined") {
    console.error("🔑 Missing OpenAI API key (private.js)");
    return;
  }

  const prompt = `The user said: "${transcription}". Based on these recent emails, give a spoken response and a short summary showing how many are unread and which need immediate replies:\n\n` +
    emails.map(e => `- Snippet: ${e.snippet}`).join("\n");

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
    console.log("🧠 GPT Output:", output);

    chatResponseEl.textContent = output;
    speakText(output);
  } catch (err) {
    console.error("Chat API error:", err);
    speakText("Something went wrong when contacting the AI.");
  }
}

function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "micAudioBlob" && message.audioBase64) {
      console.log("🎧 Received mic audio blob from Gmail tab");
      const blob = base64ToBlob(message.audioBase64);
      transcribeWithWhisper(blob).then(transcription => {
        transcriptEl.textContent = transcription;
        chrome.runtime.sendMessage({ action: "fetchEmails" }, (response) => {
          askOpenAI(transcription, response.emails);
        });
      });
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
