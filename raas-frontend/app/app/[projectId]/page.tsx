"use client";
import type { DocumentInfo } from "@/types/api";
import { use, useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_RAAS_API_BASE_URL ?? "http://localhost:8000";

type ProjectDashboardPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default function DashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = use(params);
  const [documentList, setDocumentList] = useState<DocumentInfo[]>([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function retrieveDocumentInfo() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/projects/${projectId}/documents`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new Error("Failed to retrieve list of Documents from API");
        }

        const data = (await response.json()) as { documents: DocumentInfo[] };

        if (isMounted) {
          setDocumentList(data.documents);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    void retrieveDocumentInfo();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [projectId]);

  return (
    <main className="min-h-screen bg-base-200 px-8 py-12">
      <div className="flex flex-col items-stretch">
        <div className="px-4">
          <h1 className="font-bold text-5xl text-primary">Project Dashboard</h1>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div>
          <h2 className="font-bold text-3xl text-white">Document List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>
                  {documentList.length > 0
                    ? `Displaying ${documentList.length} documents`
                    : "Found 0 documents"}
                </th>
              </tr>
              <tr>
                <th>
                  <label>
                    <input type="checkbox" className="checkbox" />
                  </label>
                </th>
                <th>Name</th>
                <th>Job</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <th>
                  <label>
                    <input type="checkbox" className="checkbox" />
                  </label>
                </th>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="mask mask-squircle h-12 w-12">
                        <img
                          src="https://img.daisyui.com/images/profile/demo/2@94.webp"
                          alt="Avatar Tailwind CSS Component"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">Hart Hagerty</div>
                      <div className="text-sm opacity-50">United States</div>
                    </div>
                  </div>
                </td>
                <td>
                  Zemlak, Daniel and Leannon
                  <br />
                  <span className="badge badge-ghost badge-sm">
                    Desktop Support Technician
                  </span>
                </td>
                <td>Purple</td>
                <th>
                  <button className="btn btn-ghost btn-xs">details</button>
                </th>
              </tr>
            </tbody>

            <tfoot>
              <tr>
                <th>
                  <label>
                    <input type="checkbox" className="checkbox" />
                  </label>
                </th>
                <th>Name</th>
                <th>Job</th>
                <th>Status</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  );
}
