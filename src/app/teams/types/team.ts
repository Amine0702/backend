export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  job_title: string | null;
  avatar: string | null;
  tasks?: any[]; // Optional tasks assigned to the member
  pivot?: {
    team_member_id?: number;
    team_id?: number;
    project_id?: number;
    role?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export interface Team {
  id: number;
  name: string;
  description: string;
  status: string;
  leader: TeamMember | null;
  leader_id?: number;
  members: TeamMember[] | null;
  completion_rate: number;
  active_projects_count: number;
  created_at: string;
  updated_at: string;
  project_id?: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assignee_id?: number;
  assignee?: TeamMember;
}
