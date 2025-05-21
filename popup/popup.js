// popup.js

document.addEventListener("DOMContentLoaded", function () {
  const avatar = document.getElementById("tyler-avatar");
  const glow = document.getElementById("avatar-glow");
  const statusBox = document.getElementById("status-box");
  const chatBox = document.getElementById("chat-box");

  let isRecording = false;

  function setStatus(message) {
    statusBox.textContent = message;
  }

  function appendMessage(sender, text) {
    const message = document.createElement("div");
    message.textContent = `${sender}: ${text}`;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function toggleRecording() {
    isRecording = !isRecording;

    if (isRecording) {
      glow.classList.add("recording");
      setStatus("Recording in progress. Click avatar when you are finished");
      // In real logic, start microphone here
    } else {
      glow.classList.remove("recording");
      setStatus("Recording being processed. Tyler is thinking");

      // In real logic, stop microphone + transcribe + fetch AI response
      setTimeout(() => {
        appendMessage("You", "What’s the latest with my inbox?");
        appendMessage("Tyler", "You have 3 urgent emails and 12 unread ones.");
        setStatus("Message from Tyler! Click on avatar to speak to Tyler");
      }, 1500);
    }
  }

  // Initial status
  setStatus("Tyler is ready! Click on his avatar to start recording your command");

  avatar.addEventListener("click", toggleRecording);
});
