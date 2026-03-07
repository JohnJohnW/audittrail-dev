"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";
import { getContextualLoadingPhrase } from "@/lib/utils/loading-phrases";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  url: string;
  description: string | null;
  pushedAt: string;
  isTracked: boolean;
  isActive: boolean;
}

interface RepoData {
  connected: boolean;
  githubAccount?: string;
  repositories: Repository[];
  error?: string;
}

export default function RepositoriesPage() {
  const [data, setData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/github/repositories");
      const result = await response.json();
      setData(result);

      if (result.repositories) {
        const activeIds = result.repositories
          .filter((r: Repository) => r.isActive)
          .map((r: Repository) => r.id);
        setSelectedRepos(new Set(activeIds));
      }
    } catch (_err) {
      setError("Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRepo = (repoId: number) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/github/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryIds: Array.from(selectedRepos) }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to save repositories");
        return;
      }

      await fetchRepositories();
    } catch (_err) {
      setError("Failed to save repositories");
    } finally {
      setSaving(false);
    }
  };

  const filteredRepos = useMemo(() => {
    return (
      data?.repositories?.filter((repo) =>
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    );
  }, [data?.repositories, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">{getContextualLoadingPhrase("repositories")}</p>
        </div>
      </div>
    );
  }

  if (!data?.connected) {
    return (
      <FadeIn>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <GitHubIcon className="w-10 h-10 text-gray-500" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Connect GitHub</h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {data?.error
                ? data.error
                : "Connect your GitHub account to start tracking repositories for compliance evidence."}
            </p>
            <Button
              variant="primary"
              href="/api/auth/signin/github?callbackUrl=/repositories"
              size="lg"
            >
              <GitHubIcon className="w-5 h-5 mr-2" />
              {data?.error ? "Reconnect GitHub" : "Connect GitHub"}
            </Button>
            <p className="text-sm text-gray-400 mt-4">
              We request read-only access to your repositories.
            </p>
          </div>
        </div>
      </FadeIn>
    );
  }

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Repositories
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Connected as <span className="font-medium text-gray-900">{data.githubAccount}</span>.
              Select repositories to track.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Badge variant="default" size="md">
              {selectedRepos.size} selected
            </Badge>
            <Button variant="accent" onClick={handleSave} loading={saving} disabled={saving}>
              {saving ? "Saving..." : "Save Selection"}
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <p className="text-red-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <FadeIn delay={0.1}>
        <div className="mb-6">
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<SearchIcon />}
            className="max-w-md"
          />
        </div>
      </FadeIn>

      {/* Repository List */}
      <FadeIn delay={0.2}>
        <Card padding="none" variant="elevated">
          <div className="divide-y divide-gray-100">
            {filteredRepos.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FolderIcon className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-gray-500">No repositories found.</p>
              </div>
            ) : (
              filteredRepos.map((repo, index) => (
                <motion.label
                  key={repo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.01)" }}
                  className="flex items-center p-5 cursor-pointer transition-colors group"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={selectedRepos.has(repo.id)}
                      onChange={() => handleToggleRepo(repo.id)}
                      className="sr-only"
                    />
                    <motion.div
                      animate={{
                        backgroundColor: selectedRepos.has(repo.id) ? "#F97316" : "#fff",
                        borderColor: selectedRepos.has(repo.id) ? "#F97316" : "#d1d5db",
                      }}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                      )}
                    >
                      <AnimatePresence>
                        {selectedRepos.has(repo.id) && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{repo.fullName}</span>
                      {repo.private && (
                        <Badge variant="default" size="sm">
                          Private
                        </Badge>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{repo.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">
                      Last pushed: {new Date(repo.pushedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <AnimatePresence>
                    {repo.isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Badge variant="success" size="sm" dot>
                          Tracked
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.label>
              ))
            )}
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

// Icons
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}
