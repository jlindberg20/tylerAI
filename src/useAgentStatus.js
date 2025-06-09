// src/hooks/useAgentStatus.js
import { useEffect, useState } from "react";
import { getAgentTasks } from "../api/tasks";

export const useAgentStatus = (pollInterval = 5000) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getAgentTasks(); // wraps /api/tasks
        setTasks(res || []);
      } catch (err) {
        console.error("Failed to fetch agent tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { tasks, loading };
};
