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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState("");
  const [deleteModalError, setDeleteModalError] = useState("");
  const [deletedDocumentId, setDeletedDocumentId] = useState("");
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

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
    if (isUploadingDocument) {
      return;
    }

    setSelectedFile(null);
    setUploadModalError("");
    setUploadedDocument(null);
    setIsUploadingDocument(false);
    setUploadModalOpen(false);
  }

  function openDeleteModal() {
    setDeleteDocumentId("");
    setDeleteModalError("");
    setDeletedDocumentId("");
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (isDeletingDocument) {
      return;
    }

    setDeleteDocumentId("");
    setDeleteModalError("");
    setDeletedDocumentId("");
    setDeleteModalOpen(false);
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

  async function handleDeleteDocument() {
    if (!deleteDocumentId.trim()) {
      setDeleteModalError("Enter the document ID.");
      return;
    }

    const apiKey = sessionStorage.getItem(`project_api_key:${projectId}`);

    if (!apiKey) {
      setDeleteModalError("Project session is not validated.");
      return;
    }

    setDeleteModalError("");
    setDeletedDocumentId("");
    setIsDeletingDocument(true);

    try {
      const docId = deleteDocumentId.trim();

      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/docs/${docId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete document.");
      }

      setDeletedDocumentId(docId);
      setDeleteDocumentId("");
      await retrieveDocumentInfo();
    } catch {
      setDeleteModalError("Could not delete document.");
    } finally {
      setIsDeletingDocument(false);
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
            <button
              className="btn btn-ghost"
              onClick={closeUploadModal}
              disabled={isUploadingDocument}
            >
              {uploadedDocument ? "Close" : "Cancel"}
            </button>
            <button
              className="btn btn-success"
              onClick={handleUploadDocument}
              disabled={isUploadingDocument || uploadedDocument !== null}
            >
              {isUploadingDocument
                ? "Uploading..."
                : uploadedDocument
                  ? "Uploaded"
                  : "Upload"}
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

  function renderDeleteModal() {
    if (!deleteModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box">
          <h1 className="text-lg font-bold">Delete Document</h1>
          <p className="mt-2 text-sm opacity-70">
            Enter a document ID to permanently delete it from this project.
          </p>

          <label className="form-control mt-6 w-full">
            <span className="label-text font-semibold">Document ID</span>
            <input
              type="text"
              className="input input-bordered mt-2 w-full"
              value={deleteDocumentId}
              onChange={(event) => setDeleteDocumentId(event.target.value)}
              placeholder="Enter document ID"
            />
          </label>

          {deleteModalError ? (
            <p className="mt-3 text-sm font-medium text-error">
              {deleteModalError}
            </p>
          ) : null}

          {deletedDocumentId ? (
            <div className="mt-4 rounded-box bg-success/10 p-4 text-sm">
              <p className="font-semibold text-success">
                Document deleted successfully.
              </p>
              <p className="mt-2">Document ID: {deletedDocumentId}</p>
            </div>
          ) : null}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={closeDeleteModal}
              disabled={isDeletingDocument}
            >
              {deletedDocumentId ? "Close" : "Cancel"}
            </button>
            <button
              className="btn btn-error"
              onClick={handleDeleteDocument}
              disabled={isDeletingDocument || deletedDocumentId !== ""}
            >
              {isDeletingDocument
                ? "Deleting..."
                : deletedDocumentId
                  ? "Deleted"
                  : "Delete"}
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close delete document modal"
          onClick={closeDeleteModal}
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
          <div className="max-h-105 overflow-x-auto overflow-y-auto">
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

                  </th>
                  <th>Name</th>
                  <th>Document ID</th>
                  <th>Status</th>
                  <th>Ingested</th>
                </tr>
              </thead>

              <tbody>

                {documentList.map((info, index) => (
                  <tr>
                    <th>
                      <span className="text-xl">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </th>
                    <td>
                      <span className="font-bold text-lg text-primary">
                        {`${info.filename}`}
                      </span>
                    </td>
                    <td>
                      <span className="text-accent">
                        {`${info.doc_id}`}
                      </span>
                    </td>
                    <td>
                      <span className="text-warning">
                        {`${info.status}`}
                      </span>
                    </td>
                    <td>
                      <span className={info.ingested ? "text-success" : "text-error"}>
                        {info.ingested ? "True" : "False"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th>

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
        <button className={`btn btn-xl btn-ghost btn-primary p-3 ${documentList.some((doc) => !doc.ingested) ? "" : "btn-disabled"}`}>
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
        <button
          className={`btn btn-xl btn-ghost btn-error p-3 ${documentList.length > 0 ? "" : "btn-disabled"}`}
          onClick={openDeleteModal}
        >
          <span>Delete</span>
        </button>
        <button className={`btn btn-xl btn-ghost btn-warning p-3 ${documentList.some((doc) => doc.ingested) ? "" : "btn-disabled"}`  }>
          <span>Retrieve</span>
        </button>
      </div>
      {renderUploadModal()}
      {renderDeleteModal()}
    </main>
  );
}
