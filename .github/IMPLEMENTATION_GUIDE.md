# NexaAI Implementation Guide

## Project Overview

NexaAI is a personalized AI career and growth agent that combines goal management, learning, assessment, progress tracking, memory, career intelligence, and personalized recommendations into one continuous system.

## Architecture Overview

### Core Loop

```
USER PROFILE
  ↓
PROFESSION & GOALS
  ↓
AI GOAL DISCUSSION
  ↓
SKILL GAP ANALYSIS
  ↓
ROADMAP GENERATION
  ↓
DAILY TASKS
  ↓
LEARNING CONTENT
  ↓
ASSESSMENT
  ↓
PROGRESS TRACKING
  ↓
MEMORY EXTRACTION
  ↓
CAREER INTELLIGENCE
  ↓
PERSONALIZED RECOMMENDATIONS
  ↓
NEXT ACTIONS
```

## Technology Stack

- **Backend**: FastAPI (Python) with Motor async driver
- **Database**: MongoDB
- **AI Agents**: LangGraph with specialized agents
- **Frontend**: Streamlit
- **Authentication**: JWT with Argon2 password hashing

## Key Components Implemented

### 1. Specialized AI Agents (`backend/app/ai/agents.py`)

- **GoalDiscussionAgent**: Conversational goal planning with progressive questioning
- **SkillGapAgent**: Analyzes gaps between current and target skills
- **RoadmapGenerationAgent**: Creates personalized learning roadmaps with phases
- **LearningContentAgent**: Generates interactive lesson structures
- **AssessmentAgent**: Creates adaptive assessments and evaluates responses
- **MemoryAgent**: Extracts structured memories from interactions
- **RecommendationAgent**: Generates personalized recommendations based on user state
- **CareerIntelligenceAgent**: Analyzes market trends and career requirements

### 2. Learning Service (`backend/app/services/learning.py`)

**Features:**
- Create interactive learning content for tasks
- Retrieve learning content with full context
- Generate assessments based on learning topics
- Submit assessments with automatic evaluation
- Track learning progress and completion status

**Key Methods:**
- `create_learning_content()` - Create structured interactive lessons
- `get_today_learning()` - Get personalized daily learning
- `create_assessment()` - Generate quiz/test
- `submit_assessment()` - Evaluate and provide feedback

### 3. Memory Service (`backend/app/services/memory.py`)

**Features:**
- Extract structured memories from interactions
- Store memories with confidence scores
- Retrieve relevant memories for context
- User-controlled memory management (view, edit, delete)
- Categorized memory organization

**Memory Categories:**
- preference
- career
- skill
- goal
- learning
- strength
- weakness
- behavior
- project
- decision
- recommendation

### 4. Recommendation Service (`backend/app/services/news.py`)

**Features:**
- Generate personalized recommendations
- Combine goal, skill, market, and performance data
- Rank recommendations by priority and relevance
- Track recommendation status (suggested, accepted, rejected, completed)

**Recommendation Types:**
- learn
- revise
- practice
- project
- video
- article
- interview
- portfolio
- network

### 5. Progress Service (`backend/app/services/progress.py`)

**Features:**
- Multi-level progress tracking (goal, skill, task, learning, assessment)
- Career readiness scoring
- Activity history logging
- Weekly report generation
- Performance analytics

**Metrics Tracked:**
- Goal progress (by roadmap phase)
- Skill proficiency levels
- Task completion rates
- Learning engagement
- Assessment performance
- Career readiness score (0-100)

## Database Schema

### Core Collections

```
users
├── email
├── password_hash
├── created_at
└── updated_at

user_preferences
├── user_id
├── preferred_learning_time
├── news_time_1, news_time_2
├── timezone
└── notification settings

goals
├── user_id
├── title
├── description
├── target_role
├── deadline
├── status
├── progress
└── roadmap_id

roadmaps
├── user_id
├── goal_id
├── status (draft, review, finalized)
├── total_duration_days
└── phases

roadmap_phases
├── roadmap_id
├── title
├── duration_days
├── skills
├── milestones
└── order

user_skills
├── user_id
├── skill_name
├── proficiency_level
└── last_assessed

tasks
├── user_id
├── goal_id
├── phase_id
├── title
├── type
├── status
├── due_date
└── completion_percentage

learning_content
├── user_id
├── task_id
├── topic
├── difficulty
├── sections
├── diagrams
├── code_examples
├── exercises
└── youtube_resources

assessments
├── user_id
├── learning_id
├── topic
├── questions
├── passing_score
└── difficulty

assessment_attempts
├── user_id
├── assessment_id
├── answers
├── score
├── passed
└── completed_at

memories
├── user_id
├── type
├── key
├── value
├── importance
├── confidence
├── last_used_at
└── created_at

recommendations
├── user_id
├── type
├── title
├── reason
├── priority
├── relevance_score
└── status

news_articles
├── user_id
├── title
├── news_items
├── career_impact
└── publication_date

progress
├── user_id
├── goal_progress
├── skill_progress
├── task_progress
├── assessment_performance
├── career_readiness
└── timestamp

activity_history
├── user_id
├── entity_type
├── entity_id
├── action
├── details
└── created_at
```

