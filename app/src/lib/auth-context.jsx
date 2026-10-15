import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Reject expired tokens without a network round-trip.
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("veyra_token");
    if (!token) return null;
    const payload = decodeToken(token);
    if (!payload) {
      localStorage.removeItem("veyra_token");
      return null;
    }
    return { id: payload.id, email: payload.email };
  });
  const [loading, setLoading] = useState(false);

  // If the API rejects a token mid-session (401), the api client dispatches
  // this event; reset auth state so the UI returns to the signed-out view.
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem("veyra_token");
      setUser(null);
    };
    window.addEventListener("veyra:unauthorized", onUnauthorized);
    return () => window.removeEventListener("veyra:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      localStorage.setItem("veyra_token", data.data.token);
      setUser(data.data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Login failed" };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    try {
      // The register endpoint creates the account but does not issue a token,
      // so sign in immediately afterwards with the same credentials.
      await api.register({ name, email, password });
      return login(email, password);
    } catch (err) {
      let message = err.message || "Registration failed";
      // Surface duplicate-account conflicts in a friendlier form.
      if (err.status === 409 || /duplicate key/i.test(message) || /already exists/i.test(message)) {
        message = "An account with this email already exists. Try signing in.";
      }
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem("veyra_token");
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}