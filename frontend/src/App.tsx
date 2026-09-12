import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GuestOnly, RequireAuth } from "./components/RouteGuards";
import { Shell } from "./components/Shell";

import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

import { DashboardPage } from "./pages/DashboardPage";
import { GoalsListPage } from "./pages/GoalsListPage";
import { GoalDetailPage } from "./pages/GoalDetailPage";
import { TasksPage } from "./pages/TasksPage";
import { LearningPage } from "./pages/LearningPage";
import { LearningDetailPage } from "./pages/LearningDetailPage";
import { NewsPage } from "./pages/NewsPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ChatPage } from "./pages/ChatPage";
import { MemoriesPage } from "./pages/MemoriesPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
          <Route path="/reset-password" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />

          <Route
            element={
              <RequireAuth>
                <Shell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/goals" element={<GoalsListPage />} />
            <Route path="/goals/:id" element={<GoalDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path="/learning/:id" element={<LearningDetailPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/memories" element={<MemoriesPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
