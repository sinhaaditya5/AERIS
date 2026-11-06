/**
 * Shared formatting utilities for AERIS presentation.
 * Preserves honesty rules: no negative zero, clear sensitivity range labels, tabular figures.
 */

export function formatEtaHours(eta: number | null | undefined): string {
  if (eta == null || !Number.isFinite(eta)) return '—'
  if (eta <= 0) return 'Over receptors at forecast start'
  return `~${eta.toFixed(1)}h`
}

export function formatEtaRelative(eta: number | null | undefined): string {
  if (eta == null || !Number.isFinite(eta)) return 'Unavailable'
  if (eta <= 0) return 'Over receptors at forecast start'
  return `+${eta.toFixed(1)} h`
}

export function formatPopNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

