"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_RAAS_API_BASE_URL ?? "http://localhost:8000";
const HEALTH_CHECK_INTERVAL_MS = 15000;

type HealthResponse = {
  status?: string;
  chroma_ok?: boolean;
};

export default function Home() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      if (isMounted) {
        setIsCheckingHealth(true);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Health check failed");
        }

        const data = (await response.json()) as HealthResponse;
        const healthy = data.status === "ok" && data.chroma_ok !== false;

        if (isMounted) {
          setIsHealthy(healthy);
        }
      } catch {
        if (isMounted) {
          setIsHealthy(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingHealth(false);
        }
      }
    };

    void checkHealth();
    const intervalId = window.setInterval(checkHealth, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const statusText = isCheckingHealth
    ? "Checking server..."
    : isHealthy
      ? "Server is up"
      : "Server is down";
  const statusClass = isHealthy ? "status-success" : "status-error";

  return (
    <main className="min-h-screen bg-base-200 px-6 py-12 flex items-stretch">
      <div className="mx-auto flex w-full max-w-5xl flex-col justify-evenly items-center gap-6 text-center">
        <div className="hover-3d">
          <figure className="w-60 rounded-2xl bg-base-100 p-3 shadow-xl ring-1 ring-base-300">
            <Image
              src="/sk_icon.png"
              alt="RAAS icon card"
              width={160}
              height={160}
              priority
              className="h-auto w-full rounded-xl object-contain"
            />
          </figure>
          {/* 8 empty divs needed for the 3D effect */}
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="gap-6 flex flex-col">
          <h1 className="text-4xl font-extrabold tracking-tight text-base-content transition-colors duration-200 hover:text-primary md:text-6xl">
            RAAS Document Ingestion UI
          </h1>
          <p className="max-w-3xl text-base text-base-content/75 md:text-lg">
            Utility UI for creating projects, uploading documents, ingesting,
            and retrieving results from your RAAS API.
          </p>
        </div>

        <span className="text-rotate text-2xl font-semibold leading-[1.9] text-primary md:text-4xl">
          <span className="grid justify-items-center">
            <span>CREATE PROJECT</span>
            <span>UPLOAD DOCUMENTS</span>
            <span>CHUNK & EMBED</span>
            <span>INDEX VECTORS</span>
            <span>QUERY CONTEXT</span>
            <span>RETURN ANSWERS</span>
          </span>
        </span>
        <div className="flex flex-row items-center gap-6">
          <div className="flex flex-row items-center gap-4">
            <div className="inline-grid scale-125 *:[grid-area:1/1]">
              <div className={`status ${statusClass} animate-ping`}></div>
              <div className={`status ${statusClass}`}></div>
            </div>
            <span className="text-lg font-semibold md:text-2xl">{statusText}</span>
          </div>
          <button
            className={`btn btn-lg px-8 text-base md:text-lg ${
              isHealthy ? "btn-primary" : "btn-neutral"
            }`}
            disabled={!isHealthy}
          >
            Enter Site
          </button>
        </div>
      </div>
    </main>
  );
}
