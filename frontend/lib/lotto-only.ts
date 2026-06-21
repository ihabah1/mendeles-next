/**
 * Lotto-only public mode — 777 / Toto visible only to staff or when DEV_GAMES is on.
 * Default: public sees only Lotto.
 */
export function canAccessDevGames(isStaff: boolean): boolean {
  if (isStaff) return true;
  if (process.env.NEXT_PUBLIC_DEV_GAMES === "true") return true;
  return false;
}

export function isPublicLottoOnly(): boolean {
  return process.env.NEXT_PUBLIC_LOTTO_ONLY !== "false";
}

export function filterSearchTargets<T extends { href: string }>(
  items: T[],
  isStaff: boolean,
): T[] {
  if (canAccessDevGames(isStaff)) return items;
  return items.filter((i) => !i.href.startsWith("/toto") && !i.href.startsWith("/seven77"));
}
