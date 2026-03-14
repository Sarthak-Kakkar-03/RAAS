"use client";

import type { ProjectPrivateInfo, ProjectPublicInfo } from "@/types/api";
import { validateProjectKey } from "@/app/utils/projectValidation";
import ValidationModal from "@/app/utils/validationModal";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_RAAS_API_BASE_URL ?? "http://localhost:8000";

export default function AppPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectPublicInfo[]>([]);
  const [receivedProjectList, setReceivedProjectList] = useState(false);
  const [requestingProjectList, setIsRequestingProjectList] = useState(true);
  const [selectedProject, setSelectedProject] =
    useState<ProjectPublicInfo | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createProjectName, setCreateProjectName] = useState("");
  const [createdNewProject, setCreatedNewProject] =
    useState<ProjectPrivateInfo | null>(null);
  const [createModalError, setCreateModalError] = useState("");
  const [createButtonActive, setCreateButtonActive] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState("");
  const [deleteProjectApiKey, setDeleteProjectApiKey] = useState("");
  const [deleteModalError, setDeleteModalError] = useState("");
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [deletedProjectId, setDeletedProjectId] = useState("");
  const [deleteButtonActive, setDeleteButtonActive] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let controller: AbortController | null = null;

    async function getProjectsList() {
      if (!isMounted) {
        return;
      }

      controller = new AbortController();

      if (isMounted) {
        setIsRequestingProjectList(true);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to receive project list from API");
        }

        const data = (await response.json()) as ProjectPublicInfo[];

        if (isMounted) {
          setProjects(data);
          setReceivedProjectList(true);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setReceivedProjectList(false);
        }
      } finally {
        if (isMounted) {
          setIsRequestingProjectList(false);
        }
      }
    }

    void getProjectsList();

    return () => {
      isMounted = false;
      controller?.abort();
    };
  }, []);

  function openCreateModal() {
    setCreateModalError("");
    setCreateProjectName("");
    setCreatedNewProject(null);
    setCreateModalOpen(true);
    setCreateButtonActive(true);
  }

  function closeCreateModal() {
    setCreateModalError("");
    setCreateProjectName("");
    setCreatedNewProject(null);
    setCreateModalOpen(false);
    setCreateButtonActive(false);
  }

  function openProjectModal(project: ProjectPublicInfo) {
    setSelectedProject(project);
  }

  function openDeleteModal() {
    setDeleteProjectId("");
    setDeleteProjectApiKey("");
    setDeleteModalError("");
    setDeletedProjectId("");
    setDeleteButtonActive(true);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setDeleteProjectId("");
    setDeleteProjectApiKey("");
    setDeleteModalError("");
    setDeletedProjectId("");
    setIsDeletingProject(false);
    setDeleteButtonActive(false);
    setDeleteModalOpen(false);
  }

  function closeProjectModal() {
    setSelectedProject(null);
  }

  async function handleProjectAction(project: ProjectPublicInfo) {
    const savedKey = sessionStorage.getItem(`project_api_key:${project.id}`);

    if (!savedKey) {
      openProjectModal(project);
      return;
    }

    const isValid = await validateProjectKey(
      API_BASE_URL,
      project.id,
      savedKey,
    );

    if (!isValid) {
      sessionStorage.removeItem(`project_api_key:${project.id}`);
      openProjectModal(project);
      return;
    }

    router.push(`/app/${project.id}`);
  }

  function handleProjectValidated() {
    if (!selectedProject) {
      return;
    }

    router.push(`/app/${selectedProject.id}`);
    closeProjectModal();
  }

  async function handleCreateProject() {
    if (!createProjectName.trim()) {
      setCreateModalError("Add project name!");
      return;
    }

    setCreateModalError("");
    setCreatedNewProject(null);
    setIsCreatingProject(true);

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createProjectName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Project creation failed");
      }

      const projectDetails = (await response.json()) as ProjectPrivateInfo;
      setCreatedNewProject(projectDetails);
      setProjects((currentProjects) => [
        ...currentProjects,
        { id: projectDetails.id, name: projectDetails.name },
      ]);
      setReceivedProjectList(true);
      setCreateProjectName("");
    } catch {
      setCreateModalError("Could not create project.");
    } finally {
      setIsCreatingProject(false);
      setCreateButtonActive(false);
    }
  }

  async function handleDeleteProject() {
    if (!deleteProjectId.trim()) {
      setDeleteModalError("Enter project ID.");
      return;
    }

    if (!deleteProjectApiKey.trim()) {
      setDeleteModalError("Enter project API key.");
      return;
    }

    setDeleteModalError("");
    setDeletedProjectId("");
    setIsDeletingProject(true);
    setDeleteButtonActive(true);

    try {
      const projectId = deleteProjectId.trim();

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${deleteProjectApiKey.trim()}`,
        },
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(errorBody?.detail ?? "Project deletion failed");
      }

      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId),
      );
      setDeletedProjectId(projectId);
      setDeleteProjectId("");
      setDeleteProjectApiKey("");
      setReceivedProjectList(true);
    } catch (error) {
      if (error instanceof Error) {
        setDeleteModalError(error.message);
      } else {
        setDeleteModalError("Could not delete project.");
      }
    } finally {
      setIsDeletingProject(false);
      setDeleteButtonActive(false);
    }
  }

  function renderCreateModal() {
    if (!createModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box">
          <h1 className="font-bold text-lg">Create Project</h1>
          <label className="form-control mt-6 w-full">
            <span className="label-text font-semibold">Project Name</span>
            <input
              type="text"
              className="input input-bordered mt-2 w-full"
              value={createProjectName}
              onChange={(event) => setCreateProjectName(event.target.value)}
              placeholder="Add project name to create"
            />
          </label>

          {createModalError ? (
            <p className="mt-3 text-sm font-medium text-error">
              {createModalError}
            </p>
          ) : null}

          {createdNewProject ? (
            <div className="mt-4 rounded-box bg-success/10 p-4 text-sm">
              <p className="font-semibold text-success">
                Project created successfully.
              </p>
              <p className="mt-2 font-medium text-warning">
                Copy the API key before closing this modal. It will not be shown
                again and cannot be recovered later.
              </p>
              <p className="mt-2">Name: {createdNewProject.name}</p>
              <p>ID: {createdNewProject.id}</p>
              <p>API Key: {createdNewProject.api_key}</p>
            </div>
          ) : null}

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={closeCreateModal}>
              {createdNewProject ? "Close" : "Cancel"}
            </button>
            <button
              className={`btn btn-success ${createButtonActive ? "btn-active" : "btn-disabled"}`}
              onClick={handleCreateProject}
              disabled={isCreatingProject}
            >
              {isCreatingProject ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close create project modal"
          onClick={closeCreateModal}
        />
      </div>
    );
  }

  function renderDeleteModal() {
    if (!deleteModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box gap-5">
          <h1 className="font-bold text-lg">Delete Project</h1>
          <p className="mt-2 text-sm opacity-70">
            Enter the project ID and API key to permanently delete a project.
          </p>

          <label className="form-control mt-6 w-full">
            <span className="label-text font-semibold">Project ID</span>
            <input
              type="text"
              className="input input-bordered mt-2 w-full"
              value={deleteProjectId}
              onChange={(event) => setDeleteProjectId(event.target.value)}
              placeholder="Enter project ID"
            />
          </label>

          <label className="form-control mt-4 w-full">
            <span className="label-text font-semibold">Project API key</span>
            <input
              type="password"
              className="input input-bordered mt-2 w-full"
              value={deleteProjectApiKey}
              onChange={(event) => setDeleteProjectApiKey(event.target.value)}
              placeholder="Enter project API key"
            />
          </label>

          {deleteModalError ? (
            <p className="mt-3 text-sm font-medium text-error">
              {deleteModalError}
            </p>
          ) : null}

          {deletedProjectId ? (
            <p className="mt-3 text-sm font-medium text-success">
              Deleted project {deletedProjectId}.
            </p>
          ) : null}

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={closeDeleteModal}>
              {deletedProjectId ? "Close" : "Cancel"}
            </button>
            <button
              className={`btn btn-error ${deleteButtonActive ? "btn-active" : "btn-disabled"}`}
              onClick={handleDeleteProject}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close delete project modal"
          onClick={closeDeleteModal}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-base-200 px-8 py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex justify-center">
          <h1 className="text-4xl font-extrabold text-primary">
            List Of Projects
          </h1>
        </div>

        <ul className="list rounded-box bg-base-100 shadow-md max-h-105 overflow-y-auto">
          <li className="p-4 pb-2 text-xs tracking-wide opacity-60">
            {requestingProjectList
              ? "Loading projects..."
              : receivedProjectList
                ? `${projects.length} projects found`
                : "Could not load projects"}
          </li>

          {projects.map((project, index) => (
            <li key={project.id} className="list-row">
              <div className="text-4xl font-thin tabular-nums opacity-30">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="flex size-10 items-center justify-center rounded-box bg-primary/10 font-semibold text-primary">
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="list-col-grow">
                <div className="text-xl">{project.name}</div>
                <div className="text-xs font-semibold uppercase opacity-60">
                  ID: {project.id}
                </div>
              </div>
              <button
                className="btn btn-square btn-ghost btn-primary"
                aria-label={`Open documents for ${project.name}`}
                onClick={() => void handleProjectAction(project)}
              >
                <svg
                  className="size-[1.2em]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <g
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeWidth="2"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M6 3L20 12 6 21 6 3z"></path>
                  </g>
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-evenly">
          <button
            className="btn btn-success btn-ghost btn-lg font-bold btn-outline"
            onClick={() => openCreateModal()}
          >
            Create Project
          </button>
          <button
            className="btn btn-error btn-ghost btn-lg font-bold btn-outline"
            onClick={openDeleteModal}
          >
            Delete Project
          </button>
        </div>
      </div>

      <ValidationModal
        base_url={API_BASE_URL}
        isOpen={selectedProject !== null}
        project={selectedProject}
        onClose={closeProjectModal}
        onValidated={handleProjectValidated}
      />
      {renderCreateModal()}
      {renderDeleteModal()}
    </main>
  );
}
