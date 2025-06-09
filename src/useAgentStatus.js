// src/hooks/useAgentStatus.js
import { useEffect, useState } from "react";
import { fetchAgentTasks } from "../api/tasks"; // calls backend /api/tasks

export const useAgentStatus = (intervalMs = 5000) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetchAgentTasks();
        setTasks(response);
      } catch (err) {
        console.error("Failed to fetch agent tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    timer = setInterval(fetchTasks, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return { tasks, loading };
};
