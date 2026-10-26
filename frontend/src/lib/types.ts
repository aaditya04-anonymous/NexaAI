export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Profile {
  id?: string;
  name?: string;
  profession?: string;
  current_role?: string;
  experience_level?: string;
  education?: string;
  current_skills?: string[];
  target_skills?: string[];
  interests?: string[];
  preferred_learning_style?: string;
  preferred_learning_duration_minutes?: number;
  career_objectives?: string;
  timezone?: string;
  memory_enabled?: boolean;
  professional_status?: string;
  career_field?: string;
  target_career?: string;
  skills?: string[];
  learning_style?: string;
  communication_style?: string;
  productivity_preferences?: string;
  long_term_ambitions?: string;
  improvement_areas?: string[];
  [key: string]: unknown;
}

export interface Me {
  id: string;
  email: string;
  profile: Profile;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description?: string;
  skills: string[];
  estimated_minutes: number;
  priority: "low" | "medium" | "high";
  status?: string;
  order?: number;
  roadmap_id?: string;
  goal_id?: string;
}

export interface Roadmap {
  id: string;
  goal_id: string;
  status: "draft" | "review" | "finalized";
  version?: number;
  phases: RoadmapPhase[];
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_role?: string;
  deadline?: string;
  daily_minutes?: number;
  preferred_technologies?: string[];
  status: "discovery" | "discussion" | "draft" | "active" | "paused" | "completed";
  roadmap_status?: string;
  progress?: number;
  roadmap?: Roadmap;
  created_at?: string;
  updated_at?: string;
}

export interface Discussion {
  id: string;
  goal_id: string;
  role: "user" | "assistant";
  message: string;
  created_at?: string;
}

export interface DiscussResponse {
  discussion: Discussion;
  reply: string;
  ready_for_draft: boolean;
}

export interface Task {
  id: string;
  title?: string;
  description?: string;
  goal_id?: string;
  roadmap_phase_id?: string;
  status: "not_started" | "in_progress" | "completed" | string;
  completion_percentage?: number;
  due_date?: string;
  reflection?: string;
  estimated_minutes?: number;
  created_at?: string;
  category?: string;
  priority?: string;
}

export interface LearningContent {
  id: string;
  title: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  sections: Array<{ heading?: string; content?: string; [key: string]: unknown }>;
  diagrams: Array<Record<string, unknown>>;
  code_examples: string[];
  exercises: Array<Record<string, unknown>>;
  youtube_resources: Array<{ title?: string; url?: string; [key: string]: unknown }>;
  estimated_minutes: number;
  task_id?: string;
}

export interface AssessmentQuestion {
  type: string;
  question: string;
  options?: string[] | null;
  correct_answer?: string | null;
  explanation?: string | null;
}

export interface Assessment {
  id: string;
  topic: string;
  difficulty: string;
  passing_score: number;
  questions: AssessmentQuestion[];
  learning_id?: string;
  title?: string;
  status?: string;
}

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  learning_id?: string;
  answers: Record<string, string>;
  score?: number;
  passed?: boolean;
  outcome?: "pass" | "revise" | string;
  strengths?: string[];
  weaknesses?: string[];
  detailed_feedback?: string;
  next_action?: string;
}

export interface NewsItem {
  title: string;
  summary?: string;
  what_happened?: string;
  why_it_matters?: string;
  recommended_action?: string;
  source_url: string;
  source_date?: string;
}

export interface NewsArticle {
  id?: string;
  title?: string;
  query?: string;
  items: NewsItem[];
  status: "verified" | "unavailable" | string;
  reason?: string;
  goal_id?: string;
}

export interface Recommendation {
  id: string;
  type?: string;
  title: string;
  description: string;
  reason?: string;
  action?: string;
  expected_benefit?: string;
  priority?: string;
  relevance_score?: number;
  kind?: string;
  source?: string;
  status?: "pending" | "accepted" | "rejected" | "completed" | string;
  created_at?: string;
}


export interface Memory {
  id: string;
  type?: string;
  category?: string;
  key?: string;
  content?: string;
  value?: string;
  importance?: string;
  confidence?: string | number;
  source?: string;
  created_at?: string;
}

export interface Project {
  id: string;
  title: string;
  objective: string;
  required_skills: string[];
  technologies: string[];
  difficulty: "foundation" | "intermediate" | "advanced";
  estimated_minutes: number;
  goal_id?: string;
  status: string;
  milestones: Array<{ title: string; status: string }>;
}

export interface Conversation {
  id: string;
  title?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  created_at?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  sources?: string[];
}

export interface DocumentItem {
  id: string;
  title?: string;
  filename?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface NotificationPreferences {
  enabled: boolean;
  task_reminders: boolean;
  learning_reminders: boolean;
  article_reminders: boolean;
  timezone: string;
  learning_time?: string | null;
  article_times: string[];
}

export interface ProgressSummary {
  goal_progress: number;
  completed_tasks: number;
  active_goals: number;
  overdue_tasks: number;
  generated_at?: string;
  [key: string]: unknown;
}

export interface Dashboard {
  career_snapshot: {
    profession?: string;
    target_profession?: string;
    goal?: Goal | null;
    current_phase?: RoadmapPhase | null;
    progress: number;
  };
  today: {
    tasks: Task[];
    recommended_action?: Recommendation | null;
  };
  ai_insight: string;
  progress: ProgressSummary;
}

export interface HistoryBundle {
  goal_history: Array<Record<string, unknown>>;
  roadmap_history: Array<Record<string, unknown>>;
  task_history: Array<Record<string, unknown>>;
  learning_history: Array<Record<string, unknown>>;
  assessment_history: Array<Record<string, unknown>>;
  recommendation_history: Array<Record<string, unknown>>;
}

export interface WeeklyReport {
  [key: string]: unknown;
}
