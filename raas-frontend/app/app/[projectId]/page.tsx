"use client";

import type {
  DocumentInfo,
  IngestBatchStatus,
  ProjectPublicInfo,
  QueryResponse,
  RelevanceCheckResponse,
  RetrievalSummaryResponse,
  RetrievalTraceInfo,
  RetrievalTraceListResponse,
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

type DashboardView = "documents" | "traces";

export default function DashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = use(params);
  const [activeView, setActiveView] = useState<DashboardView>("documents");
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationProject, setValidationProject] =
    useState<ProjectPublicInfo | null>(null);
  const [isLoadingValidationProject, setIsLoadingValidationProject] =
    useState(true);
  const [validationProjectError, setValidationProjectError] = useState("");
  const [documentList, setDocumentList] = useState<DocumentInfo[]>([]);
  const [traceList, setTraceList] = useState<RetrievalTraceInfo[]>([]);
  const [traceSummary, setTraceSummary] =
    useState<RetrievalSummaryResponse | null>(null);
  const [isLoadingTraceView, setIsLoadingTraceView] = useState(false);
  const [traceViewError, setTraceViewError] = useState("");
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
  const [relevanceModalOpen, setRelevanceModalOpen] = useState(false);
  const [relevanceText, setRelevanceText] = useState("");
  const [relevanceThreshold, setRelevanceThreshold] = useState("");
  const [relevanceModalError, setRelevanceModalError] = useState("");
  const [relevanceResult, setRelevanceResult] =
    useState<RelevanceCheckResponse | null>(null);
  const [isCheckingRelevance, setIsCheckingRelevance] = useState(false);
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

  async function retrieveTraceInfo(signal?: AbortSignal) {
    const apiKey = getStoredProjectApiKey();

    if (!apiKey) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/queries`,
      {
        method: "GET",
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    await handleProtectedResponse(response);

    const data = (await response.json()) as RetrievalTraceListResponse;
    setTraceList(data.traces);
  }

  async function retrieveTraceSummary(signal?: AbortSignal) {
    const apiKey = getStoredProjectApiKey();

    if (!apiKey) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/queries/summary`,
      {
        method: "GET",
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    await handleProtectedResponse(response);

    const data = (await response.json()) as RetrievalSummaryResponse;
    setTraceSummary(data);
  }

  async function retrieveTraceViewData(signal?: AbortSignal) {
    await Promise.all([
      retrieveTraceInfo(signal),
      retrieveTraceSummary(signal),
    ]);
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

  const loadProjectData = useEffectEvent(async (signal: AbortSignal) => {
    try {
      await Promise.all([
        retrieveDocumentInfo(signal),
        retrieveTraceViewData(signal),
      ]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  });

  const loadTraceView = useEffectEvent(async (signal?: AbortSignal) => {
    setIsLoadingTraceView(true);
    setTraceViewError("");

    try {
      await retrieveTraceViewData(signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setTraceViewError(
        error instanceof Error ? error.message : "Could not load trace view.",
      );
    } finally {
      setIsLoadingTraceView(false);
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
    void loadProjectData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [projectId]);

  useEffect(() => {
    if (activeView !== "traces") {
      return;
    }

    if (!sessionStorage.getItem(`project_api_key:${projectId}`)) {
      openValidationModal();
      return;
    }

    const controller = new AbortController();
    void loadTraceView(controller.signal);

    return () => {
      controller.abort();
    };
  }, [activeView, projectId]);

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

  function openRelevanceModal() {
    if (!canRetrieveDocuments) {
      return;
    }

    setRelevanceText("");
    setRelevanceThreshold("");
    setRelevanceModalError("");
    setRelevanceResult(null);
    setRelevanceModalOpen(true);
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

  function closeRelevanceModal() {
    if (isCheckingRelevance) {
      return;
    }

    setRelevanceText("");
    setRelevanceThreshold("");
    setRelevanceModalError("");
    setRelevanceResult(null);
    setRelevanceModalOpen(false);
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
      await retrieveTraceViewData();
    } catch (error) {
      setRetrieveModalError(
        error instanceof Error ? error.message : "Could not retrieve response.",
      );
    } finally {
      setIsRetrieving(false);
    }
  }

  async function handleRelevanceCheck() {
    if (!relevanceText.trim()) {
      setRelevanceModalError("Enter text to check.");
      return;
    }

    const apiKey = getStoredProjectApiKey();

    if (!apiKey) {
      return;
    }

    const trimmedThreshold = relevanceThreshold.trim();
    const parsedThreshold =
      trimmedThreshold === "" ? null : Number(trimmedThreshold);

    if (
      parsedThreshold !== null &&
      (!Number.isFinite(parsedThreshold) || parsedThreshold < 0)
    ) {
      setRelevanceModalError("Threshold must be a non-negative number.");
      return;
    }

    setRelevanceModalError("");
    setRelevanceResult(null);
    setIsCheckingRelevance(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/relevance-check`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: relevanceText.trim(),
            top_k: 5,
            ...(parsedThreshold !== null
              ? { distance_threshold: parsedThreshold }
              : {}),
          }),
        },
      );

      await handleProtectedResponse(response);

      const data = (await response.json()) as RelevanceCheckResponse;
      setRelevanceResult(data);
    } catch (error) {
      setRelevanceModalError(
        error instanceof Error
          ? error.message
          : "Could not check text relevance.",
      );
    } finally {
      setIsCheckingRelevance(false);
    }
  }

  function handleProjectValidated() {
    closeValidationModal();
    void Promise.all([retrieveDocumentInfo(), retrieveTraceViewData()]);
  }

  function formatTimestamp(value: string | null) {
    if (!value) {
      return "Never";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  }

  function formatDistance(value: number) {
    return Number.isFinite(value) ? value.toFixed(4) : "n/a";
  }

  function formatMetadata(value: Record<string, unknown> | null | undefined) {
    if (!value) {
      return "No metadata";
    }

    return JSON.stringify(value, null, 2);
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
            <div className="mt-3 break-all rounded-box bg-base-100 px-3 py-2 font-mono text-xs">
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

  function renderRelevanceModal() {
    if (!relevanceModalOpen) {
      return null;
    }

    return (
      <div className="modal modal-open gap-3">
        <div className="modal-box max-h-[85vh] overflow-y-auto">
          <h1 className="text-lg font-bold">Check Relevance</h1>
          <p className="mt-2 text-sm opacity-70">
            Submit any text and compare it to the ingested content in this
            project. The API returns raw distance and can optionally flag the
            text when it exceeds a threshold.
          </p>

          <label className="form-control mt-6 w-full">
            <span className="label-text font-semibold">Text</span>
            <textarea
              className="textarea textarea-bordered mt-2 min-h-32 w-full"
              value={relevanceText}
              onChange={(event) => setRelevanceText(event.target.value)}
              placeholder="Paste the text you want to compare against this project's content"
            />
          </label>

          <label className="form-control mt-4 w-full">
            <span className="label-text font-semibold">Distance threshold</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input input-bordered mt-2 w-full"
              value={relevanceThreshold}
              onChange={(event) => setRelevanceThreshold(event.target.value)}
              placeholder="Optional, e.g. 0.8"
            />
            <span className="label-text-alt mt-2 text-base-content/60">
              Leave blank to see the distance without flagging.
            </span>
          </label>

          {relevanceModalError ? (
            <p className="mt-3 text-sm font-medium text-error">
              {relevanceModalError}
            </p>
          ) : null}

          {isCheckingRelevance ? (
            <div className="mt-4 flex items-center gap-3 text-sm opacity-80">
              <span className="loading loading-infinity loading-md"></span>
              <span>Checking relevance. Please wait.</span>
            </div>
          ) : null}

          {relevanceResult ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-box border border-base-300 bg-base-300 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`badge ${
                      relevanceResult.flagged ? "badge-error" : "badge-success"
                    } badge-outline`}
                  >
                    {relevanceResult.flagged ? "Flagged" : "Not Flagged"}
                  </span>
                  <span className="badge badge-outline">
                    {relevanceResult.hit_count} hit
                    {relevanceResult.hit_count === 1 ? "" : "s"}
                  </span>
                  <span className="badge badge-outline">
                    {relevanceResult.latency_ms} ms
                  </span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                      Minimum Distance
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {relevanceResult.min_distance === null
                        ? "n/a"
                        : formatDistance(relevanceResult.min_distance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                      Threshold
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {relevanceResult.distance_threshold === null
                        ? "Not provided"
                        : formatDistance(relevanceResult.distance_threshold)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-base-content/60">
                  Model: {relevanceResult.embedding_model} | Metric:{" "}
                  {relevanceResult.distance_metric}
                </p>
              </div>

              <div className="max-h-[36vh] space-y-3 overflow-y-auto">
                {relevanceResult.results.length > 0 ? (
                  relevanceResult.results.map((result) => (
                    <div
                      key={result.id}
                      className="rounded-box border border-base-300 bg-base-100 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-primary">
                          {result.id}
                        </span>
                        <span className="badge badge-accent badge-outline">
                          {formatDistance(result.distance)}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm">
                        {result.text || "No text returned for this hit."}
                      </p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                        Metadata
                      </p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono text-xs text-base-content/75">
                        {formatMetadata(result.metadata)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="rounded-box border border-base-300 bg-base-100 p-4 text-sm text-base-content/60">
                    No results were returned for this text.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={closeRelevanceModal}
              disabled={isCheckingRelevance}
            >
              {relevanceResult ? "Close" : "Cancel"}
            </button>
            <button
              className="btn btn-accent"
              onClick={handleRelevanceCheck}
              disabled={isCheckingRelevance}
            >
              {isCheckingRelevance ? "Checking" : "Check Relevance"}
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close relevance check modal"
          onClick={closeRelevanceModal}
        />
      </div>
    );
  }

  function renderDocumentView() {
    return (
      <div className="rounded-box border border-base-300 bg-base-100 shadow-sm">
        <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-base-content">
              Document List
            </h2>
            <p className="mt-1 text-sm text-base-content/65">
              {documentList.length > 0
                ? `Displaying ${documentList.length} document${documentList.length === 1 ? "" : "s"}`
                : "No documents have been uploaded yet."}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Document ID</th>
                <th>Status</th>
                <th>Ingested</th>
                <th>Chunks</th>
              </tr>
            </thead>
            <tbody>
              {documentList.length > 0 ? (
                documentList.map((info, index) => (
                  <tr key={info.doc_id}>
                    <th className="text-base-content/50">
                      {String(index + 1).padStart(2, "0")}
                    </th>
                    <td className="font-semibold text-primary">
                      {info.filename}
                    </td>
                    <td className="font-mono text-xs text-accent">
                      {info.doc_id}
                    </td>
                    <td>
                      <span className="badge badge-warning badge-outline">
                        {info.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${info.ingested ? "badge-success" : "badge-error"} badge-soft`}
                      >
                        {info.ingested ? "Ingested" : "Pending"}
                      </span>
                    </td>
                    <td>{info.num_chunks}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-base-content/60"
                  >
                    Upload a document to populate this table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderTraceView() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="stat rounded-box border border-base-300 bg-base-100 shadow-sm">
            <div className="stat-title">Total Queries</div>
            <div className="stat-value text-primary">
              {traceSummary?.total_queries ?? 0}
            </div>
            <div className="stat-desc">
              Last queried:{" "}
              {formatTimestamp(traceSummary?.last_queried_at ?? null)}
            </div>
          </div>
          <div className="stat rounded-box border border-base-300 bg-base-100 shadow-sm">
            <div className="stat-title">Avg Latency</div>
            <div className="stat-value text-secondary">
              {traceSummary ? `${traceSummary.avg_latency_ms}ms` : "0ms"}
            </div>
            <div className="stat-desc">
              Avg hits per query: {traceSummary?.avg_hit_count ?? 0}
            </div>
          </div>
          <div className="stat rounded-box border border-base-300 bg-base-100 shadow-sm">
            <div className="stat-title">Zero Hit Queries</div>
            <div className="stat-value text-warning">
              {traceSummary?.zero_hit_queries ?? 0}
            </div>
            <div className="stat-desc">
              Filtered queries: {traceSummary?.filtered_queries ?? 0}
            </div>
          </div>
          <div className="stat rounded-box border border-base-300 bg-base-100 shadow-sm">
            <div className="stat-title">Recent Traces</div>
            <div className="stat-value text-accent">{traceList.length}</div>
            <div className="stat-desc">
              Latest retrieval events from the API.
            </div>
          </div>
        </div>

        <div className="rounded-box border border-base-300 bg-base-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold text-base-content">
                Trace View
              </h2>
              <p className="mt-1 text-sm text-base-content/65">
                Recent retrieval traces captured by the backend query routes.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                void loadTraceView();
              }}
              disabled={isLoadingTraceView}
            >
              {isLoadingTraceView ? "Refreshing" : "Refresh Traces"}
            </button>
          </div>

          {traceViewError ? (
            <div className="px-6 pt-5">
              <div className="alert alert-error">{traceViewError}</div>
            </div>
          ) : null}

          {isLoadingTraceView ? (
            <div className="flex items-center gap-3 px-6 py-10 text-sm text-base-content/70">
              <span className="loading loading-spinner loading-md"></span>
              <span>Loading retrieval traces.</span>
            </div>
          ) : traceList.length > 0 ? (
            <div className="space-y-4 p-6">
              {traceList.map((trace) => (
                <div
                  key={trace.event_id}
                  className="collapse collapse-arrow rounded-box border border-base-300 bg-base-200"
                >
                  <input
                    type="checkbox"
                    aria-label={`Toggle trace ${trace.event_id}`}
                  />
                  <div className="collapse-title pr-14">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge badge-primary badge-outline">
                            {trace.event_id}
                          </span>
                          <span className="badge badge-neutral badge-outline">
                            top_k {trace.top_k}
                          </span>
                          <span className="badge badge-success badge-outline">
                            {trace.hit_count} hit
                            {trace.hit_count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 font-mono text-sm text-base-content">
                          {trace.query}
                        </p>
                      </div>
                      <div className="text-sm text-base-content/65">
                        {formatTimestamp(trace.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="collapse-content px-5 pb-5">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-box bg-base-100 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                          Latency
                        </p>
                        <p className="mt-2 text-lg font-semibold text-secondary">
                          {trace.latency_ms} ms
                        </p>
                      </div>
                      <div className="rounded-box bg-base-100 p-4 lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                          Query
                        </p>
                        <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-base-content/85">
                          {trace.query}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-box bg-base-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                        Filters
                      </p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono text-xs text-base-content/75">
                        {trace.where
                          ? JSON.stringify(trace.where, null, 2)
                          : "No filters"}
                      </pre>
                    </div>

                    <div className="mt-4 space-y-3">
                      {trace.top_hit_ids.length > 0 ? (
                        trace.top_hit_ids.map((hitId, index) => (
                          <div
                            key={`${trace.event_id}-${hitId}-${index}`}
                            className="rounded-box border border-base-300 bg-base-100 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="badge badge-outline">
                                Rank {index + 1}
                              </span>
                              <span className="badge badge-accent badge-outline">
                                {formatDistance(
                                  trace.top_hit_distances[index] ?? NaN,
                                )}
                              </span>
                            </div>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                              Chunk ID
                            </p>
                            <p className="mt-1 break-all font-mono text-xs">
                              {hitId}
                            </p>
                            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                              Chunk Text
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/85">
                              {trace.top_hit_texts[index] ||
                                "No chunk text stored."}
                            </p>
                            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                              Metadata
                            </p>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono text-xs text-base-content/75">
                              {formatMetadata(trace.top_hit_metadatas[index])}
                            </pre>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-box border border-base-300 bg-base-100 p-4 text-base-content/60">
                          No top hits were stored for this trace.
                        </div>
                      )}
                    </div>

                    {trace.top_hit_ids.length > 0 ? (
                      <div className="mt-4 overflow-x-auto">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Top Hit ID</th>
                              <th>Distance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trace.top_hit_ids.map((hitId, index) => (
                              <tr
                                key={`${trace.event_id}-summary-${hitId}-${index}`}
                              >
                                <td className="font-mono text-xs">{hitId}</td>
                                <td>
                                  {formatDistance(
                                    trace.top_hit_distances[index] ?? NaN,
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-base-content/60">
              No retrieval traces yet. Run a query to populate this view.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-base-200 px-6 py-10 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-box border border-base-300 bg-base-100 px-6 py-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
              Project Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-bold text-primary">
              {validationProject?.name ?? "Project Workspace"}
            </h1>
            <p className="mt-2 text-sm text-base-content/65">
              Project ID: <span className="font-mono">{projectId}</span>
            </p>
          </div>
          <div className="tabs tabs-box bg-base-200 p-1">
            <button
              type="button"
              className={`tab px-6 ${activeView === "documents" ? "tab-active" : ""}`}
              onClick={() => setActiveView("documents")}
            >
              Document View
            </button>
            <button
              type="button"
              className={`tab px-6 ${activeView === "traces" ? "tab-active" : ""}`}
              onClick={() => setActiveView("traces")}
            >
              Trace View
            </button>
          </div>
        </div>

        {activeView === "documents" ? renderDocumentView() : renderTraceView()}

        <div className="flex flex-wrap justify-center gap-3 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
          <button
            className={`btn btn-primary ${canIngestDocuments ? "" : "btn-disabled"}`}
            onClick={openIngestModal}
            disabled={!canIngestDocuments}
          >
            Ingest
          </button>
          <button className="btn btn-success" onClick={openUploadModal}>
            Upload
          </button>
          <button
            className={`btn btn-accent ${canRetrieveDocuments ? "" : "btn-disabled"}`}
            onClick={openRelevanceModal}
            disabled={!canRetrieveDocuments}
          >
            Check Relevance
          </button>
          <button
            className={`btn btn-error ${documentList.length > 0 ? "" : "btn-disabled"}`}
            onClick={openDeleteModal}
            disabled={documentList.length === 0}
          >
            Delete
          </button>
          <button
            className={`btn btn-warning ${canRetrieveDocuments ? "" : "btn-disabled"}`}
            onClick={openRetrieveModal}
            disabled={!canRetrieveDocuments}
          >
            Retrieve
          </button>
        </div>
      </div>
      {renderUploadModal()}
      {renderDeleteModal()}
      {renderIngestModal()}
      {renderRetrieveModal()}
      {renderRelevanceModal()}
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
