/**
 * Export Types
 */

// Export status values
export type ExportStatus = "pending" | "completed" | "failed";

// Export format options
export type ExportFormat = "pdf" | "csv";

/**
 * Export record for list display.
 */
export interface Export {
  id: string;
  fileName: string;
  format: ExportFormat;
  status: ExportStatus;
  createdAt: string;
  fileSize?: number;
}
