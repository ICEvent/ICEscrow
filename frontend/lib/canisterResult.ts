export function isCanisterOkResult(result: unknown): result is { ok: unknown } {
  return Boolean(
    result &&
      typeof result === 'object' &&
      'ok' in result &&
      (result as Record<string, unknown>).ok !== undefined,
  );
}

export function getCanisterErrorMessage(result: unknown, fallback = 'Request failed'): string {
  if (result && typeof result === 'object' && 'err' in result) {
    const err = (result as Record<string, unknown>).err;
    if (typeof err === 'string' && err.trim()) return err;
    if (err !== undefined && err !== null) return String(err);
  }
  return fallback;
}