## API Endpoints

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/forgot-password` - Request reset
- `POST /auth/reset-password` - Reset password

### User Profile
- `GET /users/me` - Get profile
- `PUT /users/me` - Update profile
- `GET /profile` - Get career profile
- `PUT /profile` - Update career profile

### Goals
- `POST /goals` - Create goal
- `GET /goals` - List goals
- `GET /goals/{goal_id}` - Get goal details
- `PUT /goals/{goal_id}` - Update goal
- `POST /goals/{goal_id}/discuss` - Goal discussion

### Roadmaps
- `GET /roadmaps/{roadmap_id}` - Get roadmap
- `PUT /roadmaps/{roadmap_id}` - Update roadmap
- `POST /roadmaps/{roadmap_id}/regenerate` - Regenerate

### Tasks
- `GET /tasks/today` - Today's tasks
- `GET /tasks/upcoming` - Upcoming tasks
- `POST /tasks` - Create task
- `GET /tasks/{task_id}` - Get task
- `POST /tasks/{task_id}/complete` - Complete task

### Learning
- `GET /learning/today` - Today's learning
- `GET /learning/{learning_id}` - Get learning content
- `POST /learning/{learning_id}/chat` - Ask question
- `POST /learning/{learning_id}/complete` - Mark complete

### Assessments
- `GET /assessments/{assessment_id}` - Get assessment
- `POST /assessments/{assessment_id}/submit` - Submit answers
- `GET /assessments/{assessment_id}/results` - Get results

### Memory
- `GET /memories` - List memories
- `PUT /memories/{memory_id}` - Update memory
- `DELETE /memories/{memory_id}` - Delete memory

### Recommendations
- `GET /recommendations` - List recommendations
- `POST /recommendations/{id}/accept` - Accept
- `POST /recommendations/{id}/reject` - Reject
- `POST /recommendations/{id}/complete` - Mark complete

### Progress
- `GET /progress` - Overall progress
- `GET /progress/goal/{goal_id}` - Goal progress
- `GET /progress/skills` - Skill breakdown
- `GET /progress/weekly` - Weekly report
- `GET /history` - Activity history

### News & Career
- `GET /career/news/today` - Daily news
- `GET /career/news/{article_id}` - Get article
- `POST /career/news/{article_id}/chat` - Ask about news
- `POST /career/news/{article_id}/add-to-roadmap` - Add to roadmap

## Key Design Patterns

### 1. User-Scoped Repository Pattern
All queries include `user_id` to ensure data isolation:
```python
await repo.get(user_id, item_id)  # Always filters by user
```

### 2. Contextual AI
AI agents receive only relevant context:
- Current user state
- Relevant goal/roadmap
- Recent memories
- Market data
- Previous interactions

### 3. Progressive Disclosure
- Onboarding gathers information progressively
- Goal discussion asks one question at a time
- Learning content reveals information step-by-step

### 4. Adaptive Learning
- Assessment performance determines next content
- Low scores trigger revision before advancement
- High scores unlock advanced topics

### 5. Memory-Driven Personalization
- Every interaction can contribute to memory
- Memories inform future recommendations
- User controls memory retention

## Workflow Examples

### Goal Creation Workflow
```
1. User creates goal: "Become AI Engineer"
2. System creates goal in "discovery" status
3. Goal Discussion Agent asks progressive questions
4. Collect: experience, skills, timeline, preferences
5. Generate Skill Gap Analysis
6. Create Draft Roadmap
7. User reviews and modifies
8. Finalize Roadmap (goal.status = "active")
9. Generate first day's tasks
```

### Daily Learning Workflow
```
1. Morning: Generate today's tasks from roadmap
2. Show why each task matters
3. Provide learning content for each task
4. Support with YouTube resources
5. Interactive questions during learning
6. Mini challenges/exercises
7. Generate assessment
8. Evaluate and provide feedback
9. Extract memories from performance
10. Update progress
11. Generate next recommendation
```

### Progress Calculation Workflow
```
1. Get completed tasks count
2. Get passed assessments count
3. Calculate skill proficiency from assessments
4. Calculate phase progress from task completion
5. Calculate goal progress from phase completion
6. Calculate career readiness from all factors
7. Generate recommendations based on gaps
8. Store progress snapshot
9. Generate insights and suggestions
```

## Implementation Status

### Completed ✅
- Authentication (JWT + Argon2)
- User profiles and preferences
- Goal creation and management
- Task management
- Basic roadmap structure
- Specialized AI agents framework
- Learning content generation service
- Assessment service with evaluation
- Memory extraction and retrieval
- Recommendation engine
- Progress tracking at multiple levels
- Activity history logging

### In Progress 🔄
- Goal discussion conversational workflow (fully hooked up to LLM)
- Interactive learning content generation with LLM
- News/career article generation and scheduling
- Frontend dashboard and UI pages
- Background job scheduler for daily tasks/news
- Comprehensive testing suite

### To Do 📋
- YouTube resource discovery integration
- Web search integration for news
- Market data collection and analysis
- Email notifications
- Real-time progress visualization
- Performance optimization and caching
- Production deployment setup

## Running the Application

### Start Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Update .env with MongoDB URI and API keys
uvicorn app.main:app --reload
```

### Start Frontend
```bash
pip install -r frontend/requirements.txt
streamlit run frontend/app.py
```

### Run Tests
```bash
cd backend
pytest tests
```

## Next Steps for Completion

1. **Frontend Dashboard**: Build Streamlit pages for all features
2. **Goal Discussion Workflow**: Implement full LLM-powered conversation
3. **Scheduling**: Implement daily task generation, news fetching
4. **News Pipeline**: Web search → personalization → storage
5. **Testing**: Add comprehensive test coverage
6. **Optimization**: Cache learning content, embed caching
7. **Deployment**: Docker, environment configs, monitoring

## Contributing

- Follow existing patterns for new features
- Maintain user data isolation with user_id filtering
- Use async/await throughout
- Add tests for new functionality
- Document complex business logic
