"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { createPortal } from "react-dom"

type LightboxImage = {
  url: string
  alt: string
  credit?: string
}

type ArticleImageLightboxProps = {
  images: LightboxImage[]
  layout: "cover" | "grid"
}

export function wrappedImageIndex(current: number, direction: -1 | 1, length: number): number {
  if (length <= 1) return 0
  return (current + direction + length) % length
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  )
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ArticleImageLightbox({ images, layout }: ArticleImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const touchStartX = useRef<number | null>(null)
  const hasMultipleImages = images.length > 1
  const isOpen = activeIndex !== null

  const close = useCallback(() => {
    setActiveIndex(null)
    window.requestAnimationFrame(() => openerRef.current?.focus())
  }, [])

  const move = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => current === null ? null : wrappedImageIndex(current, direction, images.length))
  }, [images.length])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close()
      if (event.key === "ArrowLeft" && hasMultipleImages) move(-1)
      if (event.key === "ArrowRight" && hasMultipleImages) move(1)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [close, hasMultipleImages, isOpen, move])

  useEffect(() => {
    if (activeIndex === null || !hasMultipleImages) return
    const next = images[wrappedImageIndex(activeIndex, 1, images.length)]
    const previous = images[wrappedImageIndex(activeIndex, -1, images.length)]
    for (const image of [next, previous]) {
      const preload = new window.Image()
      preload.src = image.url
    }
  }, [activeIndex, hasMultipleImages, images])

  const open = (index: number, button: HTMLButtonElement) => {
    openerRef.current = button
    setActiveIndex(index)
  }

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-lightbox-control]"))
    if (controls.length === 0) return
    const current = controls.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.shiftKey
      ? (current <= 0 ? controls.length - 1 : current - 1)
      : (current === controls.length - 1 ? 0 : current + 1)
    event.preventDefault()
    controls[next].focus()
  }

  const lightbox = activeIndex === null ? null : createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`画像を拡大表示 ${activeIndex + 1} / ${images.length}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 backdrop-blur-sm sm:p-6"
      onClick={close}
      onKeyDown={trapFocus}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null }}
      onTouchEnd={(event) => {
        if (!hasMultipleImages || touchStartX.current === null) return
        const endX = event.changedTouches[0]?.clientX
        if (endX === undefined) return
        const distance = endX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(distance) < 50) return
        move(distance > 0 ? -1 : 1)
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        data-lightbox-control
        onClick={(event) => { event.stopPropagation(); close() }}
        aria-label="拡大画像を閉じる"
        className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
      >
        <CloseIcon />
      </button>

      {hasMultipleImages && (
        <>
          <button
            type="button"
            data-lightbox-control
            onClick={(event) => { event.stopPropagation(); move(-1) }}
            aria-label="前の画像"
            className="absolute left-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-5 sm:size-12"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            data-lightbox-control
            onClick={(event) => { event.stopPropagation(); move(1) }}
            aria-label="次の画像"
            className="absolute right-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:size-12"
          >
            <ArrowIcon direction="right" />
          </button>
        </>
      )}

      <figure className="flex max-h-full max-w-full flex-col items-center justify-center" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 元画像を画面内へ収め、拡大表示するライトボックス */}
        <img
          src={images[activeIndex].url}
          alt={images[activeIndex].alt}
          className="max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-1rem)] select-none object-contain sm:max-w-[calc(100vw-8rem)]"
          draggable={false}
        />
        {(images[activeIndex].credit || hasMultipleImages) && (
          <figcaption className="mt-3 flex min-h-5 items-center gap-3 px-14 text-center text-xs text-white/75">
            {images[activeIndex].credit && <span>{images[activeIndex].credit}</span>}
            {hasMultipleImages && <span className="tabular-nums">{activeIndex + 1} / {images.length}</span>}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  )

  if (layout === "cover") {
    const image = images[0]
    if (!image) return null
    return (
      <>
        <div className="mb-5 sm:mb-8">
          <button
            type="button"
            onClick={(event) => open(0, event.currentTarget)}
            aria-label={`${image.alt || "記事画像"}を拡大表示`}
            className="block w-full cursor-zoom-in overflow-hidden rounded-xl bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 縦長画像をcropせず、実際の縦横比のまま表示する */}
            <img src={image.url} alt={image.alt} decoding="async" fetchPriority="high" className="h-auto w-full transition-transform duration-300 hover:scale-[1.01]" />
          </button>
          {image.credit && <p className="mt-1 text-[10px] text-muted-foreground/60">{image.credit}</p>}
        </div>
        {lightbox}
      </>
    )
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 items-start gap-3 sm:mt-8">
        {images.map((image, index) => (
          <figure key={`${image.url}-${index}`}>
            <button
              type="button"
              onClick={(event) => open(index, event.currentTarget)}
              aria-label={`${image.alt || `記事画像 ${index + 1}`}を拡大表示`}
              className="block w-full cursor-zoom-in overflow-hidden rounded-xl bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 縦長画像をcropせず、実際の縦横比のまま表示する */}
              <img src={image.url} alt={image.alt} loading="lazy" decoding="async" className="h-auto w-full transition-transform duration-300 hover:scale-[1.02]" />
            </button>
            {image.credit && <figcaption className="mt-1 text-[10px] text-muted-foreground/60">{image.credit}</figcaption>}
          </figure>
        ))}
      </div>
      {lightbox}
    </>
  )
}
