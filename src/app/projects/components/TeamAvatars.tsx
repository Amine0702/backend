import type React from "react"
import type { TeamMember } from "../types/kanban"

interface TeamAvatarsProps {
  members: TeamMember[]
  max?: number
}

const TeamAvatars: React.FC<TeamAvatarsProps> = ({ members, max = 5 }) => {
  const displayMembers = members.slice(0, max)
  const remainingCount = members.length - max

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {displayMembers.map((member) => (
        <div
          key={member.id}
          className="inline-block h-8 w-8 rounded-full ring-2 ring-white"
          title={`${member.name} - ${member.role}`}
        >
          <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
        </div>
      ))}

      {remainingCount > 0 && (
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-xs font-medium text-white ring-2 ring-white">
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

export default TeamAvatars
