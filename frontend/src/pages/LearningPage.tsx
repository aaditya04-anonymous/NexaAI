import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTodaysLearning } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { LearningContent } from "../lib/types";
import { Badge, Card, EmptyState, ErrorNote, Loader, PageHeader } from "../components/ui";

export function LearningPage() {
  const [items, setItems] = useState<LearningContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTodaysLearning()
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load lessons."));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Practice"
        title="Learning"
        description="Lessons generated from today's tasks — each one pairs with a short assessment."
      />
      {error && <ErrorNote message={error} />}
      {!items && !error && <Loader label="Loading lessons" />}
      {items && items.length === 0 && (
        <EmptyState title="No lessons yet" body="Open a task on the Today's tasks page and choose “Get a lesson for this.”" />
      )}
      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/learning/${item.id}`} className="block">
                <Card className="transition-colors hover:border-ink/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-lg text-ink">{item.title}</p>
                      <p className="text-sm text-ink-soft">{item.topic}</p>
                    </div>
                    <Badge>{item.difficulty}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">{item.estimated_minutes} min · {item.sections?.length ?? 0} sections</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
