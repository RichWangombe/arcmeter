export function nowIso(): string {
  return new Date().toISOString();
}

export function secondsFromNowIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
