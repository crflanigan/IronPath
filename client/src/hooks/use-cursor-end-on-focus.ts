import { useCallback } from 'react'

export function useCursorEndOnFocus() {
  return useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement
    const end = input.value.length
    requestAnimationFrame(() => {
      try {
        input.setSelectionRange(end, end)
      } catch {
        // some input types (e.g., number) may not support setSelectionRange
      }
    })
  }, [])
}
