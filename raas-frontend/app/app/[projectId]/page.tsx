"use client";
import type { DocumentInfo, UploadDocumentStatus } from "@/types/api";
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadModalError, setUploadModalError] = useState("");
  const [uploadedDocument, setUploadedDocument] =
    useState<UploadDocumentStatus | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  async function retrieveDocumentInfo(signal?: AbortSignal) {
    const apiKey = sessionStorage.getItem(`project_api_key:${projectId}`);

    if (!apiKey) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/documents`,
      {
        method: "GET",
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to retrieve list of Documents from API");
    }

    const data = (await response.json()) as { documents: DocumentInfo[] };
    setDocumentList(data.documents);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadDocuments() {
      try {
        await retrieveDocumentInfo(controller.signal);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    void loadDocuments();

    return () => {
      controller.abort();
    };
  }, [projectId]);

  function openUploadModal() {
    setSelectedFile(null);
    setUploadModalError("");
    setUploadedDocument(null);
    setUploadModalOpen(true);
  }

  function closeUploadModal() {
    setSelectedFile(null);
    setUploadModalError("");
    setUploadedDocument(null);
    setIsUploadingDocument(false);
    setUploadModalOpen(false);
  }

  async function handleUploadDocument() {
    if (!selectedFile) {
      setUploadModalError("Choose a document to upload.");
      return;
    }

    const apiKey = sessionStorage.getItem(`project_api_key:${projectId}`);

    if (!apiKey) {
      setUploadModalError("Project session is not validated.");
      return;
    }

    setUploadModalError("");
    setUploadedDocument(null);
    setIsUploadingDocument(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to upload document.");
      }

      const data = (await response.json()) as UploadDocumentStatus;
      setUploadedDocument(data);
      setSelectedFile(null);
      await retrieveDocumentInfo();
    } catch {
      setUploadModalError("Could not upload document.");
    } finally {
      setIsUploadingDocument(false);
    }
  }

  function renderUploadModal() {
    if (!uploadModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box">
          <h1 className="text-lg font-bold">Upload Document</h1>
          <p className="mt-2 text-sm opacity-70">
            Select a file to upload into this project.
          </p>

          <label className="form-control mt-6 w-full">
            <span className="label-text font-semibold">Document file</span>
            <input
              type="file"
              className="file-input file-input-ghost mt-2 w-full"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
            />
          </label>

          {uploadModalError ? (
            <p className="mt-3 text-sm font-medium text-error">
              {uploadModalError}
            </p>
          ) : null}

          {uploadedDocument ? (
            <div className="mt-4 rounded-box bg-success/10 p-4 text-sm">
              <p className="font-semibold text-success">
                Document uploaded successfully.
              </p>
              <p className="mt-2">Filename: {uploadedDocument.filename}</p>
              <p>Document ID: {uploadedDocument.doc_id}</p>
            </div>
          ) : null}

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={closeUploadModal}>
              {uploadedDocument ? "Close" : "Cancel"}
            </button>
            <button
              className="btn btn-success"
              onClick={handleUploadDocument}
              disabled={isUploadingDocument}
            >
              {isUploadingDocument ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close upload document modal"
          onClick={closeUploadModal}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-between items-stretch bg-base-200 px-8 py-12">
      <div>
        <div className="">
          <div className="px-4">
            <h1 className="font-bold text-5xl text-primary">
              Project Dashboard
            </h1>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div>
            <h2 className="font-bold text-3xl text-white">Document List</h2>
          </div>
          <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
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
                  <th>Document ID</th>
                  <th>Status</th>
                  <th>Ingested</th>
                </tr>
              </thead>

              <tbody>

                {documentList.map((info) => (
                  <tr>
                    <th>
                      <label>
                        <input type="checkbox" className="checkbox" />
                      </label>
                    </th>
                    <td>
                      <span>
                        {`${info.filename}`}
                      </span>
                    </td>
                    <td>
                      <span>
                        {`${info.doc_id}`}
                      </span>
                    </td>
                    <td>
                      <span>
                        {`${info.status}`}
                      </span>
                    </td>
                    <td>
                      <span>
                        {`${info.ingested}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th>
                    <label>
                      <input type="checkbox" className="checkbox" />
                    </label>
                  </th>
                  <th>Name</th>
                  <th>Document ID</th>
                  <th>Status</th>
                  <th>Ingested</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-row justify-evenly p-3">
        <button className="btn btn-xl btn-ghost btn-primary p-3">
          <span>Ingest</span>
        </button>
        <button
          className="btn btn-xl btn-ghost btn-success p-3"
          onClick={openUploadModal}
        >
          <span>Upload</span>
        </button>
        <button
          className="btn btn-xl btn-ghost btn-accent p-3"
          onClick={() => void retrieveDocumentInfo()}
        >
          <span>Refresh List</span>
        </button>
        <button className="btn btn-xl btn-ghost btn-error p-3">
          <span>Delete</span>
        </button>
      </div>
      {renderUploadModal()}
    </main>
  );
}
