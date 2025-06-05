"use client"

// Créons ce composant pour permettre de changer d'utilisateur facilement
import type React from "react"
import { UserCircle } from "lucide-react"

interface User {
  id: string
  name: string
  role: string
}

interface UserRoleSelectorProps {
  users: User[]
  currentUserId: string
  onUserChange: (userId: string) => void
}

const UserRoleSelector: React.FC<UserRoleSelectorProps> = ({ users, currentUserId, onUserChange }) => {
  const currentUser = users.find((user) => user.id === currentUserId) || users[0]

  return (
    <div className="bg-violet-100 p-2 flex items-center justify-center space-x-4">
      <div className="text-sm font-medium text-violet-800">
        Utilisateur actuel: <span className="font-bold">{currentUser.name}</span> ({currentUser.role})
      </div>

      <div className="flex space-x-2">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onUserChange(user.id)}
            className={`px-3 py-1 rounded-full text-sm flex items-center ${
              user.id === currentUserId ? "bg-violet-500 text-white" : "bg-white text-violet-700 hover:bg-violet-200"
            }`}
          >
            <UserCircle size={16} className="mr-1" />
            {user.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default UserRoleSelector
