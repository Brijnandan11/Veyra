import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";

const MonitorsContext = createContext(null);

/* Shape used until a monitor's first check history loads. */
const EMPTY_DETAIL = {
  status: "PENDING",
  response: "—",
  code: "—",
  lastChecked: "pending",
  uptime: "—",
  checks: "0",
  avgResponse: null,
};

function relativeTime(iso) {
  if (!iso) return "pending";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/* Derive the dashboard fields (status, response, uptime…) from each monitor's
   real check history, so every number on the screen comes from the backend. */
async function buildMonitorDetails(monitor) {
  const fallback = EMPTY_DETAIL;
  try {
    const { data: checks } = await api.getMonitorChecks(monitor.id);
    const list = checks || [];
    if (list.length === 0) return fallback;

    const latest = list[0];
    const up = list.filter((check) => check.status === "up").length;
    const times = list
      .map((check) => check.response_time)
      .filter((time) => time !== null && time !== undefined);

    return {
      status: latest.status === "up" ? "UP" : "DOWN",
      response: latest.response_time != null ? `${latest.response_time} ms` : "—",
      code: latest.status_code ?? "—",
      lastChecked: relativeTime(latest.checked_at),
      uptime: `${((up / list.length) * 100).toFixed(2)}%`,
      checks: list.length.toLocaleString(),
      avgResponse: times.length
        ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
        : null,
    };
  } catch {
    return fallback;
  }
}

export function MonitorsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [monitors, setMonitors] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const requestRef = useRef(0);

  const refreshDetails = useCallback(async (rows) => {
    const requestId = ++requestRef.current;
    const entries = await Promise.all(
      rows.map(async (monitor) => [monitor.id, await buildMonitorDetails(monitor)])
    );
    // Ignore stale results if the list changed while checks were loading.
    if (requestId !== requestRef.current) return;
    setDetails(Object.fromEntries(entries));
    setLastSyncedAt(Date.now());
  }, []);

  const fetchMonitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMonitors();
      const rows = data.data || [];
      setMonitors(rows);
      setSelectedId((current) => (current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null));
      refreshDetails(rows);
    } catch (err) {
      setError(err.message || "Failed to fetch monitors");
    } finally {
      setLoading(false);
    }
  }, [refreshDetails]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMonitors();
    } else {
      setMonitors([]);
      setDetails({});
      setSelectedId(null);
      setLastSyncedAt(null);
    }
  }, [isAuthenticated, fetchMonitors]);

  const createMonitor = useCallback(async (monitorData) => {
    setError(null);
    try {
      const data = await api.createMonitor(monitorData);
      const monitor = data.data;
      setMonitors((prev) => [...prev, monitor]);
      setDetails((prev) => ({
        ...prev,
        [monitor.id]: { status: "PENDING", response: "—", code: "—", lastChecked: "pending", uptime: "—", checks: "0", avgResponse: null },
      }));
      setLastSyncedAt(Date.now());
      return { success: true, monitor };
    } catch (err) {
      let message = err.message || "Failed to create monitor";
      // Zod validation errors come back as an `errors` array of issues.
      if (err.data?.errors && Array.isArray(err.data.errors)) {
        message = err.data.errors.map((issue) => issue.message).join(". ");
      }
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const updateMonitor = useCallback(async (id, updates) => {
    setError(null);
    try {
      const data = await api.updateMonitor(id, updates);
      setMonitors((prev) => prev.map((monitor) => (monitor.id === id ? { ...monitor, ...data.data } : monitor)));
      setLastSyncedAt(Date.now());
      return { success: true, monitor: data.data };
    } catch (err) {
      const message = err.message || "Failed to update monitor";
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const deleteMonitor = useCallback(async (id) => {
    setError(null);
    try {
      await api.deleteMonitor(id);
      setMonitors((prev) => prev.filter((monitor) => monitor.id !== id));
      setDetails((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedId((current) => (current === id ? null : current));
      setLastSyncedAt(Date.now());
      return { success: true };
    } catch (err) {
      const message = err.message || "Failed to delete monitor";
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const toggleMonitor = useCallback(async (id) => {
    const monitor = monitors.find((item) => item.id === id);
    if (!monitor) return { success: false, error: "Monitor not found" };
    return updateMonitor(id, { active: !monitor.active });
  }, [monitors, updateMonitor]);

  const selectMonitor = useCallback((id) => setSelectedId(id), []);

  /* Monitors merged with their live check details, in dashboard shape.
     Falls back to the PENDING shape while per-monitor details load. */
  const enrichedMonitors = monitors.map((monitor) => ({
    ...monitor,
    interval: `${monitor.interval} sec`,
    ...(details[monitor.id] || EMPTY_DETAIL),
  }));

  const selectedMonitor = enrichedMonitors.find((monitor) => monitor.id === selectedId) || enrichedMonitors[0] || null;

  const clearError = useCallback(() => setError(null), []);

  const value = {
    monitors: enrichedMonitors,
    loading,
    error,
    selectedId,
    selectedMonitor,
    lastSyncedAt,
    fetchMonitors,
    refreshDetails,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    toggleMonitor,
    selectMonitor,
    clearError,
  };

  return (
    <MonitorsContext.Provider value={value}>
      {children}
    </MonitorsContext.Provider>
  );
}

export function useMonitors() {
  const context = useContext(MonitorsContext);
  if (!context) {
    throw new Error("useMonitors must be used within a MonitorsProvider");
  }
  return context;
}