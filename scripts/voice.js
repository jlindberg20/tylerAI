let transcriptEl;
let chatResponseEl;

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
  
      speakText(output);
  
      // ✅ Send GPT response to popup UI
      chrome.runtime.sendMessage({ action: "gptResponseReady", gptResponse: output });
  
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
        console.log("✅ Converted base64 to Blob:", blob);
  
        transcribeWithWhisper(blob).then(transcription => {
          console.log("📝 Transcription received:", transcription);
  
          chrome.runtime.sendMessage({
            action: "transcriptionReady",
            transcription: transcription
          });
  
          chrome.runtime.sendMessage({ action: "fetchEmails" }, (response) => {
            askOpenAI(transcription, response?.emails || []);
          });
        }).catch(err => {
          console.error("❌ Error in transcribeWithWhisper .then():", err);
        });
      } catch (e) {
        console.error("❌ Error converting blob or calling Whisper:", e);
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
