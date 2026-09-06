"""Specialized AI agent workflows for NexaAI."""
import logging
from typing import Callable, Any
from datetime import datetime, UTC

logger = logging.getLogger(__name__)


def fallback_response(intent: str, context: dict | None = None) -> str:
    """Return a transparent, context-aware response when Gemini is unavailable."""
    context = context or {}
    record = context.get("context_record") or {}
    topic = record.get("topic") or record.get("title") or "your current focus"
    responses = {
        "learning": f"Let's make {topic} practical. Start by explaining the core idea in your own words, then apply it to one small example. For RAG topics, focus on retrieval quality, grounding, and how retrieved context supports the answer.",
        "news": "Current career information is only shown from verified configured sources. Review the latest verified career update in Career intelligence before changing your roadmap.",
        "goal": "Clarify the outcome, your current starting point, and the evidence that would show progress. Nexa can then turn that context into an editable roadmap.",
        "task": f"For {topic}, choose the smallest useful action you can complete today and record the evidence or reflection afterward.",
        "document": "Search your uploaded documents for the relevant source, then use the returned passages as evidence for your next decision.",
        "progress": "Your next best step should connect a current roadmap phase to a small completed action. Check Daily plan and Progress & reports for the evidence already recorded.",
    }
    return responses.get(intent, responses["progress"])


class GoalDiscussionAgent:
    """Handles conversational goal planning and discussion."""
    
    def __init__(self):
        self.questions_asked = 0
        self.context_gathered = {}
    
    def generate_next_question(self, user_goal: str, gathered_context: dict) -> str:
        """Generate contextual question based on goal and user responses."""
        if not gathered_context.get("current_experience"):
            return "Thank you for sharing your goal. To create the right roadmap, I need to understand your current level. What experience do you have with the technologies related to your target role?"
        
        if not gathered_context.get("current_skills"):
            return f"Great! And what specific skills have you already developed? (e.g., programming languages, frameworks, tools)"
        
        if not gathered_context.get("timeline"):
            return "How much time do you have to work toward this goal? What's your target deadline?"
        
        if not gathered_context.get("daily_availability"):
            return "How many minutes can you dedicate to learning each day on average?"
        
        if not gathered_context.get("learning_style"):
            return "How do you prefer to learn? (e.g., hands-on projects, reading, videos, theory)"
        
        if not gathered_context.get("current_projects"):
            return "Do you have any current projects or portfolios that we should consider?"
        
        if not gathered_context.get("constraints"):
            return "Are there any constraints or preferences I should know about? (e.g., avoiding certain topics, focusing on specific technologies)"
        
        return f"I have enough information to create your roadmap. Based on what you've shared, I'll analyze the skill gap and draft a personalized roadmap for you."
    
    def has_sufficient_context(self, context: dict) -> bool:
        """Check if enough context has been gathered."""
        required_fields = ["current_experience", "current_skills", "timeline", "daily_availability", "learning_style"]
        return all(context.get(field) for field in required_fields)


class SkillGapAgent:
    """Analyzes skill gaps between current and target state."""
    
    def analyze_gap(self, current_skills: list[str], target_role: str, market_requirements: list[str]) -> list[dict]:
        """Analyze skill gap."""
        gaps = []
        skill_levels = {"python": "advanced", "ml": "intermediate", "docker": "beginner"}
        
        for skill in market_requirements:
            current_level = skill_levels.get(skill.lower(), "none")
            gap_size = self._calculate_gap(current_level)
            priority = self._calculate_priority(skill, market_requirements)
            
            gaps.append({
                "skill": skill,
                "current": current_level,
                "target": "advanced",
                "gap_size": gap_size,
                "priority": priority,
                "reason": f"{skill} is critical for {target_role} roles"
            })
        
        return sorted(gaps, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}[x["priority"]])
    
    def _calculate_gap(self, current_level: str) -> str:
        levels = {"none": "critical", "beginner": "large", "intermediate": "medium", "advanced": "small", "expert": "none"}
        return levels.get(current_level, "medium")
    
    def _calculate_priority(self, skill: str, market_requirements: list[str]) -> str:
        high_priority = {"llm", "rag", "agents", "ml", "deep learning"}
        if any(h in skill.lower() for h in high_priority):
            return "high"
        return "medium"


