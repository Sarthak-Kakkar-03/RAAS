"use client";
import { ProjectPublicInfo } from "@/types/api";
import { useEffect, useState } from "react";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_RAAS_API_BASE_URL ?? "http://localhost:8000";

export default function AppPage() {
  const [, setProjects] = useState<ProjectPublicInfo[]>([]);
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
    <main className="min-h-screen bg-base-200 px-6 py-12">
      <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-4xl font-bold text-base-content md:text-5xl">
          RAAS App
        </h1>
        <p className="max-w-2xl text-base text-base-content/75 md:text-lg">
          This is a basic placeholder for the main application area.
        </p>
      </div>
    </main>
  );
}
