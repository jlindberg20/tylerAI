// src/hooks/useVoice.js
import { useState } from "react";
import { transcribeAudio } from "../api/chat";

export const useVoice = () => {
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAudio = async (audioBlob) => {
    setLoading(true);
    try {
      const result = await transcribeAudio(audioBlob);
      setTranscript(result.transcript);
    } catch (err) {
      console.error("Whisper transcription failed", err);
    } finally {
      setLoading(false);
    }
  };

  return { transcript, loading, handleAudio };
};
