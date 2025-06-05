// Define the types for our permission system
export type UserRole = "admin" | "member" | "observer" | null;

// Function to determine if a user can modify a task based on their role
export function canUserModifyTask(
  userRole: UserRole,
  projectData: any,
  userId: string | null,
): boolean {
  console.log("Checking permissions:", { userRole, userId });

  // If no role is set, check if we can determine it from project data
  if (!userRole && projectData) {
    // Try to find the user's role in the project
    const userMembership = projectData.team_members?.find(
      (member: any) => member.user_id === userId,
    );

    if (userMembership) {
      console.log("Found user membership:", userMembership);
      userRole = userMembership.role as UserRole;

      // Store the role in localStorage for future reference
      if (userRole) {
        localStorage.setItem("userRole", userRole);
        console.log("Stored role in localStorage:", userRole);
      }
    }
  }

  // Admin and member can modify, observer cannot
  const canModify = userRole === "admin" || userRole === "member";
  console.log("Permission result:", { userRole, canModify });

  return canModify;
}

// Function to get user role from project data
export function getUserRoleInProject(
  projectData: any,
  userId: string | null,
): UserRole {
  if (!projectData || !userId) {
    console.log("Missing project data or user ID");
    return null;
  }

  // Try to find the user's role in the project
  const userMembership = projectData.team_members?.find(
    (member: any) => member.user_id === userId,
  );

  if (userMembership) {
    console.log("Found user membership:", userMembership);
    const role = userMembership.role as UserRole;

    // Store the role in localStorage for future reference
    if (role) {
      localStorage.setItem("userRole", role);
      console.log("Stored role in localStorage:", role);
    }

    return role;
  }

  console.log("User not found in project members");
  return null;
}
