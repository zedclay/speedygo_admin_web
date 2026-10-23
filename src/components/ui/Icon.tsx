export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`icon-material ${className}`.trim()} aria-hidden>
      {name}
    </span>
  )
}
