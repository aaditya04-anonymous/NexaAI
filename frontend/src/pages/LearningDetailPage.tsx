import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { generateAssessment, getLearning, learningChat, submitAssessment } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Assessment, AssessmentAttempt, LearningContent } from "../lib/types";
import { Badge, Button, Card, ErrorNote, Input, Loader, PageHeader, Textarea } from "../components/ui";
import { MarkdownContent } from "../components/MarkdownContent";

export function LearningDetailPage() {
  const { id = "" } = useParams();
  const [lesson, setLesson] = useState<LearningContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLearning(id)
      .then(setLesson)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this lesson."));
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!lesson) return <Loader label="Loading learning module" />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Difficulty: ${lesson.difficulty}`}
        title={lesson.title}
        description={`Mastery topic: ${lesson.topic} • Estimated completion: ${lesson.estimated_minutes} mins`}
        action={
          <Link
            to="/learning"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7E8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#17191B] hover:border-[#17191B] transition-all"
          >
            ← Back to Modules
          </Link>
        }
      />

      <div className="space-y-6">
        {lesson.sections?.map((section, idx) => (
          <Card key={idx} className="space-y-3">
            {section.heading && (
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E5EEF5] text-xs font-bold text-[#1b3b5a]">
                  {idx + 1}
                </span>
                <h3 className="font-display text-xl font-bold text-[#17191B]">
                  {String(section.heading)}
                </h3>
              </div>
            )}
            {section.content && (
              <div className="pt-1">
                <MarkdownContent content={String(section.content)} />
              </div>
            )}
          </Card>
        ))}

        {lesson.code_examples?.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display text-xl font-bold text-[#17191B]">
              Implementation & Code Examples
            </h3>
            <div className="space-y-3">
              {lesson.code_examples.map((code, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-[#17191B] bg-[#17191B] shadow-sm">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-black/30">
                    <span className="text-xs font-mono text-white/60">code_example_{idx + 1}.py</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">python</span>
                  </div>
                  <pre className="overflow-x-auto p-4 text-xs font-mono text-white/90">
                    <code>{code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {lesson.youtube_resources?.length > 0 && (
          <Card className="bg-[#E5EEF5]/40 border-[#B7D3E7]/40">
            <h3 className="font-display text-lg font-bold text-[#1b3b5a]">
              Recommended Curated Media
            </h3>
            <ul className="mt-3 space-y-2">
              {lesson.youtube_resources.map((r, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">▶</span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#17191B] hover:underline"
                  >
                    {r.title ?? r.url}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Assessment Section */}
      <div className="border-t border-[#E4E7E8] pt-8">
        <AssessmentPanel learningId={lesson.id} />
      </div>

      {/* Lesson AI Chat */}
      <div className="border-t border-[#E4E7E8] pt-8">
        <LessonChat learningId={lesson.id} />
      </div>
    </div>
  );
}

function AssessmentPanel({ learningId }: { learningId: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentAttempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setBusy(true);
    setError(null);
    try {
      const a = await generateAssessment(learningId);
      setAssessment(a);
      setResult(null);
      setAnswers({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate an assessment.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!assessment) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await submitAssessment(assessment.id, answers);
      setResult(attempt);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your answers.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Milestone Validation</span>
          <h2 className="font-display text-2xl font-bold text-[#17191B]">Check Understanding</h2>
        </div>
        {!assessment && (
          <Button size="sm" onClick={onStart} disabled={busy}>
            {busy ? "Formulating Quiz…" : "Start Interactive Assessment →"}
          </Button>
        )}
      </div>

      {error && <ErrorNote message={error} />}

      {assessment && !result && (
        <form onSubmit={onSubmit} className="space-y-5">
          {assessment.questions.map((q, idx) => (
            <Card key={idx} className="space-y-3">
              <p className="font-display text-base font-bold text-[#17191B]">
                {idx + 1}. {q.question}
              </p>
              {q.options ? (
                <div className="space-y-2 pt-1">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-sm transition-all ${
                        answers[String(idx)] === opt
                          ? "border-[#17191B] bg-[#E5EEF5] text-[#17191B] font-medium"
                          : "border-[#E4E7E8] bg-white text-[#666C72] hover:bg-[#F3F4F2]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${idx}`}
                        value={opt}
                        checked={answers[String(idx)] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [String(idx)]: opt }))}
                        className="accent-[#17191B]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  rows={2}
                  className="mt-2"
                  placeholder="Explain your solution or reasoning…"
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [String(idx)]: e.target.value }))}
                />
              )}
            </Card>
          ))}
          <Button type="submit" disabled={busy}>
            {busy ? "Evaluating Answers…" : "Submit Assessment →"}
          </Button>
        </form>
      )}

      {result && (
        <Card className={`border ${result.passed ? "border-[#A9DE9C] bg-[#C9EBC4]/30" : "border-peach bg-[#F4D9C6]/30"}`}>
          <div className="flex items-center gap-3">
            <Badge tone={result.passed ? "mint" : "peach"}>
              {result.passed ? "Passed ✓" : "Needs Revision"}
            </Badge>
            {typeof result.score === "number" && (
              <span className="font-display text-lg font-bold text-[#17191B]">
                Score: {result.score}%
              </span>
            )}
          </div>
          {result.detailed_feedback && (
            <p className="mt-3 text-sm leading-relaxed text-[#17191B]">
              {result.detailed_feedback}
            </p>
          )}
          {result.next_action && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#17191B]">
              Recommended Next Action: {result.next_action}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function LessonChat({ learningId }: { learningId: string }) {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setBusy(true);
    const outgoing = message;
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: outgoing }]);
    try {
      const res = await learningChat(learningId, outgoing, conversationId);
      setConversationId(res.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: res.message }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That message didn't send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Contextual Assistant</span>
        <h2 className="font-display text-2xl font-bold text-[#17191B]">Ask Questions on this Topic</h2>
      </div>

      {messages.length > 0 && (
        <Card className="max-h-[400px] overflow-y-auto space-y-4 p-5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#666C72]">
                {m.role === "user" ? "You" : "Nexa Tutor"}
              </span>
              <div
                className={`max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-xs bg-[#17191B] text-white"
                    : "rounded-bl-xs bg-[#F9FBFC] text-[#17191B] border border-[#E2E8F0]"
                }`}
              >
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <MarkdownContent content={m.content} />
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {error && <ErrorNote message={error} />}

      <form onSubmit={onSubmit} className="flex gap-3">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask for clarification or another code example…"
          disabled={busy}
          className="flex-1"
        />
        <Button type="submit" disabled={busy || !message.trim()}>
          Ask Tutor →
        </Button>
      </form>
    </div>
  );
}
