import { api } from "./api";
import type {
  Assessment, AssessmentAttempt, ChatResponse, Conversation, Dashboard, DocumentItem, Discussion,
  DiscussResponse, Goal, HistoryBundle, LearningContent, Me, Memory, NewsArticle,
  NotificationPreferences, Profile, Project, ProgressSummary, Recommendation, Roadmap,
  RoadmapPhase, Task, TokenResponse, WeeklyReport,
} from "./types";

// -- Auth --------------------------------------------------------------
export const registerAccount = (email: string, password: string) =>
  api.post<TokenResponse>("/api/auth/register", { email, password }, { skipAuth: true });

export const login = (email: string, password: string) =>
  api.post<TokenResponse>("/api/auth/login", { email, password }, { skipAuth: true });

export const forgotPassword = (email: string) =>
  api.post<{ message: string }>("/api/auth/forgot-password", { email }, { skipAuth: true });

export const resetPassword = (token: string, password: string) =>
  api.post<void>("/api/auth/reset-password", { token, password }, { skipAuth: true });

export const changePassword = (current_password: string, new_password: string) =>
  api.post<void>("/api/auth/change-password", { current_password, new_password });

// -- Profile / user ------------------------------------------------------
export const getProfile = () => api.get<Profile>("/api/profile");
export const updateProfile = (payload: Partial<Profile>) => api.put<Profile>("/api/profile", payload);
export const getMe = () => api.get<Me>("/api/users/me");
export const updateCareerProfile = (payload: Partial<Profile>) => api.put<Me>("/api/users/me", payload);

// -- Goals ---------------------------------------------------------------
export const createGoal = (payload: Partial<Goal>) => api.post<Goal>("/api/goals", payload);
export const listGoals = () => api.get<Goal[]>("/api/goals");
export const getGoal = (id: string) => api.get<Goal>(`/api/goals/${id}`);
export const updateGoal = (id: string, payload: Partial<Goal>) => api.put<Goal>(`/api/goals/${id}`, payload);
export const discussGoal = (id: string, message: string) => api.post<DiscussResponse>(`/api/goals/${id}/discuss`, { message });
export const listDiscussion = (_id: string): Discussion[] => []; // no list endpoint exposed; discussions returned inline via discuss()

// -- Roadmaps --------------------------------------------------------------
export const generateRoadmap = (goalId: string) => api.post<Roadmap>(`/api/goals/${goalId}/roadmap/generate`);
export const updateRoadmap = (roadmapId: string, phases: Partial<RoadmapPhase>[], status?: string) =>
  api.put<Roadmap>(`/api/roadmaps/${roadmapId}`, { phases, status });
export const finalizeRoadmap = (roadmapId: string) => api.post<Roadmap>(`/api/roadmaps/${roadmapId}/finalize`);

// -- Tasks -------------------------------------------------------------------
export const generateDailyTasks = () => api.post<Task[]>("/api/tasks/generate-daily");
export const getTodaysTasks = () => api.get<Task[]>("/api/tasks/today");
export const completeTask = (taskId: string, completion_percentage: number, reflection?: string) =>
  api.post<Task>(`/api/tasks/${taskId}/complete`, { completion_percentage, reflection });
export const listAllTasks = () => api.get<Task[]>("/api/tasks");

// -- Learning & assessments --------------------------------------------------
export const generateLearning = (taskId: string) => api.post<LearningContent>(`/api/learning/generate/${taskId}`);
export const getTodaysLearning = () => api.get<LearningContent[]>("/api/learning/today");
export const getLearning = (id: string) => api.get<LearningContent>(`/api/learning/${id}`);
export const generateAssessment = (learningId: string) => api.post<Assessment>(`/api/learning/${learningId}/assessment`);
export const submitAssessment = (assessmentId: string, answers: Record<string, string>) =>
  api.post<AssessmentAttempt>(`/api/assessments/${assessmentId}/submit`, { answers });
export const learningChat = (learningId: string, message: string, conversation_id?: string) =>
  api.post<ChatResponse>(`/api/learning/${learningId}/chat`, { message, conversation_id });

// -- News ------------------------------------------------------------------
export const generateNews = () => api.post<NewsArticle>("/api/news/generate");
export const getTodaysNews = () => api.get<NewsArticle>("/api/news/today");
export const getNews = (id: string) => api.get<NewsArticle>(`/api/news/${id}`);
export const newsChat = (articleId: string, message: string, conversation_id?: string) =>
  api.post<ChatResponse>(`/api/news/${articleId}/chat`, { message, conversation_id });

// -- History / reports / progress / dashboard -------------------------------
export const getHistory = () => api.get<HistoryBundle>("/api/history");
export const getWeeklyReport = () => api.get<WeeklyReport>("/api/reports/weekly");
export const getProgress = () => api.get<ProgressSummary>("/api/progress");
export const getDashboard = () => api.get<Dashboard>("/api/dashboard");

// -- Chat --------------------------------------------------------------------
export const sendChat = (message: string, conversation_id?: string, context_type = "general", context_id?: string) =>
  api.post<ChatResponse>("/api/chat", { message, conversation_id, context_type, context_id });
export const listConversations = () => api.get<Conversation[]>("/api/conversations");
export const getConversationMessages = (id: string) => api.get<import("./types").Message[]>(`/api/conversations/${id}/messages`);

// -- Recommendations -----------------------------------------------------
export const listRecommendations = () => api.get<Recommendation[]>("/api/recommendations");
export const generateRecommendation = () => api.post<Recommendation>("/api/recommendations/generate");

// -- Memories --------------------------------------------------------------
export const extractMemories = (content: string, category: string) => api.post<Memory[]>("/api/memories/extract", { content, category });
export const listMemories = () => api.get<Memory[]>("/api/memories");
export const updateMemory = (id: string, content: string, category: string) => api.put<Memory>(`/api/memories/${id}`, { content, category });
export const deleteMemory = (id: string) => api.delete<void>(`/api/memories/${id}`);

// -- Projects ----------------------------------------------------------------
export const createProject = (payload: Partial<Project>) => api.post<Project>("/api/projects", payload);
export const listProjects = () => api.get<Project[]>("/api/projects");

// -- Notifications -------------------------------------------------------
export const getNotificationPreferences = () => api.get<NotificationPreferences>("/api/notifications/preferences");
export const updateNotificationPreferences = (payload: NotificationPreferences) =>
  api.put<NotificationPreferences>("/api/notifications/preferences", payload);
export const listNotifications = () => api.get<Array<Record<string, unknown>>>("/api/notifications");

// -- Documents (RAG) -----------------------------------------------------
export const listDocuments = () => api.get<DocumentItem[]>("/api/documents");
export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.postForm<DocumentItem>("/api/documents", form);
};
export const searchDocuments = (query: string, documentId?: string) =>
  api.get<Array<Record<string, unknown>>>(`/api/documents/search?query=${encodeURIComponent(query)}${documentId ? `&document_id=${documentId}` : ""}`);
export const deleteDocument = (id: string) => api.delete<void>(`/api/documents/${id}`);

// -- Generic automations resource -------------------------------------------
export const listAutomations = () => api.get<Array<Record<string, unknown>>>("/api/automations");
