import type { FocusEvent, MouseEvent } from 'react'

/*
 * Select an amount box's whole entry when it gains focus, so typing replaces
 * the number rather than appending to it. A click focuses on mousedown and
 * its mouseup would then drop the selection again (Safari, and Chrome when
 * the click lands inside the text), so the mouseup that follows the focus is
 * cancelled. Only that one: later clicks place the caret as usual.
 */
let justFocused: HTMLInputElement | null = null

export function selectOnFocus(e: FocusEvent<HTMLInputElement>): void {
  e.currentTarget.select()
  justFocused = e.currentTarget
}

export function keepSelectionOnMouseUp(e: MouseEvent<HTMLInputElement>): void {
  if (justFocused === e.currentTarget) e.preventDefault()
  justFocused = null
}
