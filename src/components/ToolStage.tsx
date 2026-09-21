import type { ReactNode } from 'react'
import { StageControlsRow } from './StageControls'
import styles from './ToolStage.module.css'

/*
 * The frame a tool sits in. On the full site it carries its own controls
 * above the tool. In the framed view, and any time the screen is filled, the
 * cardinal bar at the top of the page carries them instead, so there is one
 * set of controls in one place rather than two a scroll apart.
 *
 * Filling the screen itself belongs to FullscreenProvider, which owns an
 * element the router never unmounts.
 */

export function ToolStage({ children }: { children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <StageControlsRow />
      <div className="toolkitScope">{children}</div>
    </div>
  )
}
