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

export function getThrownErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
