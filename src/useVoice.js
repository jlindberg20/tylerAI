// src/hooks/useVoice.js
import { useState } from "react";
import { sendAudioToWhisper } from "../api/chat";

export const useVoice = () => {
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);

  const transcribeAudio = async (audioBlob) => {
    setLoading(true);
    try {
      const text = await sendAudioToWhisper(audioBlob);
      setTranscript(text);
    } catch (err) {
      console.error("Transcription failed", err);
    } finally {
      setLoading(false);
    }
  };

  return { transcript, loading, transcribeAudio };
};