class RoadmapGenerationAgent:
    """Generates personalized learning roadmaps."""
    
    def generate_roadmap(self, goal: str, skill_gaps: list[dict], user_context: dict) -> list[dict]:
        """Generate roadmap phases."""
        phases = []
        available_time = user_context.get("daily_availability", 60)
        deadline_days = user_context.get("deadline_days", 180)
        
        if "AI Engineer" in goal or "AI" in goal:
            phases = [
                {"title": "Python Fundamentals", "duration": 14, "skills": ["Python", "Programming Basics"]},
                {"title": "Mathematics & Statistics", "duration": 21, "skills": ["Linear Algebra", "Statistics", "Probability"]},
                {"title": "Machine Learning", "duration": 28, "skills": ["ML Algorithms", "Scikit-learn", "Model Evaluation"]},
                {"title": "Deep Learning", "duration": 21, "skills": ["Neural Networks", "TensorFlow", "Keras"]},
                {"title": "NLP Fundamentals", "duration": 14, "skills": ["NLP Basics", "Text Processing", "NLTK"]},
                {"title": "Generative AI", "duration": 21, "skills": ["LLMs", "Transformers", "Fine-tuning"]},
                {"title": "RAG Systems", "duration": 14, "skills": ["Vector DBs", "Embeddings", "RAG Architecture"]},
                {"title": "AI Agents", "duration": 14, "skills": ["Agent Design", "LangChain", "Multi-agent Systems"]},
                {"title": "MLOps & Deployment", "duration": 14, "skills": ["Docker", "Kubernetes", "Model Serving"]},
                {"title": "Projects & Portfolio", "duration": 21, "skills": ["End-to-end Projects", "GitHub", "Documentation"]},
            ]
        
        return phases
    
    def adapt_roadmap(self, roadmap: list[dict], modifications: dict) -> list[dict]:
        """Adapt roadmap based on user feedback."""
        adapted = roadmap.copy()
        
        if modifications.get("remove_mathematics"):
            adapted = [p for p in adapted if "mathematics" not in p["title"].lower()]
        
        if modifications.get("add_focus_areas"):
            focus = modifications["add_focus_areas"]
            # Insert focus areas earlier or with higher priority
        
        return adapted


class LearningContentAgent:
    """Generates interactive learning content."""
    
    def generate_lesson(self, topic: str, skill_level: str, user_preferences: dict) -> dict:
        """Generate interactive lesson."""
        return {
            "title": f"{topic} for {skill_level.capitalize()}",
            "topic": topic,
            "difficulty": skill_level,
            "sections": [
                {"type": "introduction", "content": f"Understanding {topic}"},
                {"type": "why_matters", "content": f"Why {topic} matters in your career"},
                {"type": "simple_explanation", "content": f"Simple explanation of {topic}"},
                {"type": "analogy", "content": f"Real-world analogy for {topic}"},
                {"type": "concept_deep_dive", "content": f"Core concepts of {topic}"},
                {"type": "architecture_diagram", "content": f"Visual architecture of {topic}"},
                {"type": "practical_example", "content": f"Practical example of {topic}"},
                {"type": "code_example", "content": f"Code implementation of {topic}"},
                {"type": "interactive_question", "content": f"Test your understanding"},
                {"type": "mini_exercise", "content": f"Small practical challenge"},
                {"type": "common_mistakes", "content": f"Common mistakes and how to avoid them"},
                {"type": "real_applications", "content": f"Real-world applications of {topic}"},
                {"type": "summary", "content": f"Summary of key points"},
                {"type": "resources", "content": f"Additional learning resources"},
            ],
            "estimated_minutes": 45,
            "youtube_resources": [
                {"title": f"{topic} Explained", "channel": "Educational Channel", "duration_minutes": 15},
            ],
            "exercises": [
                {"type": "coding", "difficulty": skill_level, "task": f"Implement basic {topic}"},
            ]
        }


