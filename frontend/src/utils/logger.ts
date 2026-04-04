export function logWarning(message: string, error?: unknown): void {
  console.warn(`[WARN] ${message}`, error);
}

export function logError(message: string, error?: unknown): void {
  console.error(`[ERROR] ${message}`, error);
}
