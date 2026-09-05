# NexaAI implementation plan

## Existing foundation

The repository already provides FastAPI, MongoDB persistence, JWT/Argon2 authentication, a user-owned repository boundary, Gemini-backed chat, document ingestion, and a Streamlit client. This implementation retains those foundations instead of replacing them.

## Delivered connected-core increment

1. **Identity and career profile:** authenticated users can persist career, skills, preferences, availability, timezone, and memory settings through /users/me.
2. **Goal discovery:** a goal begins in discovery. Goal discussion records the user and NexaAI turns before roadmap drafting.
3. **Collaborative roadmap:** roadmap generation calculates skill gaps from the profile and goal technologies, stores editable phase documents, and stays draft until the user explicitly finalizes it.
4. **Daily action loop:** only a finalized roadmap can generate a time-budgeted daily plan. Generated tasks carry goal and roadmap-phase links; task completion produces immutable history.
5. **Evidence-based progress:** dashboard and progress metrics are calculated from task completion percentages and completed phases rather than arbitrary goal percentages.

## Connected intelligence services

Learning is generated only from a user-owned task and includes structured concept, analogy, flow, exercise, and mistakes sections. Assessments create immutable attempts and adapt the next action from performance. Memory extraction stores only explicit durable signals and respects the profile-level memory switch. Contextual chat retrieves the requested user-owned record and a bounded set of recent memories rather than sending the account database to the model.

Career research is provider-backed and returns a prior verified article or an explicit unavailable state on provider failure; it never fabricates news. The worker records due notifications in the user's timezone so a delivery channel can be added independently. Recommendations, projects, weekly reports, history, and progress are all linked to the same user-owned goal/task/learning records.

## Operational follow-up

Add deployment-specific notification delivery, provider-specific YouTube metadata collection, Mongo-backed endpoint integration fixtures, rate limiting, and monitoring before a public production launch.

Every subsequent increment must preserve the user_id filter on every user-owned read/write and append history when an important career decision changes.
