import { useEffect, useRef } from 'react'

const escapeStack = []

const removeFromStack = (token) => {
  const index = escapeStack.lastIndexOf(token)
  if (index >= 0) escapeStack.splice(index, 1)
}

const useEscapeKey = (enabled, onClose) => {
  const onCloseRef = useRef(onClose)
  const tokenRef = useRef(Symbol('escape-layer'))

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!enabled) return undefined

    const token = tokenRef.current
    removeFromStack(token)
    escapeStack.push(token)

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.isComposing || escapeStack.at(-1) !== token) return

      event.preventDefault()
      onCloseRef.current?.()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      removeFromStack(token)
    }
  }, [enabled])
}

export default useEscapeKey
