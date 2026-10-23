/** Compact party mark matching Stitch table geometry (avatar or initials). */
export function PartyAvatar({
  name,
  avatarUrl,
  size = 24,
}: {
  name: string | null | undefined
  avatarUrl?: string | null
  size?: number
}) {
  const initials = (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'

  if (avatarUrl) {
    return (
      <img
        className="party-avatar"
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="party-avatar party-avatar--initials"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      aria-hidden
    >
      {initials}
    </span>
  )
}
