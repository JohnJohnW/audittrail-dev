import type { EvidenceStatus } from "@/types/api";

interface StatusBadgeProps {
  status: EvidenceStatus;
  size?: "sm" | "md";
}

const styles: Record<EvidenceStatus, string> = {
  has_evidence: "bg-green-50 text-green-700",
  partial: "bg-yellow-50 text-yellow-700",
  limited: "bg-blue-50 text-blue-700",
  no_evidence: "bg-red-50 text-red-700",
};

const labels: Record<EvidenceStatus, string> = {
  has_evidence: "Has Evidence",
  partial: "Partial",
  limited: "Limited",
  no_evidence: "Missing",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span className={`${sizeClasses} rounded font-medium ${styles[status]}`}>{labels[status]}</span>
  );
}
