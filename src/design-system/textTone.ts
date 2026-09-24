/*
 * The colour to print text in, given a series colour.
 *
 * Series colours are chosen for lines and fills, where 3:1 against the page
 * is enough. Text needs 4.5:1, and one of them, the gold, is too light for
 * it, so wherever a component prints a value in its series colour (a Stat, a
 * chart's headline figures) the gold is swapped for its darker text shade.
 */
export function textTone(color: string): string
export function textTone(color: string | undefined): string | undefined
export function textTone(color: string | undefined): string | undefined {
  return color?.replace('var(--c-series-2)', 'var(--c-series-2-text)')
}
