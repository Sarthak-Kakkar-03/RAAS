"use client";
import type {
  DocumentInfo,
  IngestBatchStatus,
  ProjectPublicInfo,
  QueryResponse,
  UploadDocumentStatus,
} from "@/types/api";
import { API_BASE_URL } from "@/app/utils/apiBaseUrl";
import ValidationModal from "@/app/utils/validationModal";
import { use, useEffect, useEffectEvent, useState } from "react";

type ProjectDashboardPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default function DashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = use(params);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationProject, setValidationProject] =
    useState<ProjectPublicInfo | null>(null);
  const [isLoadingValidationProject, setIsLoadingValidationProject] =
    useState(true);
  const [validationProjectError, setValidationProjectError] = useState("");
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
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [ingestModalError, setIngestModalError] = useState("");
  const [ingestResult, setIngestResult] = useState<IngestBatchStatus | null>(
    null,
  );
  const [isIngestingDocuments, setIsIngestingDocuments] = useState(false);
  const [retrieveModalOpen, setRetrieveModalOpen] = useState(false);
  const [retrieveQuery, setRetrieveQuery] = useState("");
  const [retrieveModalError, setRetrieveModalError] = useState("");
  const [retrieveResult, setRetrieveResult] = useState<QueryResponse | null>(
    null,
  );
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [directRetrieveEndpoint, setDirectRetrieveEndpoint] = useState("");
  const canIngestDocuments = documentList.some((doc) => !doc.ingested);
  const canRetrieveDocuments = documentList.some((doc) => doc.ingested);

  useEffect(() => {
    const apiBase = API_BASE_URL.startsWith("http")
      ? API_BASE_URL
      : typeof window !== "undefined"
        ? new URL(API_BASE_URL, window.location.origin).toString()
        : API_BASE_URL;
    setDirectRetrieveEndpoint(`${apiBase}/projects/${projectId}/query`);
  }, [projectId]);

  function openValidationModal() {
    setValidationModalOpen(true);
  }

  function closeValidationModal() {
    setValidationModalOpen(false);
  }

  function clearStoredProjectApiKey() {
    sessionStorage.removeItem(`project_api_key:${projectId}`);
  }

  function getStoredProjectApiKey() {
    const apiKey = sessionStorage.getItem(`project_api_key:${projectId}`);

    if (!apiKey) {
      openValidationModal();
      return null;
    }

    return apiKey;
  }

  async function handleProtectedResponse(response: Response) {
    if (response.ok) {
      return response;
    }

    const errorBody = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    const detail = errorBody?.detail?.toLowerCase() ?? "";
    const isAuthFailure =
      response.status === 401 ||
      response.status === 403 ||
      detail.includes("invalid api key") ||
      detail.includes("missing bearer token");

    if (isAuthFailure) {
      clearStoredProjectApiKey();
      openValidationModal();
    }

    throw new Error(errorBody?.detail ?? "Protected request failed.");
  }

  async function retrieveDocumentInfo(signal?: AbortSignal) {
    const apiKey = getStoredProjectApiKey();

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

    await handleProtectedResponse(response);

    const data = (await response.json()) as { documents: DocumentInfo[] };
    setDocumentList(data.documents);
  }

  const loadValidationProject = useEffectEvent(async (signal: AbortSignal) => {
    setIsLoadingValidationProject(true);
    setValidationProjectError("");

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: "GET",
        signal,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(errorBody?.detail ?? "Could not load project details.");
      }

      const project = (await response.json()) as ProjectPublicInfo;
      setValidationProject(project);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setValidationProject(null);
      setValidationProjectError(
        error instanceof Error
          ? error.message
          : "Could not load project details.",
      );
    } finally {
      setIsLoadingValidationProject(false);
    }
  });

  const loadDocuments = useEffectEvent(async (signal: AbortSignal) => {
    try {
      await retrieveDocumentInfo(signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    void loadValidationProject(controller.signal);

    return () => {
      controller.abort();
    };
  }, [projectId]);

  useEffect(() => {
    if (!sessionStorage.getItem(`project_api_key:${projectId}`)) {
      openValidationModal();
      return;
    }

    const controller = new AbortController();
    void loadDocuments(controller.signal);

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

  function openIngestModal() {
    if (!canIngestDocuments) {
      return;
    }

    setIngestModalError("");
    setIngestResult(null);
    setIngestModalOpen(true);
  }

  function openRetrieveModal() {
    if (!canRetrieveDocuments) {
      return;
    }

    setRetrieveQuery("");
    setRetrieveModalError("");
    setRetrieveResult(null);
    setRetrieveModalOpen(true);
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

  function closeIngestModal() {
    if (isIngestingDocuments) {
      return;
    }

    setIngestModalError("");
    setIngestResult(null);
    setIngestModalOpen(false);
  }

  function closeRetrieveModal() {
    if (isRetrieving) {
      return;
    }

    setRetrieveQuery("");
    setRetrieveModalError("");
    setRetrieveResult(null);
    setRetrieveModalOpen(false);
  }

  async function handleUploadDocument() {
    if (!selectedFile) {
      setUploadModalError("Choose a document to upload.");
      return;
    }

    const apiKey = getStoredProjectApiKey();

    if (!apiKey) {
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

      await handleProtectedResponse(response);

      const data = (await response.json()) as UploadDocumentStatus;
      setUploadedDocument(data);
      setSelectedFile(null);
      await retrieveDocumentInfo();
    } catch (error) {
      setUploadModalError(
        error instanceof Error ? error.message : "Could not upload document.",
      );
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function handleDeleteDocument() {
    if (!deleteDocumentId.trim()) {
      setDeleteModalError("Enter the document ID.");
      return;
    }

    const apiKey = getStoredProjectApiKey();

    if (!apiKey) {
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

      await handleProtectedResponse(response);

      setDeletedDocumentId(docId);
      setDeleteDocumentId("");
      await retrieveDocumentInfo();
    } catch (error) {
      setDeleteModalError(
        error instanceof Error ? error.message : "Could not delete document.",
      );
    } finally {
      setIsDeletingDocument(false);
    }
  }

  async function handleIngestDocuments() {
    const apiKey = getStoredProjectApiKey();

    if (!apiKey) {
      return;
    }

    setIngestModalError("");
    setIngestResult(null);
    setIsIngestingDocuments(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/ingest`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      await handleProtectedResponse(response);

      const data = (await response.json()) as IngestBatchStatus;
      setIngestResult(data);
      await retrieveDocumentInfo();
    } catch (error) {
      setIngestModalError(
        error instanceof Error ? error.message : "Could not ingest documents.",
      );
    } finally {
      setIsIngestingDocuments(false);
    }
  }

  async function handleRetrieveQuery() {
    if (!retrieveQuery.trim()) {
      setRetrieveModalError("Enter a query.");
      return;
    }

    const apiKey = getStoredProjectApiKey();

    if (!apiKey) {
      return;
    }

    setRetrieveModalError("");
    setRetrieveResult(null);
    setIsRetrieving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: retrieveQuery.trim(),
            top_k: 5,
          }),
        },
      );

      await handleProtectedResponse(response);

      const data = (await response.json()) as QueryResponse;
      setRetrieveResult(data);
    } catch (error) {
      setRetrieveModalError(
        error instanceof Error ? error.message : "Could not retrieve response.",
      );
    } finally {
      setIsRetrieving(false);
    }
  }

  function handleProjectValidated() {
    closeValidationModal();
    void retrieveDocumentInfo();
  }

  function renderUploadModal() {
    if (!uploadModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box max-h-[80vh] overflow-y-auto">
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

          {isUploadingDocument ? (
            <div className="mt-4 flex items-center gap-3 text-sm opacity-80">
              <span className="loading loading-infinity loading-md"></span>
              <span>Uploading document. Please wait.</span>
            </div>
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
                ? "Uploading"
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

          {isDeletingDocument ? (
            <div className="mt-4 flex items-center gap-3 text-sm opacity-80">
              <span className="loading loading-infinity loading-md"></span>
              <span>Deleting document. Please wait.</span>
            </div>
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
                ? "Deleting"
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

  function renderIngestModal() {
    if (!ingestModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box">
          <h1 className="text-lg font-bold">Ingest Documents</h1>
          <p className="mt-2 text-sm opacity-70">
            Confirm ingestion of all documents in this project that are not yet
            ingested.
          </p>

          {ingestModalError ? (
            <p className="mt-3 text-sm font-medium text-error">
              {ingestModalError}
            </p>
          ) : null}

          {isIngestingDocuments ? (
            <div className="mt-4 flex items-center gap-3 text-sm opacity-80">
              <span className="loading loading-infinity loading-md"></span>
              <span>Ingesting documents. Please wait.</span>
            </div>
          ) : null}

          {ingestResult ? (
            <div className="mt-4 rounded-box bg-success/10 p-4 text-sm">
              <p className="font-semibold text-success">
                Ingest completed successfully.
              </p>
              <p className="mt-2">Processed: {ingestResult.processed}</p>
              <p>Ingested: {ingestResult.ingested_count}</p>
              <p>Failed: {ingestResult.failed_count}</p>
            </div>
          ) : null}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={closeIngestModal}
              disabled={isIngestingDocuments}
            >
              {ingestResult ? "Close" : "Cancel"}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleIngestDocuments}
              disabled={isIngestingDocuments || ingestResult !== null}
            >
              {isIngestingDocuments
                ? "Ingesting"
                : ingestResult
                  ? "Ingested"
                  : "Ingest"}
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close ingest documents modal"
          onClick={closeIngestModal}
        />
      </div>
    );
  }

  function renderRetrieveModal() {
    if (!retrieveModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box">
          <h1 className="text-lg font-bold">Retrieve</h1>
          <p className="mt-2 text-sm opacity-70">
            Ask a query against the ingested documents in this project.
          </p>
          <div className="mt-4 rounded-box border border-warning/30 bg-warning/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Dev Endpoint
            </p>
            <p className="mt-2 text-sm">
              Use this route for direct retrieval testing in other dev work:
            </p>
            <div className="mt-3 rounded-box bg-base-100 px-3 py-2 font-mono text-xs break-all">
              <span className="font-semibold text-warning">POST</span>{" "}
              {directRetrieveEndpoint}
            </div>
          </div>

          <label className="form-control mt-6 w-full">
            <span className="label-text font-semibold">Query</span>
            <textarea
              className="textarea textarea-bordered mt-2 min-h-28 w-full"
              value={retrieveQuery}
              onChange={(event) => setRetrieveQuery(event.target.value)}
              placeholder="Ask a question about this project's documents"
            />
          </label>

          {retrieveModalError ? (
            <p className="mt-3 text-sm font-medium text-error">
              {retrieveModalError}
            </p>
          ) : null}

          {isRetrieving ? (
            <div className="mt-4 flex items-center gap-3 text-sm opacity-80">
              <span className="loading loading-infinity loading-md"></span>
              <span>Retrieving response. Please wait.</span>
            </div>
          ) : null}

          {retrieveResult ? (
            <div className="mt-4 max-h-[40vh] overflow-y-auto rounded-box bg-base-300 p-4 text-sm">
              <p className="font-semibold text-success">
                Retrieved {retrieveResult.results.length} result
                {retrieveResult.results.length === 1 ? "" : "s"} in{" "}
                {retrieveResult.latency_ms} ms.
              </p>
              {retrieveResult.results.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {retrieveResult.results.map((result) => (
                    <div
                      key={result.id}
                      className="rounded-box bg-base-100 p-3"
                    >
                      <p className="font-medium text-primary">{result.id}</p>
                      <p className="mt-1 text-xs opacity-60">
                        Distance: {result.distance}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap">{result.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2">No results were returned for this query.</p>
              )}
            </div>
          ) : null}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={closeRetrieveModal}
              disabled={isRetrieving}
            >
              {retrieveResult ? "Close" : "Cancel"}
            </button>
            <button
              className="btn btn-warning"
              onClick={handleRetrieveQuery}
              disabled={isRetrieving}
            >
              {isRetrieving ? "Retrieving" : "Retrieve"}
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close retrieve modal"
          onClick={closeRetrieveModal}
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
                  <th></th>
                  <th>Name</th>
                  <th>Document ID</th>
                  <th>Status</th>
                  <th>Ingested</th>
                </tr>
              </thead>

              <tbody>
                {documentList.map((info, index) => (
                  <tr key={info.doc_id}>
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
                      <span className="text-accent">{`${info.doc_id}`}</span>
                    </td>
                    <td>
                      <span className="text-warning">{`${info.status}`}</span>
                    </td>
                    <td>
                      <span
                        className={
                          info.ingested ? "text-success" : "text-error"
                        }
                      >
                        {info.ingested ? "True" : "False"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th></th>
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
        <button
          className={`btn btn-xl btn-ghost btn-primary p-3 ${canIngestDocuments ? "" : "btn-disabled"}`}
          onClick={openIngestModal}
          disabled={!canIngestDocuments}
        >
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
          onClick={async () => {
            try {
              await retrieveDocumentInfo();
            } catch (error) {
              console.error(
                "Failed to refresh document list via retrieveDocumentInfo.",
                error,
              );
            }
          }}
        >
          <span>Refresh List</span>
        </button>
        <button
          className={`btn btn-xl btn-ghost btn-error p-3 ${documentList.length > 0 ? "" : "btn-disabled"}`}
          onClick={openDeleteModal}
        >
          <span>Delete</span>
        </button>
        <button
          className={`btn btn-xl btn-ghost btn-warning p-3 ${canRetrieveDocuments ? "" : "btn-disabled"}`}
          onClick={openRetrieveModal}
          disabled={!canRetrieveDocuments}
        >
          <span>Retrieve</span>
        </button>
      </div>
      {renderUploadModal()}
      {renderDeleteModal()}
      {renderIngestModal()}
      {renderRetrieveModal()}
      <ValidationModal
        base_url={API_BASE_URL}
        isOpen={validationModalOpen}
        project={validationProject}
        projectId={projectId}
        projectNameStatus={
          isLoadingValidationProject
            ? "Loading project details."
            : validationProjectError
              ? `${validationProjectError} The API key cannot be revalidated until project details are available.`
              : ""
        }
        onClose={closeValidationModal}
        onValidated={handleProjectValidated}
        confirmLabel="Continue"
        title="Revalidate Project Session"
      />
    </main>
  );
}
