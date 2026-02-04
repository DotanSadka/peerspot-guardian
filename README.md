
# PeerSpot Guardian (FPS v2)

**Security Division • v2.4.0**

## 🛡️ Project Goal
PeerSpot Guardian is a high-fidelity **Fraud Prevention System (FPS)** designed to validate user reviews through multimodal AI analysis. It cross-references audio interviews (voice liveness, behavioral patterns) against claimed user profiles (metadata, context files, screenshots) to detect inconsistencies, synthetic voices, and scripted responses.

## 🏗️ System Architecture

The system operates on a linear high-performance pipeline:

1.  **Ingestion Layer**:
    *   Accepts Audio files (Interview recordings).
    *   Accepts Context data (CSV, Text, or **Screenshots/Images**).
2.  **Normalization Engine (Gemini Flash)**:
    *   Converts unstructured raw text or image context into a standardized `User Profile`.
    *   Parses natural language rule adjustments into structured JSON logic.
3.  **Core Audit Engine (Gemini Pro)**:
    *   **Multimodal Analysis**: Processes Audio + Text Profile + System Instructions simultaneously.
    *   **Rule Execution**: Applies weighted scoring based on the dynamic "Fraud Dictionary".
    *   **Verdict Generation**: Produces a Risk Score (0-100), Confidence % and specific flags.
4.  **Persistence Layer**:
    *   **IndexedDB**: Stores audit logs, rule configurations, and system prompts locally within the browser for data privacy and offline capability.

## ⚡ Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **AI Models**:
    *   `gemini-3-pro-preview`: For deep reasoning, audio analysis, and final verdict logic.
    *   `gemini-3-flash-preview`: For rapid text extraction, profile building, and rule parsing.
*   **SDK**: Google GenAI SDK (`@google/genai`)
*   **Storage**: Browser Native IndexedDB (Custom wrapper)
*   **Icons**: FontAwesome 6

## 📂 Project Structure

The application follows a modular view-based architecture to separate concerns:

*   **`App.tsx`**: Main state controller and view orchestrator.
*   **`components/views/`**: Dedicated components for each application tab:
    *   `IngestionView`: Drag-and-drop media handling and profile extraction.
    *   `TuningView`: Logic matrix and natural language rule calibration.
    *   `SystemPromptView`: Core system instruction editors.
    *   `ArchitectureView`: Real-time system topology and metrics.
    *   `VerdictView` & `AnalysisView`: Results display and loading states.
    *   `LogsView` & `QueueView`: History and workflow management.
*   **`services/`**:
    *   `geminiService.ts`: AI model integration logic.
    *   `memoryService.ts`: IndexedDB abstraction for persistence.
*   **`constants.tsx`**: Centralized configuration for AI models, prompts, and default rules.

## 🚀 Key Features

*   **Multimodal Context**: Drag-and-drop support for analyzing screenshots of user data alongside audio.
*   **Interactive Tuner**: Modify fraud detection rules using natural language (e.g., "Penalize synthetic voices more heavily") or direct table editing.
*   **Profile Builder**: Auto-extracts "Job Title", "Company", "Email" from messy raw logs.
*   **Live Dashboard**: "Architecture" tab visualizes system topology and real-time metrics.
*   **Review Queue**: Flag suspicious audits for manual follow-up management.

## 📦 Setup

1.  Clone the repository.
2.  Ensure you have a valid Google Gemini API Key.
3.  The application expects the API key to be available in `process.env.API_KEY`.
4.  Run via your preferred development server (e.g., Vite, Parcel).

## 🧩 Model Configuration

The system is hardcoded to use specific models for specific tasks to optimize cost and latency:

| Task | Model | Reason |
|------|-------|--------|
| **Fraud Audit** | `gemini-3-pro-preview` | Requires high reasoning for audio/text discrepancies. |
| **Profile Extraction** | `gemini-3-flash-preview` | Fast token processing for standardizing text/images. |
| **Rule Parsing** | `gemini-3-flash-preview` | Low latency instruction following. |

---
*Internal Tool - PeerSpot Security Division*
