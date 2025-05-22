chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startMicRecording") {
      console.log("🎙️ Received mic start request in Gmail tab");
      
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream);
          const chunks = [];
  
          mediaRecorder.ondataavailable = e => chunks.push(e.data);
          mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = reader.result;
              chrome.runtime.sendMessage({
                action: "micAudioBlob",
                audioBase64: base64Audio
              });
            };
            reader.readAsDataURL(blob);
          };
  
          mediaRecorder.start();
          setTimeout(() => mediaRecorder.stop(), 5000); // 5s recording
        })
        .catch((err) => {
          console.error("❌ Mic access error:", err);
        });
  
      sendResponse({ status: "started" });
      return true;
    }
  });
  