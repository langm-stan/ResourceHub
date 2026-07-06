import { useCallback, useState } from 'react'

const KEY = 'ifdm-checklist-v1'

export type ChecklistAnswers = Record<number, boolean>

function load(): ChecklistAnswers {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ChecklistAnswers) : {}
  } catch {
    return {}
  }
}

export function useChecklist() {
  const [answers, setAnswers] = useState<ChecklistAnswers>(load)

  const setAnswer = useCallback((id: number, value: boolean) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(KEY)
    setAnswers({})
  }, [])

  return { answers, setAnswer, clear }
}
