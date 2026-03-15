"use client";

import { useEffect, useState } from "react";

type AdminAuthModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
};

export default function AdminAuthModal({
  isOpen,
  title = "Admin Sign In",
  description = "Enter the admin password to continue.",
  confirmLabel = "Continue",
  errorMessage = "",
  onClose,
  onSubmit,
}: AdminAuthModalProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setIsSubmitting(false);
      setLocalError("");
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalError(errorMessage);
  }, [errorMessage]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit() {
    if (!password.trim()) {
      setLocalError("Enter the admin password.");
      return;
    }

    setIsSubmitting(true);
    setLocalError("");

    try {
      await onSubmit(password.trim());
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    onClose();
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-3 text-sm opacity-75">{description}</p>

        <label className="form-control mt-6 w-full">
          <span className="label-text font-semibold">Admin password</span>
          <input
            type="password"
            className="input input-bordered mt-2 w-full"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter admin password"
          />
        </label>

        {localError ? (
          <p className="mt-3 text-sm font-medium text-error">{localError}</p>
        ) : null}

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Checking..." : confirmLabel}
          </button>
        </div>
      </div>
      <button
        className="modal-backdrop"
        aria-label="Close admin auth modal"
        onClick={handleClose}
      />
    </div>
  );
}
