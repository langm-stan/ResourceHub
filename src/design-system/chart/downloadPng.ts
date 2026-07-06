/*
 * Save a rendered chart SVG as a PNG suitable for pasting into slides.
 *
 * The chart marks reference CSS custom properties (var(--c-series-1) etc.),
 * which resolve against the document. A detached SVG image has no access to
 * those, so before serializing we copy each element's computed presentation
 * styles inline. The PNG is rendered at 2x for projector-quality output, on
 * the page background color so it looks right on a light slide.
 */

const STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'display',
] as const

export interface ExportStat {
  label: string
  value: string
  /** Resolved CSS color for the value; defaults to the page's ink color. */
  color?: string
}

export interface ExportExtras {
  /** Headline stats drawn above the chart so the PNG is self-contained. */
  stats?: ExportStat[]
  /** Caption text drawn below the chart. */
  caption?: string
}

const UI_FONT =
  '"InterVariable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

/** Wrap text into lines that fit maxWidth at the current ctx font. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = trial
    }
  }
  if (line) lines.push(line)
  return lines
}

export function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  extras: ExportExtras = {}
): void {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const sources = [svg, ...Array.from(svg.querySelectorAll<SVGElement>('*'))]
  const targets = [clone, ...Array.from(clone.querySelectorAll<SVGElement>('*'))]
  sources.forEach((el, i) => {
    const computed = window.getComputedStyle(el)
    const target = targets[i]
    if (!target) return
    for (const prop of STYLE_PROPS) {
      target.style.setProperty(prop, computed.getPropertyValue(prop))
    }
  })

  const width = svg.viewBox.baseVal?.width || svg.clientWidth
  const height = svg.viewBox.baseVal?.height || svg.clientHeight
  const bodyStyle = window.getComputedStyle(document.body)
  const background = bodyStyle.backgroundColor || '#ffffff'
  const ink = bodyStyle.color || '#1f1c19'

  const xml = new XMLSerializer().serializeToString(clone)
  const svgUrl = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))

  const img = new Image()
  img.onload = () => {
    const scale = 2
    const pad = 24 * scale
    const stats = extras.stats ?? []
    const caption = extras.caption?.trim()
    const hasExtras = stats.length > 0 || !!caption

    const canvasWidth = Math.round(width * scale) + (hasExtras ? pad * 2 : 0)
    const contentWidth = canvasWidth - (hasExtras ? pad * 2 : 0)

    // Measure the caption and lay out the stats first so the canvas can be
    // sized exactly. Stats wrap onto additional rows when they would clip.
    const measure = document.createElement('canvas').getContext('2d')!
    const captionFont = `${12 * scale}px ${UI_FONT}`
    measure.font = captionFont
    const captionLines = caption ? wrapText(measure, caption, contentWidth) : []

    const labelFont = `600 ${10 * scale}px ${UI_FONT}`
    const valueFont = `600 ${20 * scale}px ${UI_FONT}`
    const statGap = 36 * scale
    const rowHeight = 54 * scale
    const statRows: { stat: ExportStat; x: number; row: number }[] = []
    {
      let sx = 0
      let row = 0
      for (const s of stats) {
        measure.font = labelFont
        const labelW = measure.measureText(s.label.toUpperCase()).width
        measure.font = valueFont
        const valueW = measure.measureText(s.value).width
        const w = Math.max(labelW, valueW)
        if (sx > 0 && sx + w > contentWidth) {
          row += 1
          sx = 0
        }
        statRows.push({ stat: s, x: sx, row })
        sx += w + statGap
      }
    }
    const statRowCount = stats.length > 0 ? statRows[statRows.length - 1].row + 1 : 0

    const statsBlock = statRowCount * rowHeight
    const captionBlock =
      captionLines.length > 0 ? captionLines.length * 17 * scale + 14 * scale : 0
    const topPad = hasExtras ? pad : 0
    const bottomPad = hasExtras ? pad : 0

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = topPad + statsBlock + Math.round(height * scale) + captionBlock + bottomPad
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(svgUrl)
      return
    }
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Headline stats: small-caps label over a large value, wrapping to new
    // rows as needed so nothing clips.
    for (const { stat: s, x: statX, row } of statRows) {
      const sx = (hasExtras ? pad : 0) + statX
      const sy = topPad + row * rowHeight
      ctx.font = labelFont
      ctx.fillStyle = 'rgba(120, 113, 108, 0.9)'
      ctx.fillText(s.label.toUpperCase(), sx, sy + 12 * scale)
      ctx.font = valueFont
      ctx.fillStyle = s.color || ink
      ctx.fillText(s.value, sx, sy + 36 * scale)
    }

    ctx.drawImage(
      img,
      hasExtras ? pad : 0,
      topPad + statsBlock,
      Math.round(width * scale),
      Math.round(height * scale)
    )

    if (captionLines.length > 0) {
      ctx.font = captionFont
      ctx.fillStyle = 'rgba(120, 113, 108, 1)'
      let cy = topPad + statsBlock + Math.round(height * scale) + 22 * scale
      for (const line of captionLines) {
        ctx.fillText(line, hasExtras ? pad : 0, cy)
        cy += 17 * scale
      }
    }

    URL.revokeObjectURL(svgUrl)

    canvas.toBlob((blob) => {
      if (!blob) return
      const pngUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = filename.endsWith('.png') ? filename : `${filename}.png`
      a.click()
      URL.revokeObjectURL(pngUrl)
    }, 'image/png')
  }
  img.src = svgUrl
}

/** "Projected growth of invested surplus" → "projected-growth-of-invested-surplus". */
export function slugForFilename(text: string | undefined, fallback = 'chart'): string {
  if (!text) return fallback
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || fallback
}
