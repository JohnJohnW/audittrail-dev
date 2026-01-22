/**
 * Loading Phrases
 *
 * Collection of funny/engaging loading messages to make waiting more enjoyable.
 */

const LOADING_PHRASES = [
  "Brewing compliance data...",
  "Counting commits like a boss...",
  "Summoning evidence from the void...",
  "Herding code reviews into compliance...",
  "Polishing compliance scores...",
  "Wrangling pull requests...",
  "Consulting the compliance oracle...",
  "Scanning for security secrets...",
  "Assembling evidence matrix...",
  "Decrypting compliance mysteries...",
  "Syncing with the GitHub force...",
  "Calibrating compliance sensors...",
  "Loading... (this is taking longer than expected)",
  "Almost there... (no, really!)",
  "Gathering evidence like a digital detective...",
  "Running compliance diagnostics...",
  "Processing... please hold (or don't, we're not your boss)",
  "Loading compliance data at the speed of bureaucracy...",
  "Fetching evidence from the evidence dimension...",
  "Calculating compliance with advanced math...",
  "Preparing your compliance report (with extra care)...",
  "Loading... because good things come to those who wait",
  "Spinning up compliance engines...",
  "Collecting evidence (and dust bunnies)...",
  "Analyzing code like a digital Sherlock...",
  "Loading... faster than a speeding compliance audit",
  "Gathering data (and snacks for later)...",
  "Processing compliance metrics...",
  "Loading... please enjoy this loading screen",
  "Assembling your compliance dashboard...",
  "Fetching evidence (and maybe coffee)...",
  "Loading... we're working as fast as we can (promise!)",
  "Calculating compliance scores with precision...",
  "Gathering evidence from all corners of GitHub...",
  "Loading... because perfection takes time",
  "Preparing compliance insights...",
  "Syncing repositories (and your patience)...",
  "Loading... almost as exciting as watching paint dry",
  "Processing data with care and attention...",
  "Gathering evidence like a digital pack rat...",
  "Loading... we're not lazy, we're thorough!",
] as const;

/**
 * Get a random loading phrase.
 * Uses a simple hash of the current time to provide pseudo-randomness
 * that changes over time but is consistent within a short window.
 *
 * @returns A random funny loading phrase
 */
export function getLoadingPhrase(): string {
  // Use a combination of time and a small random factor
  const index = Math.floor((Date.now() / 1000 + Math.random() * 10) % LOADING_PHRASES.length);
  return LOADING_PHRASES[index];
}

/**
 * Get a contextual loading phrase based on what's being loaded.
 *
 * @param context - The context of what's being loaded
 * @returns A contextual or random loading phrase
 */
export function getContextualLoadingPhrase(context?: string): string {
  const contextualPhrases: Record<string, string[]> = {
    compliance: [
      "Calculating compliance scores...",
      "Auditing your compliance status...",
      "Checking all the compliance boxes...",
      "Running compliance diagnostics...",
      "Assembling compliance evidence...",
    ],
    evidence: [
      "Gathering evidence from GitHub...",
      "Collecting compliance evidence...",
      "Scanning repositories for evidence...",
      "Assembling evidence matrix...",
      "Fetching evidence like a digital detective...",
    ],
    trends: [
      "Analyzing historical trends...",
      "Crunching numbers and dates...",
      "Plotting your compliance journey...",
      "Calculating trend metrics...",
      "Preparing trend visualizations...",
    ],
    repositories: [
      "Scanning your repositories...",
      "Syncing with GitHub...",
      "Fetching repository data...",
      "Loading repository information...",
      "Gathering repo details...",
    ],
    exports: [
      "Preparing your export...",
      "Generating compliance report...",
      "Assembling export data...",
      "Creating your downloadable report...",
      "Packaging compliance evidence...",
    ],
    settings: [
      "Loading settings...",
      "Fetching configuration...",
      "Preparing settings panel...",
      "Loading your preferences...",
    ],
  };

  if (context && contextualPhrases[context.toLowerCase()]) {
    const phrases = contextualPhrases[context.toLowerCase()];
    const index = Math.floor(Math.random() * phrases.length);
    return phrases[index];
  }

  return getLoadingPhrase();
}
