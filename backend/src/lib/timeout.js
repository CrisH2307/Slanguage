// src/lib/timeout.js
export async function withTimeout(exec, ms = 1600) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await exec({ signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
