export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  clerk_user_id?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string; // Utiliser string pour accepter n'importe quel nom de colonne comme statut
  priority: "basse" | "moyenne" | "haute" | "urgente";
  assigneeId?: string;
  creatorId?: string; // Ajout de la propriété creatorId
  estimatedTime: number; // en minutes
  actualTime: number; // en minutes
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  timerActive: boolean;
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Project {
  createdAt: any;
  updatedAt: any;
  status: string;
  notes: any;
  id: string;
  name: string;
  description: string;
  team: TeamMember[];
  columns: Column[];
}

// Backend types for API responses
export interface BackendProject {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  clerk_user_id: string;
  created_at: string;
  updated_at: string;
  team_members: BackendTeamMember[];
  columns: BackendColumn[];
}

export interface BackendTeamMember {
  id: number;
  name: string;
  email: string;
  avatar: string;
  clerk_user_id: string;
  created_at: string;
  updated_at: string;
  pivot: {
    project_id: number;
    team_member_id: number;
    role: string;
  };
}

export interface BackendColumn {
  id: number;
  project_id: number;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
  tasks: BackendTask[];
}

export interface BackendTask {
  id: number;
  column_id: number;
  title: string;
  description: string;
  status: string; // Modifié pour accepter n'importe quelle chaîne
  priority: "basse" | "moyenne" | "haute" | "urgente";
  assignee_id: number | null;
  creator_id: string | null; // Ajout de la propriété creator_id
  estimated_time: number;
  actual_time: number;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  timer_active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  comments: BackendComment[];
  attachments: BackendAttachment[];
}

export interface BackendComment {
  id: number;
  task_id: number;
  author_id: number;
  text: string;
  created_at: string;
  updated_at: string;
  author: BackendTeamMember;
}

export interface BackendAttachment {
  id: number;
  task_id: number;
  name: string;
  type: string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
}
