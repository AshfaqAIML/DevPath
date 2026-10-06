// Registry of playable simulator experiences.
// Maps a ResourceItem slug to the concrete sandbox implementation.
// Items in the Simulators category without an entry here render the standard
// detail dialog (and remain drafts until their sandbox is built).
export const PLAYABLE_SIMULATORS: Record<string, "flexbox"> = {
  "css-flexbox-simulator": "flexbox",
};

export function isPlayableSimulator(slug: string): boolean {
  return slug in PLAYABLE_SIMULATORS;
}

export function simulatorViewHref(slug: string): string {
  return `/?view=simulator&sim=${slug}`;
}
