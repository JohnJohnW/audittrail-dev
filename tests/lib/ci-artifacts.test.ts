import { describe, it, expect } from "vitest";
import { classifyArtifact } from "@/lib/ci-artifacts";

describe("ci-artifacts", () => {
  describe("classifyArtifact", () => {
    it("should classify SARIF artifacts", () => {
      expect(classifyArtifact("codeql-sarif-results")).toBe("sarif");
      expect(classifyArtifact("security-scan-sarif")).toBe("sarif");
    });

    it("should classify security scan tools as SARIF", () => {
      expect(classifyArtifact("snyk-results")).toBe("sarif");
      expect(classifyArtifact("semgrep-output")).toBe("sarif");
      expect(classifyArtifact("codeql-results")).toBe("sarif");
      expect(classifyArtifact("sast-report")).toBe("sarif");
    });

    it("should classify SBOM artifacts", () => {
      expect(classifyArtifact("sbom-output")).toBe("sbom");
      expect(classifyArtifact("cyclonedx-bom")).toBe("sbom");
      expect(classifyArtifact("spdx-document")).toBe("sbom");
      expect(classifyArtifact("software-bill-of-materials")).toBe("sbom");
    });

    it("should classify test report artifacts", () => {
      expect(classifyArtifact("junit-results")).toBe("test_report");
      expect(classifyArtifact("test-results-xml")).toBe("test_report");
      expect(classifyArtifact("test-report")).toBe("test_report");
      expect(classifyArtifact("xunit-output")).toBe("test_report");
    });

    it("should classify coverage artifacts", () => {
      expect(classifyArtifact("coverage-report")).toBe("coverage");
      expect(classifyArtifact("lcov-data")).toBe("coverage");
      expect(classifyArtifact("cobertura-xml")).toBe("coverage");
      expect(classifyArtifact("jacoco-report")).toBe("coverage");
    });

    it("should return unknown for unrecognized names", () => {
      expect(classifyArtifact("my-build-output")).toBe("unknown");
      expect(classifyArtifact("deployment-logs")).toBe("unknown");
      expect(classifyArtifact("random-artifact")).toBe("unknown");
    });
  });
});
