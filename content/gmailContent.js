chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startMicRecording") {
      console.log("📥 Gmail content script: starting mic recording");
  
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const recorder = new MediaRecorder(stream);
        const chunks = [];
  
        recorder.ondataavailable = (e) => chunks.push(e.data);
  
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const reader = new FileReader();
  
          reader.onloadend = () => {
            chrome.runtime.sendMessage({
              action: "micAudioBlob",
              audioBase64: reader.result
            });
          };
  
          reader.readAsDataURL(blob);
          stream.getTracks().forEach(track => track.stop());
        };
  
        recorder.start();
        console.log("🎙️ Recording started");
  
        setTimeout(() => {
          recorder.stop();
          console.log("🛑 Recording stopped");
        }, 4000);
  
        sendResponse({ status: "started" }); // ✅ respond to the popup
      }).catch(err => {
        console.error("❌ Mic access failed:", err);
        sendResponse({ status: "error", error: err.message });
      });
  
      return true; // ✅ keep message channel open for sendResponse
    }
  });
  