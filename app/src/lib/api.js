const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem("veyra_token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }
  
  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new ApiError(
      "Unable to reach the Veyra API. Start the backend server and make sure it is running on port 3000.",
      0,
      {}
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Expired/invalid session: drop the token and let the auth context reset.
    if (response.status === 401 && !endpoint.startsWith("/auth/")) {
      localStorage.removeItem("veyra_token");
      window.dispatchEvent(new Event("veyra:unauthorized"));
    }
    const message = data.error || data.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}

export const api = {
  // Auth
  register: (userData) => request("/auth/register", {
    method: "POST",
    body: userData,
  }),
  
  login: (credentials) => request("/auth/login", {
    method: "POST",
    body: credentials,
  }),
  
  // Monitors
  getMonitors: () => request("/monitors"),
  
  createMonitor: (monitorData) => request("/monitors", {
    method: "POST",
    body: monitorData,
  }),
  
  getMonitor: (id) => request(`/monitors/${id}`),
  
  updateMonitor: (id, data) => request(`/monitors/${id}`, {
    method: "PATCH",
    body: data,
  }),
  
  deleteMonitor: (id) => request(`/monitors/${id}`, {
    method: "DELETE",
  }),
  
  getMonitorStats: (id) => request(`/monitors/${id}/stats`),
  
  getMonitorChecks: (id) => request(`/monitors/${id}/checks`),
  
  getMonitorIncidents: (id) => request(`/monitors/${id}/incidents`),
  
  // Public status
  getPublicStatus: () => request("/public/status"),
  
  // Health
  healthCheck: () => request("/health"),
};

export { ApiError };
export default api;