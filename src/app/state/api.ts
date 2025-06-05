import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://backend-production-96a2.up.railway.app/api",
    prepareHeaders: (headers, { getState }) => {
      const clerkUserId = localStorage.getItem("currentUserId");
      if (clerkUserId) {
        headers.set("X-Clerk-User-Id", clerkUserId);
      }
      return headers;
    },
  }),
  tagTypes: [
    "Projects",
    "Tasks",
    "User",
    "Columns",
    "Reports",
    "Teams",
    "TeamMembers",
    "ProjectStats",
    "Notifications",
    "Notes",
    "Reports",
  ],
  endpoints: (builder) => ({
    // User endpoints
    createUser: builder.mutation({
      query: (userData) => ({
        url: "/users",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["User"],
    }),

    getUserByClerkId: builder.query({
      query: (clerkUserId) => `/users/clerk/${clerkUserId}`,
      providesTags: ["User"],
    }),

    updateUserProfile: builder.mutation({
      query: ({ clerkUserId, ...profileData }) => ({
        url: `/users/${clerkUserId}/profile`,
        method: "PUT",
        body: profileData,
      }),
      invalidatesTags: ["User"],
    }),

    uploadProfilePicture: builder.mutation({
      query: ({ clerkUserId, file }) => {
        const formData = new FormData();
        formData.append("profile_picture", file);
        return {
          url: `/users/${clerkUserId}/upload-profile-picture`,
          method: "POST",
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ["User"],
    }),

    getAllUsers: builder.query({
      query: () => `/users`,
      providesTags: ["User"],
    }),

    updateUserRole: builder.mutation({
      query: ({ id, role }) => ({
        url: `/users/${id}/role`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: ["User"],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    getUserStats: builder.query({
      query: () => `/users/stats`,
      providesTags: ["User"],
    }),

    inviteUser: builder.mutation<any, { email: string; role: string }>({
      query: (data) => ({
        url: "/users/invite",
        method: "POST",
        body: data,
      }),
    }),

    getPendingInvitations: builder.query<any, void>({
      query: () => "/users/invitations",
    }),

    cancelInvitation: builder.mutation<any, number>({
      query: (id) => ({
        url: `/users/invitations/${id}`,
        method: "DELETE",
      }),
    }),

    // Project endpoints
    getUserProjects: builder.query({
      query: (clerkUserId) => `/projects/user/${clerkUserId}`,
      providesTags: ["Projects"],
    }),

    createProject: builder.mutation({
      query: (projectData) => ({
        url: "/projects",
        method: "POST",
        body: projectData,
      }),
      invalidatesTags: ["Projects"],
    }),

    getProject: builder.query({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (result, error, id) => [
        { type: "Projects", id },
        { type: "Tasks", id },
        { type: "Columns", id },
      ],
    }),

    deleteProject: builder.mutation<
      { message: string; success: boolean },
      string
    >({
      query: (id) => ({
        url: `/projects/${id}`,
        method: "DELETE",
        headers: {
          "X-Clerk-User-Id": localStorage.getItem("currentUserId") || "",
        },
      }),
      invalidatesTags: ["Projects"],
    }),

    acceptInvitation: builder.mutation({
      query: ({ token, clerkUserId }) => ({
        url: `/projects/invitation/${token}`,
        method: "POST",
        body: { clerkUserId },
      }),
      invalidatesTags: ["Projects"],
    }),

    // Column endpoints
    addColumn: builder.mutation({
      query: (columnData) => ({
        url: "/columns",
        method: "POST",
        body: columnData,
      }),
      invalidatesTags: (result, error, { project_id }) => [
        { type: "Projects", id: project_id },
        { type: "Columns", id: project_id },
      ],
    }),

    updateColumnOrder: builder.mutation({
      query: (data) => ({
        url: "/columns/order",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { project_id }) => [
        { type: "Projects", id: project_id },
        { type: "Columns", id: project_id },
      ],
    }),

    deleteColumn: builder.mutation({
      query: (columnId) => ({
        url: `/columns/${columnId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projects"],
    }),

    // Task endpoints
    createTask: builder.mutation({
      query: (taskData) => ({
        url: "/tasks",
        method: "POST",
        body: taskData,
      }),
      invalidatesTags: (result, error, { column_id }) => [
        { type: "Tasks" },
        { type: "Columns" },
        { type: "Notifications" },
      ],
    }),

    generateTaskWithAI: builder.mutation({
      query: (data) => ({
        url: "/ai/generate-task",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Tasks", "Columns", "Notifications"],
    }),

    updateTask: builder.mutation({
      query: ({ id, ...taskData }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: taskData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Tasks", id },
        { type: "Notifications" },
      ],
    }),

    deleteTask: builder.mutation({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks", "Columns", "Notifications"],
    }),

    moveTask: builder.mutation({
      query: (data) => ({
        url: "/tasks/move",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Tasks", "Columns", "Notifications"],
    }),

    toggleTaskTimer: builder.mutation({
      query: (id) => ({
        url: `/tasks/${id}/toggle-timer`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Tasks", id },
        { type: "Notifications" },
      ],
    }),

    addComment: builder.mutation({
      query: ({ taskId, ...commentData }) => ({
        url: `/tasks/${taskId}/comments`,
        method: "POST",
        body: commentData,
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
        { type: "Notifications" },
      ],
    }),

    addAttachment: builder.mutation({
      query: ({ taskId, file, name }) => {
        const formData = new FormData();
        formData.append("file", file);
        if (name) formData.append("name", name);
        return {
          url: `/tasks/${taskId}/attachments`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
        { type: "Notifications" },
      ],
    }),

    downloadAttachment: builder.query<Blob, string>({
      query: (attachmentId) => ({
        url: `/attachments/${attachmentId}/download`,
        responseHandler: async (response) => {
          if (!response.ok) {
            // Essayer de lire le message d'erreur JSON si possible
            try {
              const errorData = await response.json();
              throw new Error(errorData.message || `HTTP ${response.status}`);
            } catch {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }
          }
          return response.blob();
        },
      }),
    }),

    // Team endpoints
    getTeams: builder.query({
      query: (params = {}) => ({
        url: "/teams",
        params: params,
      }),
      transformResponse: (response: unknown) => {
        console.log("Raw teams response:", response);
        if (Array.isArray(response)) {
          return response;
        }
        if (
          response &&
          typeof response === "object" &&
          "data" in response &&
          Array.isArray((response as any).data)
        ) {
          return (response as { data: any }).data;
        }
        return [];
      },
      providesTags: ["Teams"],
    }),

    getTeam: builder.query({
      query: (teamId) => `/teams/${teamId}`,
      providesTags: (result, error, id) => [{ type: "Teams", id }],
    }),

    getTeamStats: builder.query({
      query: () => "/teams/stats/summary",
      providesTags: ["Teams"],
    }),

    createTeam: builder.mutation({
      query: (teamData) => ({
        url: "/teams",
        method: "POST",
        body: teamData,
      }),
      invalidatesTags: ["Teams"],
    }),

    updateTeam: builder.mutation({
      query: ({ id, ...teamData }) => ({
        url: `/teams/${id}`,
        method: "PUT",
        body: teamData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Teams", id }],
    }),

    deleteTeam: builder.mutation({
      query: (id) => ({
        url: `/teams/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teams"],
    }),

    addTeamMembers: builder.mutation({
      query: ({ teamId, memberIds }) => ({
        url: `/teams/${teamId}/members`,
        method: "POST",
        body: { member_ids: memberIds },
      }),
      invalidatesTags: (result, error, { teamId }) => [
        { type: "Teams", id: teamId },
      ],
    }),

    removeTeamMembers: builder.mutation({
      query: ({ teamId, memberIds }) => ({
        url: `/teams/${teamId}/members`,
        method: "DELETE",
        body: { member_ids: memberIds },
      }),
      invalidatesTags: (result, error, { teamId }) => [
        { type: "Teams", id: teamId },
      ],
    }),

    exportTeamMembers: builder.query({
      query: (teamId) => ({
        url: `/teams/${teamId}/export-members`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Notes endpoints
    getNotes: builder.query({
      query: () => "/notes",
      providesTags: ["Notes"],
    }),

    createNote: builder.mutation({
      query: (note) => ({
        url: "/notes",
        method: "POST",
        body: note,
      }),
      invalidatesTags: ["Notes"],
    }),

    updateNote: builder.mutation({
      query: ({ id, ...noteData }) => ({
        url: `/notes/${id}`,
        method: "PUT",
        body: noteData,
      }),
      invalidatesTags: ["Notes"],
    }),

    deleteNote: builder.mutation({
      query: (id) => ({
        url: `/notes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notes"],
    }),

    getUserNotes: builder.query({
      query: (clerkUserId) => `/notes/user/${clerkUserId}`,
      providesTags: ["Notes"],
    }),

    // Report endpoints
    getProjectStats: builder.query({
      query: (projectId) => `/projects/${projectId}/stats`,
      providesTags: (result, error, id) => [
        { type: "ProjectStats", id },
        { type: "Projects", id },
      ],
    }),

    getAllProjectsStats: builder.query<any, object>({
      query: (params = {}) => ({
        url: `/projects/stats/all`,
        params: params,
      }),
      providesTags: ["ProjectStats", "Projects"],
    }),

    generateProjectReport: builder.mutation({
      query: ({ projectId, reportData }) => ({
        url: projectId
          ? `/projects/${projectId}/reports/generate`
          : "/projects/reports/generate",
        method: "POST",
        body: reportData,
      }),
      invalidatesTags: ["Reports"],
    }),

    scheduleProjectReport: builder.mutation({
      query: ({ projectId, scheduleData }) => ({
        url: projectId
          ? `/projects/${projectId}/reports/schedule`
          : "/projects/reports/schedule",
        method: "POST",
        body: scheduleData,
      }),
      invalidatesTags: ["Reports"],
    }),

    getReportHistory: builder.query({
      query: (params = {}) => ({
        url: `/reports/history`,
        params: params,
      }),
      providesTags: ["Reports"],
    }),

    downloadReport: builder.query({
      query: (reportId) => ({
        url: `/reports/${reportId}/download`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    getTeamPerformance: builder.query({
      query: (teamId) => `/teams/${teamId}/performance`,
      providesTags: (result, error, id) => [
        { type: "Teams", id },
        { type: "ProjectStats" },
      ],
    }),

    getTeamMemberPerformance: builder.query({
      query: (memberId) => `/team-members/${memberId}/performance`,
      providesTags: (result, error, id) => [
        { type: "TeamMembers", id },
        { type: "ProjectStats" },
      ],
    }),

    getReportDashboard: builder.query({
      query: () => `/reports/dashboard`,
      providesTags: ["Projects", "Teams", "ProjectStats", "Reports"],
    }),

    getDashboardData: builder.query({
      query: () => "/dashboard/data",
      providesTags: ["Projects", "Tasks"],
    }),

    getProjectLifecycle: builder.query<any, number>({
      query: (id: number) => `/projects/${id}/lifecycle`,
      providesTags: (result, error, id) => [
        { type: "Projects", id },
        { type: "Tasks", id },
      ],
    }),

    getProjectHistory: builder.query<any, number>({
      query: (projectId) => `/projects/${projectId}/history`,
      providesTags: (result, error, id) => [{ type: "Projects", id }],
    }),

    getAllProjectsHistory: builder.query<any, void>({
      query: () => `/projects/history/all`,
      providesTags: ["Projects"],
    }),

    inviteUsers: builder.mutation({
      query: ({ id, invitations }) => ({
        url: `/projects/${id}/invite`,
        method: "POST",
        body: { invitations },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Projects", id: id },
        { type: "Teams" },
        { type: "Notifications" },
      ],
    }),

    getAIGeneratedTasks: builder.query<any, void>({
      query: () => `/ai/generated-tasks`,
      providesTags: ["Tasks"],
    }),

    removeMemberFromProject: builder.mutation({
      query: ({ projectId, memberId }) => ({
        url: `/projects/${projectId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: projectId },
        { type: "Teams" },
        { type: "Notifications" },
      ],
    }),

    getRecentActivities: builder.query<any, void>({
      query: () => `/activities/recent`,
      providesTags: ["Projects", "Tasks"],
    }),

    getPendingProjects: builder.query<any, void>({
      query: () => `/admin/projects/pending`,
      transformResponse: (response: any) => {
        console.log("Pending projects response:", response);
        return response;
      },
      providesTags: ["Projects"],
    }),

    // Nouveau endpoint pour les projets en attente d'un utilisateur spécifique
    getUserPendingProjects: builder.query<any, string>({
      query: (clerkUserId) => `/admin/projects/pending`,
      transformResponse: (response: any, meta, clerkUserId) => {
        console.log("Raw pending projects response:", response);
        console.log("Current user ID:", clerkUserId);

        if (
          response &&
          response.pendingProjects &&
          Array.isArray(response.pendingProjects)
        ) {
          // Filtrer les projets pour ne garder que ceux de l'utilisateur actuel
          const userPendingProjects = response.pendingProjects.filter(
            (project: any) => project.clerk_user_id === clerkUserId,
          );

          console.log("Filtered user pending projects:", userPendingProjects);

          return {
            pendingProjects: userPendingProjects,
          };
        }

        return { pendingProjects: [] };
      },
      providesTags: ["Projects"],
    }),

    approveProject: builder.mutation<any, number>({
      query: (projectId) => ({
        url: `/admin/projects/${projectId}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["Projects"],
    }),

    rejectProject: builder.mutation<any, number>({
      query: (projectId) => ({
        url: `/admin/projects/${projectId}/reject`,
        method: "POST",
      }),
      invalidatesTags: ["Projects"],
    }),

    // Notification endpoints
    getUserNotifications: builder.query<any, void>({
      query: () => `/notifications`,
      providesTags: ["Notifications"],
    }),

    markNotificationAsRead: builder.mutation<any, number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsAsRead: builder.mutation<any, void>({
      query: () => ({
        url: `/notifications/read-all`,
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),

    deleteNotification: builder.mutation<any, number>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),

    getProjectStatsByMonth: builder.query<any, void>({
      query: () => `/projects/stats/monthly`,
      providesTags: ["Projects", "ProjectStats"],
    }),

    getUserDetailsById: builder.query<any, number>({
      query: (userId) => `/users/${userId}/details`,
      providesTags: ["User"],
    }),

    getProjectTaskAnalysis: builder.query<any, number>({
      query: (id: number) => `/projects/${id}/task-analysis`,
      providesTags: (result, error, id) => [
        { type: "Projects", id },
        { type: "Tasks", id },
      ],
    }),

    // Update member role endpoint with correct URL
    updateMemberRole: builder.mutation<
      { message: string; member?: any; role?: string },
      { projectId: string; memberId: string; role: string }
    >({
      query: ({ projectId, memberId, role }) => ({
        url: `/projects/${projectId}/members/${memberId}/role`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: projectId },
        { type: "Teams" },
        { type: "Notifications" },
      ],
    }),
  }),
});

export const useGetAllTeamsQuery = api.injectEndpoints({
  endpoints: (builder) => ({
    getAllTeams: builder.query({
      query: () => ({
        url: `/teams`,
        method: "GET",
      }),
      providesTags: ["Teams"],
    }),
  }),
}).useGetAllTeamsQuery;

export const {
  useCreateUserMutation,
  useGetUserByClerkIdQuery,
  useUpdateUserProfileMutation,
  useGetUserProjectsQuery,
  useCreateProjectMutation,
  useGetProjectQuery,
  useAcceptInvitationMutation,
  useAddColumnMutation,
  useUpdateColumnOrderMutation,
  useCreateTaskMutation,
  useGenerateTaskWithAIMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
  useToggleTaskTimerMutation,
  useAddCommentMutation,
  useAddAttachmentMutation,
  useLazyDownloadAttachmentQuery,
  useGetTeamsQuery,
  useGetTeamQuery,
  useGetTeamStatsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useAddTeamMembersMutation,
  useRemoveTeamMembersMutation,
  useExportTeamMembersQuery,
  useGetNotesQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useGetUserNotesQuery,
  useGetProjectStatsQuery,
  useGetAllProjectsStatsQuery,
  useGenerateProjectReportMutation,
  useScheduleProjectReportMutation,
  useGetReportHistoryQuery,
  useDownloadReportQuery,
  useGetTeamPerformanceQuery,
  useGetTeamMemberPerformanceQuery,
  useGetReportDashboardQuery,
  useGetDashboardDataQuery,
  useGetProjectLifecycleQuery,
  useGetProjectHistoryQuery,
  useGetAllProjectsHistoryQuery,
  useGetAllUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetUserStatsQuery,
  useInviteUsersMutation,
  useGetAIGeneratedTasksQuery,
  useDeleteProjectMutation,
  useRemoveMemberFromProjectMutation,
  useUploadProfilePictureMutation,
  useInviteUserMutation,
  useGetPendingInvitationsQuery,
  useCancelInvitationMutation,
  useDeleteColumnMutation,
  useGetRecentActivitiesQuery,
  useGetUserNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useGetProjectStatsByMonthQuery,
  useGetUserDetailsByIdQuery,
  useGetPendingProjectsQuery,
  useApproveProjectMutation,
  useRejectProjectMutation,
  useGetProjectTaskAnalysisQuery,
  useUpdateMemberRoleMutation,
  useGetUserPendingProjectsQuery,
} = api;
