import { useEffect, useRef } from 'react'

export function useBackButtonClose(isOpen: boolean, onClose: () => void, key = 'modal') {
  const onCloseRef = useRef(onClose)
  const closingFromBackRef = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    const marker = `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const currentState = typeof window.history.state === 'object' && window.history.state !== null
      ? window.history.state
      : {}

    window.history.pushState({ ...currentState, __divashopModal: marker }, '', window.location.href)

    const handlePopState = () => {
      closingFromBackRef.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)

      if (!closingFromBackRef.current && window.history.state?.__divashopModal === marker) {
        window.history.back()
      }

      closingFromBackRef.current = false
    }
  }, [isOpen, key])
}
