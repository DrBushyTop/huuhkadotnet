/** Last heading that has crossed the reading line, including reverse scrolling. */
export function activeHeadingIndex(tops: number[], scrollY: number, offset = 112): number {
  let active = 0;
  for (let index = 0; index < tops.length; index++) {
    if (tops[index] <= scrollY + offset) active = index;
  }
  return active;
}
