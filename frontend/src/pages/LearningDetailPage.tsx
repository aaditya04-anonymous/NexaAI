import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { generateAssessment, getLearning, learningChat, submitAssessment } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Assessment, AssessmentAttempt, LearningContent } from "../lib/types";
import { Badge, Button, Card, ErrorNote, Input, Loader, PageHeader, Textarea } from "../components/ui";

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
  if (!lesson) return <Loader label="Opening lesson" />;

  return (
    <div>
      <PageHeader eyebrow={lesson.difficulty} title={lesson.title} description={lesson.topic} />

      <div className="space-y-6">
        {lesson.sections?.map((section, idx) => (
          <Card key={idx}>
            {section.heading && <p className="font-display text-lg text-ink">{String(section.heading)}</p>}
            {section.content && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{String(section.content)}</p>}
          </Card>
        ))}

        {lesson.code_examples?.length > 0 && (
          <div>
            <p className="mb-2 font-display text-lg text-ink">Code examples</p>
            <div className="space-y-3">
              {lesson.code_examples.map((code, idx) => (
                <pre key={idx} className="overflow-x-auto rounded-md border border-rule bg-ink px-4 py-3 text-xs text-paper">
                  <code>{code}</code>
                </pre>
              ))}
            </div>
          </div>
        )}

        {lesson.youtube_resources?.length > 0 && (
          <div>
            <p className="mb-2 font-display text-lg text-ink">Further watching</p>
            <ul className="space-y-1.5">
              {lesson.youtube_resources.map((r, idx) => (
                <li key={idx} className="text-sm">
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-ember-deep hover:underline">{r.title ?? r.url}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-rule pt-8">
        <AssessmentPanel learningId={lesson.id} />
      </div>

      <div className="mt-10 border-t border-rule pt-8">
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
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg text-ink">Check understanding</p>
        {!assessment && <Button size="sm" onClick={onStart} disabled={busy}>{busy ? "Preparing…" : "Start assessment"}</Button>}
      </div>

      {error && <div className="mb-3"><ErrorNote message={error} /></div>}

      {assessment && !result && (
        <form onSubmit={onSubmit} className="space-y-5">
          {assessment.questions.map((q, idx) => (
            <Card key={idx}>
              <p className="text-sm text-ink">{idx + 1}. {q.question}</p>
              {q.options ? (
                <div className="mt-2 space-y-1.5">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-ink-soft">
                      <input
                        type="radio" name={`q-${idx}`} value={opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [String(idx)]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea rows={2} className="mt-2" onChange={(e) => setAnswers((prev) => ({ ...prev, [String(idx)]: e.target.value }))} />
              )}
            </Card>
          ))}
          <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit answers"}</Button>
        </form>
      )}

      {result && (
        <Card>
          <div className="flex items-center gap-3">
            <Badge tone={result.passed ? "moss" : "ember"}>{result.passed ? "Passed" : "Needs another pass"}</Badge>
            {typeof result.score === "number" && <span className="text-sm text-ink-soft">{result.score}%</span>}
          </div>
          {result.detailed_feedback && <p className="mt-3 text-sm text-ink-soft">{result.detailed_feedback}</p>}
          {result.next_action && <p className="mt-2 text-sm text-ink">Next: {result.next_action}</p>}
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
    <div>
      <p className="mb-3 font-display text-lg text-ink">Ask about this lesson</p>
      {messages.length > 0 && (
        <div className="mb-3 space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === "user" ? "text-right" : ""}>
              <span className={`inline-block max-w-[85%] rounded-md px-3.5 py-2.5 text-left text-sm ${m.role === "user" ? "bg-ink text-paper" : "bg-surface text-ink"}`}>
                {m.content}
              </span>
            </div>
          ))}
        </div>
      )}
      {error && <div className="mb-3"><ErrorNote message={error} /></div>}
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask a question about this topic…" disabled={busy} />
        <Button type="submit" disabled={busy || !message.trim()}>Send</Button>
      </form>
    </div>
  );
}
