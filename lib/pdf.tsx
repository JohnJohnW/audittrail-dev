import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ControlEvidence } from "./compliance";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    backgroundColor: "#f3f4f6",
    padding: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f9fafb",
    marginRight: 10,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  control: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  controlHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#f9fafb",
  },
  controlCode: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: "#e5e7eb",
    padding: 2,
  },
  controlTitle: {
    fontWeight: "bold",
    marginTop: 4,
  },
  statusBadge: {
    fontSize: 8,
    padding: 3,
    borderRadius: 2,
  },
  statusGreen: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusYellow: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  statusRed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  statusBlue: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  controlBody: {
    padding: 10,
  },
  description: {
    color: "#4b5563",
    marginBottom: 8,
  },
  evidenceList: {
    marginTop: 8,
  },
  evidenceItem: {
    backgroundColor: "#f9fafb",
    padding: 8,
    marginBottom: 6,
    borderRadius: 2,
  },
  evidenceTitle: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  evidenceDesc: {
    color: "#6b7280",
    fontSize: 9,
  },
  evidenceDate: {
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
  },
});

interface ExportPDFProps {
  orgName: string;
  frameworkName: string;
  generatedAt: Date;
  summary: {
    total: number;
    withEvidence: number;
    partial: number;
    limited?: number;
    noEvidence: number;
    score: number;
  };
  controls: ControlEvidence[];
  dateRange?: { from?: Date; to?: Date };
  repositories?: string[];
}

export function ExportPDF({
  orgName,
  frameworkName,
  generatedAt,
  summary,
  controls,
  dateRange,
  repositories,
}: ExportPDFProps) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Compliance Evidence Report</Text>
          <Text style={styles.subtitle}>{frameworkName}</Text>
          <Text style={[styles.subtitle, { marginTop: 8 }]}>Organization: {orgName}</Text>
          <Text style={styles.subtitle}>
            Generated: {generatedAt.toLocaleDateString()} at {generatedAt.toLocaleTimeString()}
          </Text>
          {dateRange && (dateRange.from || dateRange.to) && (
            <Text style={styles.subtitle}>
              Date Range: {dateRange.from ? dateRange.from.toLocaleDateString() : "Beginning"} -{" "}
              {dateRange.to ? dateRange.to.toLocaleDateString() : "Present"}
            </Text>
          )}
          {repositories && repositories.length > 0 && (
            <Text style={styles.subtitle}>Repositories: {repositories.length} selected</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.score}%</Text>
              <Text style={styles.summaryLabel}>Evidence Coverage</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "#16a34a" }]}>
                {summary.withEvidence}
              </Text>
              <Text style={styles.summaryLabel}>Full Evidence</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "#ca8a04" }]}>{summary.partial}</Text>
              <Text style={styles.summaryLabel}>Partial Evidence</Text>
            </View>
            <View style={[styles.summaryItem, { marginRight: 0 }]}>
              <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{summary.noEvidence}</Text>
              <Text style={styles.summaryLabel}>Missing Evidence</Text>
            </View>
          </View>
          <Text style={styles.description}>
            This report contains automatically collected evidence from GitHub repositories mapped to{" "}
            {frameworkName} compliance controls. Evidence includes commit history, pull request
            approvals, code reviews, and branch protection configurations.
          </Text>
        </View>

        <Text style={styles.footer}>Generated by Audit Trail - Compliance Infrastructure</Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>

      {/* Control Pages - wrap enabled for automatic pagination */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionTitle} fixed>
          Control Evidence Details
        </Text>

        {controls.map((control) => (
          <View key={control.controlId} style={styles.control} wrap={false}>
            <View style={styles.controlHeader}>
              <View>
                <Text style={styles.controlCode}>{control.controlCode}</Text>
                <Text style={styles.controlTitle}>{control.controlTitle}</Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  control.status === "has_evidence"
                    ? styles.statusGreen
                    : control.status === "partial"
                      ? styles.statusYellow
                      : control.status === "limited"
                        ? styles.statusBlue
                        : styles.statusRed,
                ]}
              >
                {control.status === "has_evidence"
                  ? "HAS EVIDENCE"
                  : control.status === "partial"
                    ? "PARTIAL"
                    : control.status === "limited"
                      ? "LIMITED"
                      : "MISSING"}
              </Text>
            </View>
            <View style={styles.controlBody}>
              {control.controlDescription && (
                <Text style={styles.description}>
                  {control.controlDescription.split("\n\n")[0]}
                </Text>
              )}
              <Text style={{ fontSize: 9, marginBottom: 4 }}>
                Evidence Count: {control.evidenceCount}
              </Text>
              {control.evidence.length > 0 && (
                <View style={styles.evidenceList}>
                  {control.evidence.slice(0, 5).map((item, idx) => (
                    <View key={idx} style={styles.evidenceItem}>
                      <Text style={styles.evidenceTitle}>{item.title}</Text>
                      <Text style={styles.evidenceDesc}>{item.description}</Text>
                      <Text style={styles.evidenceDate}>
                        {new Date(item.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                  {control.evidence.length > 5 && (
                    <Text style={{ fontSize: 8, color: "#6b7280" }}>
                      + {control.evidence.length - 5} more items
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Generated by Audit Trail - Compliance Infrastructure
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
