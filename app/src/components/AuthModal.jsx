import React, { useState } from "react";
import { useAuth } from "../lib/auth-context";

function AuthIcon({ name, size = 16 }) {
  const paths = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    alert: <><path d="M12 3 2.7 20h18.6L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" aria-hidden="true">{paths[name]}</svg>;
}

export function AuthModal({ isOpen, onClose, defaultMode = "login", onSuccess }) {
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState(defaultMode);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");

  // Sync the mode during render when the modal opens, so the correct form is
  // on screen from the very first frame (no stale-form flash or effect race).
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setMode(defaultMode);
      setFormError("");
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError("");
  };

  const validateForm = () => {
    if (mode === "register") {
      if (!formData.name.trim()) return "Name is required";
      if (!formData.email.trim()) return "Email is required";
      if (!formData.password) return "Password is required";
      if (formData.password.length < 8) return "Password must be at least 8 characters";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    } else {
      if (!formData.email.trim()) return "Email is required";
      if (!formData.password) return "Password is required";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");

    let result;
    if (mode === "register") {
      result = await register(formData.name, formData.email, formData.password);
    } else {
      result = await login(formData.email, formData.password);
    }

    if (result.success) {
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      onClose();
    } else {
      setFormError(result.error);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setFormError("");
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <span>×</span>
        </button>

        <p className="section-label">{mode === "login" ? "Welcome back" : "Create account"}</p>
        <h2 id="auth-modal-title">{mode === "login" ? "Sign in to Veyra" : "Start monitoring in seconds"}</h2>
        <p className="modal-copy">
          {mode === "login"
            ? "Enter your credentials to access your monitoring workspace."
            : "Add your first endpoint and see your first check result right away."
          }
        </p>

        {formError && (
          <div className="form-error" role="alert">
            <AuthIcon name="alert" size={14} /> {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Name
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Jordan Davis"
                autoComplete="name"
                required
                disabled={loading}
              />
            </label>
          )}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={mode === "login" ? "••••••••" : "At least 8 characters"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              disabled={loading}
            />
          </label>

          {mode === "register" && (
            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={loading}
              />
            </label>
          )}

          <div className="form-actions">
            <button type="button" className="button button-quiet" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                <>
                  <AuthIcon name={mode === "login" ? "arrow" : "plus"} size={16} />
                  {mode === "login" ? "Sign in" : "Create account"}
                </>
              )}
            </button>
          </div>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button type="button" className="text-button" onClick={switchMode} disabled={loading}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthModal;