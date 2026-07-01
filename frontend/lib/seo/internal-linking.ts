/** Architecture placeholder — automatic internal linking arrives in Phase 3+. */

export type LinkableContent = {
  id: string;
  contentType: string;
  path: string;
  title: string;
};

export function suggestInternalLinks(_: LinkableContent): LinkableContent[] {
  return [];
}
