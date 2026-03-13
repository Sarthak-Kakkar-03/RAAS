"use client";

import type { ProjectPublicInfo } from "@/types/api";
import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_RAAS_API_BASE_URL ?? "http://localhost:8000";

export default function AppPage() {
  const [projects, setProjects] = useState<ProjectPublicInfo[]>([]);
  const [receivedProjectList, setReceivedProjectList] = useState(false);
  const [requestingProjectList, setIsRequestingProjectList] = useState(true);

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
              <button className="btn btn-square btn-ghost btn-primary" aria-label="Resume project">
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
          <button className="btn btn-success font-bold btn-ghost btn-outline btn-lg">Create Project</button>
          <button className="btn btn-error font-bold btn-ghost btn-outline btn-lg">Delete Project</button>
        </div>
      </div>
    </main>
  );
}
