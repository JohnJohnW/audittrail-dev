/**
 * Loading Phrases
 *
 * Collection of funny/engaging loading messages to make waiting more enjoyable.
 */

const LOADING_PHRASES = [
  "Teaching hamsters to audit code...",
  "Consulting the ancient compliance scrolls...",
  "Asking the rubber duck for approval...",
  "Polishing the crystal ball...",
  "Teaching AI to count to infinity...",
  "Bribing the database with treats...",
  "Convincing electrons to line up properly...",
  "Teaching a cat to fetch evidence...",
  "Asking the cloud what it saw...",
  "Teaching robots to appreciate compliance...",
  "Negotiating with the loading bar...",
  "Teaching squirrels to organize commits...",
  "Asking the void for permission...",
  "Polishing the digital crystal...",
  "Teaching penguins to code review...",
  "Consulting the oracle of ones and zeros...",
  "Teaching a goldfish to remember...",
  "Asking the server nicely...",
  "Teaching clouds to count...",
  "Negotiating with the API gods...",
  "Teaching a potato to compute...",
  "Asking the internet politely...",
  "Teaching electrons to dance in formation...",
  "Consulting the great algorithm in the sky...",
  "Teaching a rubber chicken to debug...",
  "Asking the database to please cooperate...",
  "Teaching a houseplant to process data...",
  "Negotiating with the loading spinner...",
  "Teaching a rock to think...",
  "Asking the code to behave itself...",
  "Teaching a toaster to understand compliance...",
  "Consulting the mystical byte oracle...",
  "Teaching a paperclip to organize evidence...",
  "Asking the pixels to align properly...",
  "Teaching a stapler to calculate scores...",
  "Negotiating with the network gremlins...",
  "Teaching a coffee mug to process requests...",
  "Asking the server to wake up...",
  "Teaching a doorstop to analyze data...",
  "Consulting the wise old router...",
  "Teaching a lamp to illuminate evidence...",
  "Asking the bits to please cooperate...",
  "Teaching a paper airplane to fetch data...",
  "Negotiating with the loading gods...",
  "Teaching a rubber band to hold it together...",
  "Asking the database to stop napping...",
  "Teaching a stapler to compile evidence...",
  "Consulting the mystical loading spirits...",
  "Teaching a paperclip to organize commits...",
  "Asking the cloud to please stop raining...",
] as const;

/**
 * Get a random loading phrase.
 * Uses a simple hash of the current time to provide pseudo-randomness
 * that changes over time but is consistent within a short window.
 *
 * @returns A random funny loading phrase
 */
export function getLoadingPhrase(): string {
  // Guard: return a fixed phrase during SSR to avoid hydration mismatch.
  // Math.random() differs between server and client, causing React error #425.
  if (typeof window === "undefined") return LOADING_PHRASES[0];
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
      "Teaching auditors to count backwards...",
      "Asking the compliance fairy for help...",
      "Teaching a calculator to feel emotions...",
      "Consulting the score-keeping gnomes...",
      "Teaching a spreadsheet to dance...",
    ],
    evidence: [
      "Teaching detectives to use GitHub...",
      "Asking the evidence to please appear...",
      "Teaching a magnifying glass to scan code...",
      "Consulting the evidence-gathering squirrels...",
      "Teaching a filing cabinet to organize itself...",
    ],
    repositories: [
      "Teaching repositories to introduce themselves...",
      "Asking GitHub to please share its secrets...",
      "Teaching a folder to count its contents...",
      "Consulting the repository naming committee...",
      "Teaching a git to fetch politely...",
    ],
    exports: [
      "Teaching a printer to understand PDFs...",
      "Asking the export wizard for assistance...",
      "Teaching a document to format itself...",
      "Consulting the paper-shuffling robots...",
      "Teaching a file to download itself...",
    ],
    settings: [
      "Teaching preferences to remember themselves...",
      "Asking the settings to please configure...",
      "Teaching a toggle to toggle itself...",
      "Consulting the configuration oracle...",
      "Teaching a checkbox to check itself...",
    ],
  };

  if (context && contextualPhrases[context.toLowerCase()]) {
    const phrases = contextualPhrases[context.toLowerCase()];
    // Guard: return first phrase during SSR to avoid hydration mismatch (React error #425)
    if (typeof window === "undefined") return phrases[0];
    const index = Math.floor(Math.random() * phrases.length);
    return phrases[index];
  }

  return getLoadingPhrase();
}
