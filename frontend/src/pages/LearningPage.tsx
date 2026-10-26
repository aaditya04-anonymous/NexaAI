import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTodaysLearning } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { LearningContent } from "../lib/types";
import { Badge, CircleArrow, EmptyState, ErrorNote, Loader, PageHeader } from "../components/ui";

export function LearningPage() {
  const [items, setItems] = useState<LearningContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTodaysLearning()
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load lessons."));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Knowledge Base"
        title="Interactive"
        pillHighlight="Learning Modules"
        description="Focused, practical conceptual deep-dives generated to support your daily practice and roadmap milestones."
      />

      {error && <ErrorNote message={error} />}
      {!items && !error && <Loader label="Loading learning modules" />}
      
      {items && items.length === 0 && (
        <EmptyState
          title="No Learning Modules Active Yet"
          body="Open a task from Today's Tasks and click 'Generate AI Lesson' to produce an interactive module."
          action={
            <Link
              to="/tasks"
              className="inline-flex items-center gap-2 rounded-full bg-[#17191B] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition-all"
            >
              Browse Today's Tasks →
            </Link>
          }
        />
      )}

      {items && items.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {items.map((item, idx) => (
            <Link key={item.id} to={`/learning/${item.id}`} className="group block">
              <div className="prospera-card flex h-full flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#666C72]">
                      Module 0{idx + 1}
                    </span>
                    <Badge tone={item.difficulty === "advanced" ? "peach" : item.difficulty === "intermediate" ? "blue" : "mint"}>
                      {item.difficulty}
                    </Badge>
                  </div>

                  <h3 className="font-display text-2xl font-bold text-[#17191B] group-hover:text-black">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">
                    Topic: {item.topic}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E4E7E8] pt-4">
                  <span className="text-xs text-[#666C72]">
                    ⏱ {item.estimated_minutes} min • {item.sections?.length ?? 0} interactive sections
                  </span>
                  <CircleArrow direction="up-right" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
