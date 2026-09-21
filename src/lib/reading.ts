/** Include section headings and their immediate subheadings, in article order. */
export function contentsHeadings<T extends { depth: number }>(headings: T[]): T[] {
  const eligible = headings.filter(heading => heading.depth >= 2);
  const shallowest = Math.min(...eligible.map(heading => heading.depth));
  return eligible.filter(heading => heading.depth <= shallowest + 1);
}

/** Last heading that has crossed the reading line, including reverse scrolling. */
export function activeHeadingIndex(tops: number[], scrollY: number, offset = 112): number {
  let active = 0;
  for (let index = 0; index < tops.length; index++) {
    if (tops[index] <= scrollY + offset) active = index;
  }
  return active;
}
