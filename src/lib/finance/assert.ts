/**
 * Tiny validation helper. The engine throws friendly, specific errors on
 * nonsensical input so the UI can surface them rather than rendering NaN.
 */
export class FinanceInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinanceInputError'
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new FinanceInputError(message)
}

export function assertFinite(value: number, label: string): void {
  assert(
    typeof value === 'number' && Number.isFinite(value),
    `${label} must be a finite number (received ${value}).`,
  )
}

export function assertNonNegative(value: number, label: string): void {
  assertFinite(value, label)
  assert(value >= 0, `${label} must be zero or greater (received ${value}).`)
}

export function assertPositive(value: number, label: string): void {
  assertFinite(value, label)
  assert(value > 0, `${label} must be greater than zero (received ${value}).`)
}
