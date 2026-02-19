# Retrieval-as-a-Service (RaaS)

Self-hosted UI + API to manage your RAG pipeline.

Upload documents → rebuild index → call one retrieval endpoint.

Designed to be simple, modular, and easy to plug into any LLM stack.

---

## What This Is

RaaS is a lightweight service that:

- Stores uploaded documents
- Automatically chunks + embeds them
- Indexes them into a vector database (Chroma)
- Exposes a simple `/retrieve` API endpoint

You can connect this to any LLM (OpenAI, Anthropic, local models, etc.).

This project handles retrieval infrastructure — not chatbot logic.

---

## Architecture

UI (React + TypeScript)  
↓  
FastAPI  
↓  
Worker (chunk + embed)  
↓  
Chroma (vector index)

Everything runs with Docker Compose.

---

## Features (MVP)

- File upload via UI
- Manual “Rebuild Index”
- Configurable chunk size + overlap
- Retrieval endpoint (`/retrieve`)
- Dockerized
- Model-agnostic

---

## Tech Stack

- FastAPI
- React + Vite + TypeScript
- Chroma (vector DB)
- OpenAI embeddings (configurable)
- Docker Compose

---

## Quick Start (Local)

### 1. Clone
```bash
git clone https://github.com/Sarthak-Kakkar-03/RAAS.git
cd RAAS
```
