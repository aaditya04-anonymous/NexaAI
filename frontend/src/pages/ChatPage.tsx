import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { getTodaysTasks, listDocuments, listGoals, sendChat } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import { getApiBase } from "../lib/config";
import type { DocumentItem, Goal, Task } from "../lib/types";
import { Button, ErrorNote } from "../components/ui";
import { MarkdownContent } from "../components/MarkdownContent";

interface Line {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp?: string;
  id?: string;
  contextMode?: string;
}

type ContextMode = "general" | "goal" | "task" | "document";

export function ChatPage() {
  const location = useLocation();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [lines, setLines] = useState<Line[]>([]);
  const [message, setMessage] = useState(() => {
    const state = location.state as { prefill?: string } | null;
    return state?.prefill ?? "";
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("AI Active");
  const [copiedLineId, setCopiedLineId] = useState<string | null>(null);

  // Context grounding state
  const [contextMode, setContextMode] = useState<ContextMode>("general");
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Search & scroll states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch AI health & active configuration
  useEffect(() => {
    fetch(`${getApiBase()}/api/health`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ai?.primary === "groq" && data?.ai?.groq_configured) {
          setModelBadge(`Groq ${data?.ai?.groq_model || "Llama 3.3"} Active`);
        } else if (data?.ai?.gemini_configured) {
          setModelBadge(`Gemini ${data?.ai?.gemini_model || "Flash"} Active`);
        } else {
          setModelBadge("Groq / Gemini AI Active");
        }
      })
      .catch(() => {});
  }, []);

  // Fetch contextual entities (Goal, Tasks, Knowledge Docs)
  useEffect(() => {
    listGoals()
      .then((goals) => {
        const active = goals.find((g) => g.status === "active") || goals[0] || null;
        setActiveGoal(active);
      })
      .catch(() => {});

    getTodaysTasks().then(setTodaysTasks).catch(() => {});
    listDocuments().then(setDocuments).catch(() => {});
  }, []);

  // Smooth auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [lines, busy, showScrollBottom]);

  // Monitor scroll position to show/hide the floating 'Jump to Latest' button
  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottom(distanceToBottom > 150);
  }

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [message]);

  async function handleSendMessage(textToSend?: string) {
    const outgoing = (textToSend ?? message).trim();
    if (!outgoing || busy) return;

    setError(null);
    setBusy(true);
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userLineId = `user-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setLines((prev) => [
      ...prev,
      { role: "user", content: outgoing, timestamp: timeStr, id: userLineId, contextMode },
    ]);

    // Determine relevant context ID based on selected mode
    let contextId: string | undefined = undefined;
    if (contextMode === "goal" && activeGoal) {
      contextId = activeGoal.id;
    } else if (contextMode === "task" && todaysTasks.length > 0) {
      contextId = todaysTasks[0].id;
    } else if (contextMode === "document" && documents.length > 0) {
      contextId = documents[0].id;
    }

    try {
      const res = await sendChat(outgoing, conversationId, contextMode, contextId);
      setConversationId(res.conversation_id);
      const assistantLineId = `asst-${Date.now()}`;
      setLines((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.message,
          sources: res.sources,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          id: assistantLineId,
          contextMode,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That message didn't send.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    handleSendMessage();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function copyLineText(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLineId(id);
      setTimeout(() => setCopiedLineId(null), 2000);
    });
  }

  function resetConversation() {
    setLines([]);
    setConversationId(undefined);
    setError(null);
    setMessage("");
    setSearchQuery("");
    setIsSearching(false);
  }

  function exportConversation() {
    if (lines.length === 0) return;
    const markdown = lines
      .map((l) => `### ${l.role === "user" ? "You" : "Nexa Career AI"} (${l.timestamp || ""}) [${l.contextMode || "general"}]\n\n${l.content}\n`)
      .join("\n---\n\n");
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexa-career-coaching-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filter messages if search query is active
  const displayedLines = searchQuery.trim()
    ? lines.filter((l) => l.content.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : lines;

  // Context mode configuration
  const contextOptions: Array<{
    mode: ContextMode;
    label: string;
    icon: string;
    badge?: string;
    subtext: string;
  }> = [
    {
      mode: "general",
      label: "General Career",
      icon: "🌐",
      subtext: "Comprehensive advice across all industries",
    },
    {
      mode: "goal",
      label: "Active Goal",
      icon: "🎯",
      badge: activeGoal ? (activeGoal.title.length > 20 ? activeGoal.title.slice(0, 20) + "…" : activeGoal.title) : "No Active Goal",
      subtext: activeGoal ? `Grounded in: ${activeGoal.title}` : "Create a goal to enable",
    },
    {
      mode: "task",
      label: "Today's Tasks",
      icon: "📋",
      badge: `${todaysTasks.length} Tasks`,
      subtext: `${todaysTasks.length} daily sprint items in focus`,
    },
    {
      mode: "document",
      label: "Resume & Docs",
      icon: "📄",
      badge: `${documents.length} Docs`,
      subtext: `${documents.length} verified documents loaded`,
    },
  ];

  // Quick follow-up action suggestions
  const followUpSuggestions = [
    { label: "🎯 Break into daily tasks", prompt: "Break these recommendations down into practical daily tasks I can tackle this week." },
    { label: "💡 Explain in simpler terms", prompt: "Can you explain this concept more simply with an intuitive analogy?" },
    { label: "💻 Show hands-on code", prompt: "Provide a concrete hands-on code example demonstrating this implementation." },
    { label: "📌 3 Key takeaways", prompt: "Summarize the top 3 actionable takeaways from your previous response." },
    { label: "❓ What should I do next?", prompt: "Based on my current profile and roadmap, what is the exact next step I should take right now?" },
  ];

  // Prompt starter categories
  const promptStarters = [
    {
      icon: "🚀",
      title: "Accelerate to AI Engineer",
      prompt: "How can I accelerate my roadmap to an AI Engineer role?",
      category: "Roadmap Acceleration",
    },
    {
      icon: "🔍",
      title: "Review Gaps & Projects",
      prompt: "Review my current skill gaps and recommend practice projects",
      category: "Skill Diagnostics",
    },
    {
      icon: "🎯",
      title: "Weekly Mastery Goals",
      prompt: "What are the top 3 concepts I should master this week?",
      category: "Action Planning",
    },
    {
      icon: "💼",
      title: "Mock Interview Simulation",
      prompt: "Conduct a technical interview scenario for a Machine Learning engineer position",
      category: "Interview Prep",
    },
  ];

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col space-y-2.5">
      {/* Compact Low-Profile Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#17191B] text-white text-[10px] shadow-xs">
            ✦
          </span>
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-[#17191B]">
              AI Career <span className="pill-word text-[11px] font-normal py-0.5 px-2">Coach</span>
            </h1>
            <span className="hidden md:inline-block text-[11px] text-[#666C72]">
              • Grounded in your profile, verified roadmaps & market signals
            </span>
          </div>
        </div>

        {/* Action Controls & Active Model Badge */}
        <div className="flex items-center gap-2">
          {lines.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setIsSearching(!isSearching)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all shadow-2xs ${
                  isSearching || searchQuery
                    ? "border-[#17191B] bg-[#17191B] text-white"
                    : "border-[#E4E7E8] bg-white text-[#17191B] hover:border-[#17191B] hover:bg-[#F8F9F8]"
                }`}
                title="Search inside conversation"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </button>
              <button
                type="button"
                onClick={exportConversation}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E4E7E8] bg-white px-3 py-1 text-xs font-semibold text-[#17191B] hover:border-[#17191B] hover:bg-[#F8F9F8] transition-all shadow-2xs"
                title="Export conversation to Markdown"
              >
                <svg className="w-3.5 h-3.5 text-[#666C72]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export .md
              </button>
              <button
                type="button"
                onClick={resetConversation}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7E8] bg-white px-3 py-1 text-xs font-semibold text-[#17191B] hover:border-[#17191B] hover:bg-[#F8F9F8] transition-all shadow-2xs"
                title="Start a new chat thread"
              >
                <span>+ New Topic</span>
              </button>
            </>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EEF5] px-3 py-1 text-xs font-semibold text-[#1b3b5a] border border-[#B7D3E7]/50 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#17191B] animate-pulse" />
            {modelBadge}
          </span>
        </div>
      </div>

      {/* Main Conversational Container (Maximized Height & Space) */}
      <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden rounded-[26px] border border-[#E4E7E8] bg-white p-4 sm:p-5 shadow-sm">
        {/* Context Grounding Control Bar */}
        <div className="mb-3 flex flex-col gap-1.5 pb-2.5 border-b border-[#E4E7E8]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1b3b5a]">
              <span>✦</span> Grounding Context:
            </span>
            <span className="text-[11px] text-[#666C72]">
              {contextOptions.find((c) => c.mode === contextMode)?.subtext}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {contextOptions.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setContextMode(opt.mode)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all shadow-2xs ${
                  contextMode === opt.mode
                    ? "border-2 border-[#17191B] bg-[#17191B] text-white font-semibold"
                    : "border border-[#E4E7E8] bg-[#F8F9F8] text-[#17191B] hover:bg-white hover:border-[#17191B]"
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                {opt.badge && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      contextMode === opt.mode
                        ? "bg-white/20 text-white"
                        : "bg-[#E5EEF5] text-[#1b3b5a]"
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Message Search Bar Overlay (if toggled) */}
        {isSearching && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[#B7D3E7] bg-[#E5EEF5]/40 p-2 text-xs">
            <svg className="w-4 h-4 text-[#1b3b5a] ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words in current conversation history..."
              className="flex-1 bg-transparent px-2 py-1 text-xs text-[#17191B] placeholder:text-[#666C72] focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <span className="text-[11px] font-semibold text-[#1b3b5a]">
                {displayedLines.length} found
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setIsSearching(false);
              }}
              className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#666C72] hover:text-[#17191B] border border-[#E4E7E8]"
            >
              Close
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 space-y-6 overflow-y-auto pr-3"
        >
          {lines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#E5EEF5] to-[#C9EBC4] text-xl shadow-xs">
                ✦
              </div>
              <h3 className="font-display text-2xl font-bold text-[#17191B]">
                Your Personal Career Partner
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#666C72]">
                Ask for step-by-step roadmap guidance, coding challenge walk-throughs, interview preparation, or portfolio critique. Nexa dynamically tailors recommendations to your profile history.
              </p>

              {/* Enhanced Prompt Starter Cards */}
              <div className="mt-7 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 text-left w-full">
                {promptStarters.map((starter) => (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-[#E4E7E8] bg-[#F8F9F8] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#17191B] hover:bg-white hover:shadow-sm cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-lg">{starter.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1b3b5a] bg-[#E5EEF5] px-2 py-0.5 rounded-full">
                          {starter.category}
                        </span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-[#17191B] group-hover:text-black">
                        {starter.title}
                      </h4>
                      <p className="mt-1 text-xs text-[#666C72] line-clamp-2">
                        "{starter.prompt}"
                      </p>
                    </div>
                    <span className="mt-3 text-[11px] font-semibold text-[#17191B] flex items-center gap-1 group-hover:underline">
                      Ask now →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {displayedLines.map((line, idx) => {
            const isLastAssistantMessage =
              line.role === "assistant" &&
              idx === displayedLines.map((l) => l.role).lastIndexOf("assistant");

            return (
              <div
                key={line.id || idx}
                className={`flex flex-col ${line.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Header Label */}
                <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#666C72]">
                  {line.role === "user" ? (
                    <>
                      <span>You</span>
                      {line.timestamp && <span className="font-normal text-[#9AA0A6]">• {line.timestamp}</span>}
                    </>
                  ) : (
                    <>
                      <span className="text-[#1b3b5a] flex items-center gap-1">
                        <span className="text-xs">✦</span> Nexa Career AI
                      </span>
                      {line.contextMode && line.contextMode !== "general" && (
                        <span className="rounded-full bg-[#E5EEF5] px-2 py-0.2 text-[9px] font-bold text-[#1b3b5a]">
                          {line.contextMode.toUpperCase()}
                        </span>
                      )}
                      {line.timestamp && <span className="font-normal text-[#9AA0A6]">• {line.timestamp}</span>}
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[88%] text-sm shadow-xs transition-all ${
                    line.role === "user"
                      ? "rounded-3xl rounded-br-xs bg-[#17191B] px-5 py-3.5 text-white shadow-sm"
                      : "rounded-3xl rounded-bl-xs border border-[#E2E8F0] bg-[#F9FBFC] p-6 text-[#17191B]"
                  }`}
                >
                  {line.role === "user" ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{line.content}</div>
                  ) : (
                    <div>
                      <MarkdownContent content={line.content} />

                      {/* Sources Section */}
                      {line.sources && line.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[#E4E7E8] flex flex-wrap items-center gap-2 text-xs text-[#666C72]">
                          <span className="font-semibold uppercase tracking-wider text-[#1b3b5a] text-[10px]">
                            Consulted Sources:
                          </span>
                          {line.sources.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 rounded-full bg-[#E5EEF5] px-2.5 py-1 text-[11px] font-medium text-[#1b3b5a] border border-[#B7D3E7]/40"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {src}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quick Follow-up Action Chips (shown on latest assistant response) */}
                      {isLastAssistantMessage && !busy && (
                        <div className="mt-5 pt-3.5 border-t border-[#E4E7E8]/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#666C72] mb-2 block">
                            Quick Follow-Up Ideas:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {followUpSuggestions.map((sug) => (
                              <button
                                key={sug.label}
                                type="button"
                                onClick={() => handleSendMessage(sug.prompt)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7E8] bg-white px-3 py-1.5 text-xs font-medium text-[#17191B] hover:border-[#17191B] hover:bg-[#F8F9F8] transition-all shadow-2xs cursor-pointer active:scale-95"
                              >
                                {sug.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Utility Actions Bar */}
                      <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-[#E2E8F0]/60 text-xs text-[#666C72]">
                        <span className="text-[10px] text-[#9AA0A6] uppercase tracking-wider">
                          Context: {line.contextMode || "General"}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyLineText(line.id || String(idx), line.content)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7E8] bg-white px-3 py-1 text-xs font-medium text-[#17191B] hover:border-[#17191B] hover:bg-[#F8F9F8] transition-all shadow-2xs cursor-pointer"
                          title="Copy entire response"
                        >
                          {copiedLineId === (line.id || String(idx)) ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-emerald-700 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 text-[#666C72]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Copy response</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Animated Thinking State */}
          {busy && (
            <div className="flex flex-col items-start space-y-1">
              <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[#1b3b5a] flex items-center gap-1">
                <span className="text-xs">✦</span> Nexa Career AI
              </span>
              <div className="rounded-3xl rounded-bl-xs border border-[#B7D3E7]/50 bg-[#E5EEF5]/40 px-5 py-4 text-sm text-[#1b3b5a] shadow-xs flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1b3b5a] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#17191B]"></span>
                </span>
                <span className="font-medium text-xs sm:text-sm">
                  Analyzing your profile & synthesizing career recommendations...
                </span>
                <span className="flex items-center gap-1 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1b3b5a] animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1b3b5a] animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1b3b5a] animate-bounce"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Floating 'Jump to Latest' Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-24 right-8 z-20 flex items-center gap-1.5 rounded-full border border-[#17191B] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#17191B] shadow-lg hover:bg-[#F8F9F8] transition-all cursor-pointer animate-bounce"
            title="Jump to latest message"
          >
            <svg className="w-3.5 h-3.5 text-[#17191B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>Jump to latest</span>
          </button>
        )}

        {error && (
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        )}

        {/* Input Bar with Auto-expanding Textarea */}
        <form onSubmit={onSubmit} className="mt-4 pt-3 border-t border-[#E4E7E8]">
          <div className="flex items-end gap-3 rounded-2xl border border-[#E4E7E8] bg-white p-2 focus-within:border-[#17191B] focus-within:ring-1 focus-within:ring-[#17191B] transition-all shadow-xs">
            <textarea
              ref={textareaRef}
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask your coach anything about your ${contextMode === "general" ? "career" : contextMode} (Press Enter to send, Shift + Enter for newline)...`}
              disabled={busy}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[#17191B] placeholder:text-[#666C72]/60 focus:outline-none max-h-36 leading-relaxed"
            />
            <Button
              type="submit"
              disabled={busy || !message.trim()}
              size="sm"
              className="mb-0.5 shrink-0"
            >
              {busy ? "Thinking…" : "Send Message →"}
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-[#9AA0A6]">
            <span>Tip: Switch the Grounding Context above to tailor answers to your goals or sprint tasks.</span>
            <span>{message.length} chars</span>
          </div>
        </form>
      </div>
    </div>
  );
}
