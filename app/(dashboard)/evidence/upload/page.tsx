"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";
import { getContextualLoadingPhrase } from "@/lib/utils/loading-phrases";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  controlCodes: string[];
  status: "processing";
  uploadedAt: string;
}

type FileCategory = "pdf" | "image" | "audio" | "video" | null;

interface StagedFile {
  file: File;
  category: FileCategory;
  sizeError: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES: Record<string, { category: FileCategory; maxBytes: number; label: string }> =
  {
    "application/pdf": { category: "pdf", maxBytes: 25 * 1024 * 1024, label: "PDF" },
    "image/png": { category: "image", maxBytes: 10 * 1024 * 1024, label: "PNG" },
    "image/jpeg": { category: "image", maxBytes: 10 * 1024 * 1024, label: "JPEG" },
    "audio/mpeg": { category: "audio", maxBytes: 50 * 1024 * 1024, label: "MP3" },
    "audio/wav": { category: "audio", maxBytes: 50 * 1024 * 1024, label: "WAV" },
    "video/mp4": { category: "video", maxBytes: 50 * 1024 * 1024, label: "MP4" },
    "video/quicktime": { category: "video", maxBytes: 50 * 1024 * 1024, label: "MOV" },
  };

const ACCEPT_STRING =
  ".pdf,.png,.jpg,.jpeg,.mp3,.wav,.mp4,.mov,application/pdf,image/png,image/jpeg,audio/mpeg,audio/wav,video/mp4,video/quicktime";

function validateFile(file: File): { category: FileCategory; sizeError: string | null } {
  const config = ACCEPTED_TYPES[file.type];
  if (!config) return { category: null, sizeError: "Unsupported file type" };
  if (file.size > config.maxBytes) {
    const limitMB = config.maxBytes / (1024 * 1024);
    return {
      category: config.category,
      sizeError: `${config.label} files must be under ${limitMB} MB (this file is ${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
    };
  }
  return { category: config.category, sizeError: null };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FileCategoryIcon({ category, className }: { category: FileCategory; className?: string }) {
  if (category === "pdf") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (category === "image") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (category === "audio") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    );
  }
  if (category === "video") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

const categoryStyles: Record<
  NonNullable<FileCategory>,
  { icon: string; bg: string; border: string }
> = {
  pdf: { icon: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  image: { icon: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  audio: { icon: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
  video: { icon: "text-green-500", bg: "bg-green-50", border: "border-green-200" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EvidenceUploadPage() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [staged, setStaged] = useState<StagedFile | null>(null);
  const [description, setDescription] = useState("");
  const [controlCodes, setControlCodes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    checkProStatus();
  }, []);

  const checkProStatus = async () => {
    try {
      const res = await fetch("/api/dashboards/grc");
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        setIsPro(body?.code !== "PRO_REQUIRED");
      } else if (res.ok) {
        setIsPro(true);
      } else {
        setIsPro(false);
      }
    } catch (error) {
      logger.error("Failed to check pro status", error);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  const stageFile = useCallback((file: File) => {
    const { category, sizeError } = validateFile(file);
    setStaged({ file, category, sizeError });
    setUploadError(null);
    setSuccessBanner(false);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) stageFile(file);
    },
    [stageFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
    // Reset input so the same file can be reselected after clearing
    e.target.value = "";
  };

  const clearStaged = () => {
    setStaged(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!staged || staged.sizeError || !isPro) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", staged.file);
      if (description.trim()) formData.append("description", description.trim());
      if (controlCodes.trim()) formData.append("controlCodes", controlCodes.trim());

      const res = await fetch("/api/evidence/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.requiresUpgrade) {
          setIsPro(false);
          return;
        }
        throw new Error(body?.error || `Upload failed (${res.status})`);
      }

      const data: UploadedFile & { status: "processing" } = await res.json();

      setUploadedFiles((prev) => [
        {
          ...data,
          uploadedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setSuccessBanner(true);
      setStaged(null);
      setDescription("");
      setControlCodes("");
    } catch (error) {
      logger.error("Evidence upload failed", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">{getContextualLoadingPhrase("evidence")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Upload Evidence
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Upload files that get embedded via Gemini and stored in your evidence vector store
          </p>
        </div>
      </FadeIn>

      {/* Upload Form */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <CardTitle>Upload Evidence File</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Pro Gate Banner */}
            {!isPro && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-200 rounded-xl p-4"
              >
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <WarningIcon className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-800">
                      Pro feature: multimodal evidence upload requires an upgrade
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Uploading PDFs, images, audio, and video evidence is a Pro feature. Pro also
                      unlocks AI-powered mapping, the auditor portal, and unlimited frameworks.
                    </p>
                    <Link
                      href="/settings"
                      className="inline-block mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 transition-colors"
                    >
                      Upgrade to Pro →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              {/* Accepted Formats Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    { category: "pdf" as const, label: "PDF", formats: "Up to 25 MB" },
                    { category: "image" as const, label: "Images", formats: "PNG, JPEG · 10 MB" },
                    { category: "audio" as const, label: "Audio", formats: "MP3, WAV · 50 MB" },
                    { category: "video" as const, label: "Video", formats: "MP4, MOV · 50 MB" },
                  ] as const
                ).map(({ category, label, formats }) => {
                  const styles = categoryStyles[category];
                  return (
                    <div
                      key={category}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border",
                        styles.bg,
                        styles.border
                      )}
                    >
                      <FileCategoryIcon
                        category={category}
                        className={cn("w-5 h-5 flex-shrink-0", styles.icon)}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500 truncate">{formats}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => isPro && fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200",
                  dragOver && isPro
                    ? "border-accent bg-accent/5 scale-[1.01]"
                    : isPro
                      ? "border-gray-300 bg-gray-50/50 hover:border-accent hover:bg-accent/5 cursor-pointer"
                      : "border-gray-200 bg-gray-50/30 cursor-not-allowed opacity-60"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_STRING}
                  onChange={handleFileInput}
                  className="sr-only"
                  disabled={!isPro}
                />

                {staged ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    {staged.category && (
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center mb-3",
                          categoryStyles[staged.category].bg
                        )}
                      >
                        <FileCategoryIcon
                          category={staged.category}
                          className={cn(
                            "w-7 h-7",
                            staged.category ? categoryStyles[staged.category].icon : "text-gray-400"
                          )}
                        />
                      </div>
                    )}
                    <p className="font-medium text-gray-900 text-sm mb-0.5">{staged.file.name}</p>
                    <p className="text-xs text-gray-500 mb-3">{formatFileSize(staged.file.size)}</p>
                    {staged.sizeError ? (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <XIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{staged.sizeError}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckIcon className="w-4 h-4 flex-shrink-0" />
                        <span>Ready to upload</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearStaged();
                      }}
                      className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
                    >
                      Choose a different file
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                        dragOver && isPro ? "bg-accent/10" : "bg-gray-100"
                      )}
                    >
                      <UploadIcon
                        className={cn(
                          "w-7 h-7",
                          dragOver && isPro ? "text-accent" : "text-gray-400"
                        )}
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {dragOver && isPro
                        ? "Drop file here"
                        : "Drag & drop a file, or click to browse"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF · PNG · JPEG · MP3 · WAV · MP4 · MOV
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isPro}
                  rows={3}
                  placeholder="Describe the evidence: what it covers, when it was captured, relevant context..."
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Control Codes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Control Codes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={controlCodes}
                  onChange={(e) => setControlCodes(e.target.value)}
                  disabled={!isPro}
                  placeholder="e.g. A.5.1, SOC2-CC1.1, E8-MFA"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Comma-separated control codes to associate this evidence with specific controls.
                  Leave blank to let AI infer mappings automatically.
                </p>
              </div>

              {/* Upload Error */}
              <AnimatePresence>
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                  >
                    <XIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Button */}
              <div className="flex justify-end">
                <Button
                  variant="accent"
                  onClick={handleUpload}
                  disabled={!isPro || !staged || !!staged.sizeError || uploading}
                  loading={uploading}
                  className="min-w-[160px]"
                >
                  {uploading ? "Uploading..." : "Upload Evidence"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Success Banner */}
      <AnimatePresence>
        {successBanner && (
          <FadeIn delay={0}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">
                    Evidence uploaded. Embedding in progress
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Your file is being embedded via Gemini and stored in the vector store. This may
                    take 30–60 seconds before it becomes searchable.
                  </p>
                </div>
                <button
                  onClick={() => setSuccessBanner(false)}
                  className="ml-auto text-green-400 hover:text-green-600 transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </FadeIn>
        )}
      </AnimatePresence>

      {/* Uploaded Files (session) */}
      <FadeIn delay={0.2}>
        <Card padding="none" variant="elevated">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Uploaded This Session</h2>
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UploadIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500">No files uploaded yet. Select a file above to begin.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {uploadedFiles.map((f, index) => {
                const category = f.fileType.startsWith("image/")
                  ? ("image" as const)
                  : f.fileType === "application/pdf"
                    ? ("pdf" as const)
                    : f.fileType.startsWith("audio/")
                      ? ("audio" as const)
                      : f.fileType.startsWith("video/")
                        ? ("video" as const)
                        : null;
                const styles = category ? categoryStyles[category] : null;

                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                          styles ? styles.bg : "bg-gray-100"
                        )}
                      >
                        <FileCategoryIcon
                          category={category}
                          className={cn("w-5 h-5", styles ? styles.icon : "text-gray-400")}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{f.fileName}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-sm text-gray-500">
                            {new Date(f.uploadedAt).toLocaleTimeString()}
                          </p>
                          {f.controlCodes.length > 0 && (
                            <span className="text-xs text-gray-400">
                              · {f.controlCodes.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="warning" dot>
                      {f.status}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
