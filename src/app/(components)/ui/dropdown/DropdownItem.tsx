"use client"

import type React from "react"
import Link from "next/link"

interface DropdownItemProps {
  children: React.ReactNode
  className?: string
  onItemClick?: () => void
  href?: string
  tag?: "a" | "button" | "div"
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  className = "",
  onItemClick,
  href,
  tag = "div",
}) => {
  const handleClick = () => {
    if (onItemClick) {
      onItemClick()
    }
  }

  if (tag === "a" || href) {
    return (
      <Link href={href || "#"} className={className} onClick={handleClick}>
        {children}
      </Link>
    )
  }

  if (tag === "button") {
    return (
      <button className={className} onClick={handleClick}>
        {children}
      </button>
    )
  }

  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  )
}
