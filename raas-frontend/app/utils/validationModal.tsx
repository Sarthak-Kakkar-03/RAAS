"use client";

import type { ProjectPublicInfo } from "@/types/api";
import { validateProjectKey } from "@/app/utils/projectValidation";
import { useEffect, useState } from "react";

type ValidationModalProps = {
  base_url: string;
  isOpen: boolean;
  project: ProjectPublicInfo | null;
  projectId?: string;
  projectNameStatus?: string;
  onClose: () => void;
  onValidated: (apiKey: string) => void;
  confirmLabel?: string;
  title?: string;
};

export default function ValidationModal({
  base_url,
  isOpen,
  project,
  projectId,
  projectNameStatus = "",
  onClose,
  onValidated,
  confirmLabel = "Open Documents",
  title = "Validate Project",
}: ValidationModalProps) {
  const [projectApiKey, setProjectApiKey] = useState("");
  const [modalError, setModalError] = useState("");
  const [isValidatingProject, setIsValidatingProject] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProjectApiKey("");
      setModalError("");
      setIsValidatingProject(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }
  const currentProject = project;
  const currentProjectId = currentProject?.id ?? projectId ?? "";

  async function handleValidate() {
    if (!currentProjectId) {
      setModalError("Project details are still loading.");
      return;
    }

    if (!projectApiKey.trim()) {
      setModalError("Enter the project API key.");
      return;
    }

    setIsValidatingProject(true);
    setModalError("");

    try {
      const isValid = await validateProjectKey(
        base_url,
        currentProjectId,
        projectApiKey.trim(),
      );

      if (!isValid) {
        setModalError("Invalid API key.");
        return;
      }

      sessionStorage.setItem(
        `project_api_key:${currentProjectId}`,
        projectApiKey.trim(),
      );
      onValidated(projectApiKey.trim());
    } catch {
      setModalError("Could not validate project.");
    } finally {
      setIsValidatingProject(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h2 className="text-2xl font-bold">{title}</h2>
        {currentProject ? (
          <>
            <p className="mt-4 text-lg font-semibold">{currentProject.name}</p>
            <p className="mt-2 text-sm opacity-70">ID: {currentProject.id}</p>
          </>
        ) : (
          <>
            <p className="mt-4 text-lg font-semibold">Loading project details</p>
            {currentProjectId ? (
              <p className="mt-2 text-sm opacity-70">ID: {currentProjectId}</p>
            ) : null}
            {projectNameStatus ? (
              <p className="mt-3 text-sm opacity-70">{projectNameStatus}</p>
            ) : null}
          </>
        )}

        <label className="form-control mt-6 w-full">
          <span className="label-text font-semibold">Project API key</span>
          <input
            type="password"
            className="input input-bordered mt-2 w-full"
            value={projectApiKey}
            onChange={(event) => setProjectApiKey(event.target.value)}
            placeholder="Please validate session with API key"
          />
        </label>

        {modalError ? (
          <p className="mt-3 text-sm font-medium text-error">{modalError}</p>
        ) : null}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleValidate}
            disabled={isValidatingProject || !currentProjectId || !currentProject}
          >
            {isValidatingProject ? "Checking..." : confirmLabel}
          </button>
        </div>
      </div>
      <button
        className="modal-backdrop"
        aria-label="Close validation modal"
        onClick={onClose}
      />
    </div>
  );
}