class AssessmentAgent:
    """Generates and evaluates assessments."""
    
    def generate_assessment(self, topic: str, difficulty: str) -> dict:
        """Generate assessment for a topic."""
        return {
            "topic": topic,
            "difficulty": difficulty,
            "passing_score": 70,
            "questions": [
                {
                    "id": "q1",
                    "type": "mcq",
                    "question": f"What is the primary purpose of {topic}?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct": "Option A",
                    "explanation": "Explanation here"
                }
            ]
        }
    
    def evaluate_assessment(self, submission: dict, assessment: dict) -> dict:
        """Evaluate assessment submission."""
        score = len([q for q in assessment["questions"] if submission.get(q["id"]) == q["correct"]]) / len(assessment["questions"]) * 100
        passed = score >= assessment["passing_score"]
        
        return {
            "score": int(score),
            "passed": passed,
            "strengths": ["Strong understanding of core concepts"],
            "weaknesses": ["Needs practice with implementation"],
            "feedback": "Good effort! Focus on the weak areas."
        }


class MemoryAgent:
    """Extracts and manages user memories."""
    
    def extract_memory(self, interaction: str, context: dict) -> list[dict]:
        """Extract structured memories from interaction."""
        memories = []
        
        if "prefer" in interaction.lower() or "like" in interaction.lower():
            memories.append({
                "type": "preference",
                "key": "learning_style",
                "value": "inferred from interaction",
                "importance": "high",
                "confidence": 0.7
            })
        
        if "skill" in interaction.lower() or "know" in interaction.lower():
            memories.append({
                "type": "skill",
                "key": "current_skills",
                "value": "inferred from interaction",
                "importance": "high",
                "confidence": 0.8
            })
        
        return memories


class RecommendationAgent:
    """Generates personalized recommendations."""
    
    def generate_recommendations(self, user_state: dict, market_data: dict) -> list[dict]:
        """Generate personalized recommendations."""
        recommendations = []
        
        goal = user_state.get("goal", {})
        current_progress = user_state.get("progress", 0)
        skill_gaps = user_state.get("skill_gaps", [])
        
        # Recommend critical skills
        for gap in skill_gaps:
            if gap.get("priority") == "critical":
                recommendations.append({
                    "type": "learn",
                    "title": f"Learn {gap['skill']}",
                    "reason": f"This skill is critical for your target role and you have a significant gap",
                    "action": f"Start with the {gap['skill']} learning module",
                    "priority": "critical",
                    "relevance_score": 0.95
                })
        
        # Recommend projects
        if current_progress > 30:
            recommendations.append({
                "type": "project",
                "title": "Build a practical AI project",
                "reason": "You've covered fundamentals, now apply them",
                "action": "Start with a guided project from your roadmap",
                "priority": "high",
                "relevance_score": 0.85
            })
        
        return recommendations


class CareerIntelligenceAgent:
    """Researches and analyzes career/market data."""
    
    def analyze_market(self, profession: str, target_role: str) -> dict:
        """Analyze current market requirements."""
        return {
            "profession": profession,
            "target_role": target_role,
            "emerging_skills": ["LLMs", "RAG", "AI Agents"],
            "declining_skills": ["Traditional ML only"],
            "high_demand": ["Full-stack AI", "MLOps"],
            "salary_trends": "Growing",
            "market_analysis": "Strong demand for AI engineers with hands-on experience"
        }


# Registry of all agents
AGENTS: dict[str, Callable[[dict], Any]] = {
    "goal_discussion": GoalDiscussionAgent().generate_next_question,
    "skill_gap": SkillGapAgent().analyze_gap,
    "roadmap": RoadmapGenerationAgent().generate_roadmap,
    "learning": LearningContentAgent().generate_lesson,
    "assessment": AssessmentAgent().generate_assessment,
    "memory": MemoryAgent().extract_memory,
    "recommendation": RecommendationAgent().generate_recommendations,
    "career_intelligence": CareerIntelligenceAgent().analyze_market,
}
