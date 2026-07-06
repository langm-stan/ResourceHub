import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'raised' | 'sunken' | 'plain'
}

/** Flat, rounded surface. */
export function Card({ tone = 'raised', className, ...rest }: CardProps) {
  const cls = [styles.card, styles[tone], className].filter(Boolean).join(' ')
  return <div className={cls} {...rest} />
}
