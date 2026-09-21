/** Include section headings and their immediate subheadings, in article order. */
export function contentsHeadings<T extends { depth: number }>(headings: T[]): T[] {
  const eligible = headings.filter(heading => heading.depth >= 2);
  const shallowest = Math.min(...eligible.map(heading => heading.depth));
  return eligible.filter(heading => heading.depth <= shallowest + 1);
}

/** Track the upper third of the viewport, below the header and no deeper than 320px. */
export function activeHeadingIndex(tops: number[], scrollY: number, viewportHeight: number): number {
  const offset = Math.max(112, Math.min(viewportHeight / 3, 320));
  let active = 0;
  for (let index = 0; index < tops.length; index++) {
    if (tops[index] <= scrollY + offset) active = index;
  }
  return active;
}
