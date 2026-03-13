"use client";

import type { ProjectPublicInfo } from "@/types/api";
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
  const [projectApiKey, setProjectApiKey] = useState("");
  const [isValidatingProject, setIsValidatingProject] = useState(false);
  const [modalError, setModalError] = useState("");

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

  function openProjectModal(project: ProjectPublicInfo) {
    setSelectedProject(project);
    setProjectApiKey("");
    setModalError("");
  }

  function closeProjectModal() {
    setSelectedProject(null);
    setProjectApiKey("");
    setModalError("");
    setIsValidatingProject(false);
  }

  async function handleProjectOpen() {
    if (!selectedProject) {
      return;
    }

    if (!projectApiKey.trim()) {
      setModalError("Enter the project API key.");
      return;
    }

    setIsValidatingProject(true);
    setModalError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${selectedProject.id}/validate`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${projectApiKey.trim()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Project validation failed");
      }

      const isValid = (await response.json()) as boolean;

      if (!isValid) {
        setModalError("Invalid API key.");
        return;
      }

      sessionStorage.setItem(
        `project_api_key:${selectedProject.id}`,
        projectApiKey.trim(),
      );
      router.push(`/app/${selectedProject.id}/docs`);
    } catch {
      setModalError("Could not validate project.");
    } finally {
      setIsValidatingProject(false);
    }
  }

  return (
    <main className="min-h-screen bg-base-200 px-8 py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex justify-center">
          <h1 className="text-4xl font-extrabold text-primary">
            List Of Projects
          </h1>
        </div>

        <ul className="list rounded-box bg-base-100 shadow-md max-h-[420px] overflow-y-auto">
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
                onClick={() => openProjectModal(project)}
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
          <button className="btn btn-success btn-ghost btn-lg font-bold btn-outline">
            Create Project
          </button>
          <button className="btn btn-error btn-ghost btn-lg font-bold btn-outline">
            Delete Project
          </button>
        </div>
      </div>

      {selectedProject ? (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
            <p className="mt-2 text-sm opacity-70">ID: {selectedProject.id}</p>

            <label className="form-control mt-6 w-full">
              <span className="label-text font-semibold">Project API key</span>
              <input
                type="password"
                className="input input-bordered mt-2 w-full"
                value={projectApiKey}
                onChange={(event) => setProjectApiKey(event.target.value)}
                placeholder="Enter API key"
              />
            </label>

            {modalError ? (
              <p className="mt-3 text-sm font-medium text-error">{modalError}</p>
            ) : null}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={closeProjectModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleProjectOpen}
                disabled={isValidatingProject}
              >
                {isValidatingProject ? "Checking..." : "Open Documents"}
              </button>
            </div>
          </div>
          <button
            className="modal-backdrop"
            aria-label="Close modal"
            onClick={closeProjectModal}
          />
        </div>
      ) : null}
    </main>
  );
}
