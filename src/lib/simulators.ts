// Registry of playable simulator experiences.
// Maps a ResourceItem slug to the concrete sandbox implementation.
// Items in the Simulators category without an entry here render the standard
// detail dialog (and remain drafts until their sandbox is built).
export type SimulatorKind = "flexbox" | "http" | "sql";

export const PLAYABLE_SIMULATORS: Record<string, SimulatorKind> = {
  "css-flexbox-simulator": "flexbox",
  "http-request-response-lab": "http",
  "sql-query-sandbox": "sql",
};

export function isPlayableSimulator(slug: string): boolean {
  return slug in PLAYABLE_SIMULATORS;
}

export function simulatorKind(slug: string): SimulatorKind | undefined {
  return PLAYABLE_SIMULATORS[slug];
}

export function simulatorViewHref(slug: string): string {
  return `/?view=simulator&sim=${slug}`;
}

// The hero spotlight features the most recently shipped sandbox.
export const SPOTLIGHT_SIM: { slug: string; label: string } = {
  slug: "sql-query-sandbox",
  label: "New: the SQL Query Sandbox",
};
