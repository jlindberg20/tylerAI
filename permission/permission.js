navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    stream.getTracks().forEach(track => track.stop());
    chrome.runtime.sendMessage({ action: "micPermissionGranted" });
    window.close();
  })
  .catch(err => {
    alert("Mic access denied. Please enable it manually.");
  });