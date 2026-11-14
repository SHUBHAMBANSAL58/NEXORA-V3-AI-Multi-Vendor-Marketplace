export function isSafeImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  );
}

export function buildProductImageCandidates(
  primaryUrl?: string | null,
  fallbackUrls?: ReadonlyArray<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  const appendIfValid = (raw?: string | null) => {
    if (!isSafeImageUrl(raw)) return;
    const normalized = raw!.trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      candidates.push(normalized);
    }
  };

  appendIfValid(primaryUrl);
  if (fallbackUrls) {
    for (const url of fallbackUrls) {
      appendIfValid(url);
    }
  }

  return candidates;
}
