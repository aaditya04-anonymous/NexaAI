"""NexaAI Streamlit workspace.

The UI deliberately mirrors the backend's connected career loop rather than
presenting a collection of disconnected CRUD screens.
"""

from __future__ import annotations

import os
from datetime import date, datetime, time
from typing import Any

import pandas as pd
import requests
import streamlit as st


API_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/") + "/api"

st.set_page_config(
    page_title="NexaAI | Personal Growth OS",
    page_icon="✦",
    layout="wide",
    initial_sidebar_state="expanded",
)


def inject_styles() -> None:
    theme = st.session_state.get("theme_mode", "system")
    dark_override = """
        .stApp { background:linear-gradient(135deg,#0e1322 0%,#121a2c 100%); color:#e9edff; }
        [data-testid="stSidebar"] { background:#090d18; }
        .card,.metric-card,div[data-testid="stMetric"],.stExpander { background:#171f33; border-color:#2d3851; color:#e9edff; }
        .muted,.stCaption,p.stCaption { color:#aab5cf !important; }
        .stTextInput input,.stTextArea textarea,.stNumberInput input,.stSelectbox [data-baseweb="select"] > div,
        .stDateInput input,.stTimeInput input { background:#11192a !important; color:#eef2ff !important; border-color:#3b4965 !important; }
        .stButton > button { background:#1b263d; color:#edf1ff; border-color:#3b4965; }
        .stProgress > div > div { background:#2b3852; }
        .stMarkdown, [data-testid="stMarkdownContainer"] { color:#e9edff; }
        .tag { background:#302b63; color:#d8d2ff; } .success-tag { background:#123e3a; color:#8de8d9; } .warning-tag { background:#4a3817; color:#ffd889; }
    """
    system_dark = dark_override if theme == "dark" else (f"@media (prefers-color-scheme: dark) {{{dark_override}}}" if theme == "system" else "")
    st.markdown(
        f"""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        :root {{ --ink:#172033; --muted:#6d7890; --violet:#7657f6; --teal:#11b8a5; --surface:#ffffff; --line:#e5e8f1; --soft:#f7f8fc; }}
        html, body, [class*="css"] {{ font-family:"DM Sans",sans-serif; color:var(--ink); }}
        .stApp {{ background:linear-gradient(135deg,#f8f9ff 0%,#f5fbfa 100%); }}
        .block-container {{ max-width:1440px; padding:clamp(1rem,3vw,2.5rem) clamp(1rem,4vw,3rem) 4rem; }}
        h1,h2,h3,h4 {{ font-family:"Space Grotesk",sans-serif; letter-spacing:-.03em; }}
        h1 {{ font-size:clamp(1.8rem,4vw,2.4rem) !important; }} h2 {{ font-size:clamp(1.35rem,3vw,1.65rem) !important; }}
        [data-testid="stSidebar"] {{ background:#13182b; border-right:0; }}
        [data-testid="stSidebar"] > div:first-child {{ padding-top:1.5rem; }}
        [data-testid="stSidebar"] * {{ color:#eef0ff; }}
        [data-testid="stSidebar"] .stButton > button {{ width:100%; justify-content:flex-start; text-align:left; background:transparent; color:#dbe2ff; border-color:transparent; }}
        [data-testid="stSidebar"] .stButton > button:hover {{ background:#242d4b; border-color:#3c4a70; }}
        .hero {{ padding:clamp(1.3rem,4vw,2.2rem); border-radius:26px; color:white; background:linear-gradient(115deg,#5d4bec,#8671ff 55%,#25bdb0); box-shadow:0 18px 50px #7161e52b; margin-bottom:1.25rem; }}
        .hero h1 {{ margin:0 0 .35rem; color:white; }} .hero p {{ color:#f2f2ff; margin:0; font-size:1.05rem; }}
        .eyebrow {{ text-transform:uppercase; letter-spacing:.14em; font-weight:700; font-size:.72rem; color:#7160ed; margin-bottom:.4rem; }}
        .hero .eyebrow {{ color:#c8c1ff; }}
        .card {{ background:rgba(255,255,255,.9); border:1px solid var(--line); border-radius:18px; padding:1.2rem 1.3rem; box-shadow:0 8px 24px #3037650b; height:100%; }}
        .metric-card {{ background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:1rem 1.15rem; }}
        .metric-label {{ color:var(--muted); font-size:.78rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; }}
        .metric-value {{ font-family:"Space Grotesk"; font-size:1.65rem; font-weight:700; margin-top:.25rem; }}
        .muted {{ color:var(--muted); }} .tag {{ display:inline-block; border-radius:999px; padding:.25rem .65rem; background:#eeecff; color:#5c46d4; font-size:.75rem; font-weight:700; }}
        .success-tag {{ background:#e2faf4; color:#087e70; }} .warning-tag {{ background:#fff3d9; color:#9a6500; }}
        .stButton > button {{ border-radius:11px; border:1px solid #dedff0; font-weight:600; min-height:2.5rem; transition:all .15s ease; }}
        .stButton > button:hover {{ transform:translateY(-1px); box-shadow:0 5px 16px #35406b18; }}
        .stButton > button[kind="primary"] {{ background:linear-gradient(100deg,#6c55ed,#8978ff); border:0; color:white; }}
        div[data-testid="stMetric"] {{ background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:1rem; }}
        .stProgress > div > div {{ border-radius:999px; }}
        .small {{ font-size:.85rem; }} .spacer {{ height:.5rem; }}
        {system_dark}
        @media (max-width: 800px) {{
            .block-container {{ padding:1rem .85rem 3rem; }}
            .hero {{ border-radius:18px; }}
            [data-testid="stSidebar"] {{ min-width:250px; max-width:250px; }}
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def init_state() -> None:
    for key, value in {
        "token": None,
        "page": "Overview",
        "chat_messages": [],
        "conversation_id": None,
        "last_error": None,
        "theme_mode": "system",
    }.items():
        st.session_state.setdefault(key, value)


def api(method: str, path: str, **kwargs: Any) -> Any:
    headers = dict(kwargs.pop("headers", {}))
    token = st.session_state.get("token")
    if token:
        headers["Authorization"] = "Bearer " + token
        headers["Authorization"] = f"Bearer {token}"
    try:
        if token:
            headers["Authorization"] = "Bearer " + token
        response = requests.request(
            method,
            f"{API_URL}{path}",
            headers=headers,
            timeout=120,
            **kwargs,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Could not reach NexaAI API at {API_URL}: {exc}") from exc
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail", response.text)
        except ValueError:
            detail = response.text
        raise RuntimeError(f"{response.status_code}: {detail or 'Request failed'}")
    if not response.content:
        return None
    try:
        return response.json()
    except ValueError:
        return response.text


def safe_call(method: str, path: str, **kwargs: Any) -> tuple[Any, str | None]:
    try:
        return api(method, path, **kwargs), None
    except RuntimeError as exc:
        return None, str(exc)


def rerun() -> None:
    st.rerun()


def fmt_date(value: Any) -> str:
    if not value:
        return "Not set"
    return str(value)[:10]


def option_text(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    return str(value or "")


def jsonable(value: Any) -> Any:
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    return value


def show_error(error: str | None) -> None:
    if error:
        st.error(error)


def metric_card(label: str, value: str, hint: str = "") -> None:
    st.markdown(
        f'<div class="metric-card"><div class="metric-label">{label}</div>'
        f'<div class="metric-value">{value}</div><div class="muted small">{hint}</div></div>',
        unsafe_allow_html=True,
    )


def card(title: str, body: str, tag: str = "") -> None:
    tag_html = f'<span class="tag">{tag}</span>' if tag else ""
    st.markdown(
        f'<div class="card"><div style="display:flex;justify-content:space-between;gap:1rem">'
        f'<h3 style="margin:0 0 .55rem">{title}</h3>{tag_html}</div>{body}</div>',
        unsafe_allow_html=True,
    )


def page_header(kicker: str, title: str, subtitle: str) -> None:
    st.markdown(
        f'<div class="eyebrow">{kicker}</div><h1 style="margin-bottom:.2rem">{title}</h1>'
        f'<p class="muted" style="font-size:1.05rem;margin-top:0">{subtitle}</p>',
        unsafe_allow_html=True,
    )


def auth_page() -> None:
    appearance = st.sidebar.selectbox(
        "Appearance",
        ["system", "light", "dark"],
        index=["system", "light", "dark"].index(st.session_state.theme_mode),
        format_func=lambda value: {"system": "System default", "light": "Light mode", "dark": "Dark mode"}[value],
    )
    if appearance != st.session_state.theme_mode:
        st.session_state.theme_mode = appearance
        rerun()
    st.markdown(
        '<div class="hero"><div class="eyebrow">Personal growth operating system</div>'
        '<h1>Build a career you can prove.</h1><p>NexaAI connects your ambitions, learning, evidence, and next best action in one calm workspace.</p></div>',
        unsafe_allow_html=True,
    )
    left, right = st.columns([1.15, 1])
    with left:
        st.markdown("### Your private AI growth companion")
        st.markdown(
            "Set a meaningful direction, turn it into an editable roadmap, learn in focused sessions, "
            "and keep a living record of the evidence you are building."
        )
        for title, text in [
            ("Goal-first", "A conversation turns vague ambition into a concrete path."),
            ("Evidence-aware", "Progress is based on tasks, assessments, projects, and reflections."),
            ("Personal", "Your profile, memories, documents, and career context stay user-scoped."),
        ]:
            st.markdown(f"**{title}**  \n<span class='muted'>{text}</span>", unsafe_allow_html=True)
    with right:
        login, register = st.tabs(["Sign in", "Create account"])
        with login:
            with st.form("login_form"):
                email = st.text_input("Email", placeholder="you@example.com")
                password = st.text_input("Password", type="password")
                if st.form_submit_button("Enter workspace", type="primary", use_container_width=True):
                    value, error = safe_call("POST", "/auth/login", json={"email": email, "password": password})
                    if error:
                        show_error(error)
                    else:
                        st.session_state.token = value["access_token"]
                        rerun()
            with st.expander("Forgot your password?"):
                with st.form("forgot_form"):
                    email = st.text_input("Account email", key="forgot_email")
                    if st.form_submit_button("Request reset email"):
                        _, error = safe_call("POST", "/auth/forgot-password", json={"email": email})
                        st.success("If the account exists, a reset email will be sent.") if not error else show_error(error)
        with register:
            with st.form("register_form"):
                email = st.text_input("Email", key="register_email", placeholder="you@example.com")
                password = st.text_input("Password (12+ characters)", type="password", key="register_password")
                if st.form_submit_button("Create my NexaAI workspace", type="primary", use_container_width=True):
                    value, error = safe_call("POST", "/auth/register", json={"email": email, "password": password})
                    if error:
                        show_error(error)
                    else:
                        st.session_state.token = value["access_token"]
                        rerun()


def sidebar() -> str:
    st.sidebar.markdown("## ✦ NexaAI")
    st.sidebar.caption("Personal growth, made actionable.")
    theme_mode = st.sidebar.selectbox(
        "Appearance",
        ["system", "light", "dark"],
        index=["system", "light", "dark"].index(st.session_state.theme_mode),
        format_func=lambda value: {"system": "System default", "light": "Light mode", "dark": "Dark mode"}[value],
    )
    if theme_mode != st.session_state.theme_mode:
        st.session_state.theme_mode = theme_mode
        rerun()
    st.sidebar.caption("Choose the interface contrast that works best in your browser.")
    pages = {
        "Command center": ["Overview", "Goal studio", "Roadmap", "Daily plan"],
        "Build capability": ["Learning lab", "Assessments", "Projects", "Career intelligence"],
        "Understand yourself": ["Progress & reports", "Recommendations", "Memories", "Documents", "Automations"],
        "Workspace": ["Nexa chat", "Conversations", "Notifications", "Profile & account"],
    }
    current = st.session_state.page
    for group, items in pages.items():
        st.sidebar.caption(group.upper())
        for item in items:
            if st.sidebar.button(item, key=f"nav_{item}", use_container_width=True):
                st.session_state.page = item
                rerun()
    st.sidebar.divider()
    health, error = safe_call("GET", "/health")
    st.sidebar.markdown(
        f"<span class='tag {'success-tag' if not error else 'warning-tag'}'>"
        f"{'API connected' if not error else 'API offline'}</span>",
        unsafe_allow_html=True,
    )
    if st.sidebar.button("Sign out", use_container_width=True):
        st.session_state.clear()
        rerun()
    return current


def overview() -> None:
    page_header("Command center", "Good to see you.", "Your direction, today's focus, and the evidence behind your momentum.")
    data, error = safe_call("GET", "/dashboard")
    if error:
        show_error(error)
        return
    snapshot, today, progress = data.get("career_snapshot", {}), data.get("today", {}), data.get("progress", {})
    goal = snapshot.get("goal") or {}
    st.markdown(
        f'<div class="hero"><div class="eyebrow">Your north star</div>'
        f'<h1>{goal.get("title") or "Choose a direction worth pursuing"}</h1>'
        f'<p>{goal.get("target_role") or snapshot.get("target_profession") or "Start in Goal studio to define your next chapter."}</p></div>',
        unsafe_allow_html=True,
    )
    cols = st.columns(4)
    with cols[0]: metric_card("Goal progress", f"{snapshot.get('progress', 0)}%", "Roadmap evidence")
    with cols[1]: metric_card("Today", str(len(today.get("tasks", []))), "Planned actions")
    with cols[2]: metric_card("Task completion", f"{progress.get('task_completion_rate', 0)}%", "Across your plan")
    with cols[3]: metric_card("Roadmap", f"{progress.get('roadmap_progress', 0)}%", "Phases completed")
    st.write("")
    left, right = st.columns([1.35, .85])
    with left:
        st.markdown("### Today's connected plan")
        tasks = today.get("tasks", [])
        if not tasks:
            st.info("Finalize a roadmap, then generate a daily plan for a focused next step.")
        for task in tasks:
            with st.container(border=True):
                st.markdown(f"**{task.get('title', 'Untitled task')}**")
                st.caption(f"{task.get('task_type', 'activity').title()} · {task.get('estimated_minutes', 0)} minutes")
                st.progress(min(100, int(task.get("completion_percentage", 0))) / 100)
    with right:
        st.markdown("### Nexa insight")
        st.info(data.get("ai_insight", "Complete a few actions and Nexa will surface a useful pattern."))
        phase = snapshot.get("current_phase") or {}
        card("Current phase", f"<p>{phase.get('title', 'Not started')}</p><p class='muted'>{phase.get('description', 'Your next phase will appear after roadmap generation.')}</p>", phase.get("status", "waiting").replace("_", " "))
    st.markdown("### Quick actions")
    actions = st.columns(4)
    for column, label, target in zip(actions, ["Define a goal", "Plan today", "Learn a topic", "Ask Nexa"], ["Goal studio", "Daily plan", "Learning lab", "Nexa chat"]):
        with column:
            if st.button(label, use_container_width=True):
                st.session_state.page = target
                rerun()


def goal_studio() -> None:
    page_header("Direction", "Goal studio", "Turn an ambition into a goal, discuss it with Nexa, and generate a roadmap you can edit.")
    goals, error = safe_call("GET", "/goals")
    show_error(error)
    goals = goals or []
    left, right = st.columns([.8, 1.2])
    with left:
        st.markdown("### Create a goal")
        with st.form("goal_create"):
            title = st.text_input("Goal title", placeholder="Become a product-minded ML engineer")
            target_role = st.text_input("Target role")
            description = st.text_area("What does success look like?", height=110)
            deadline = st.date_input("Target date", value=None)
            daily_minutes = st.number_input("Daily minutes", min_value=15, max_value=720, value=60, step=15)
            technologies = st.text_input("Technologies to include", placeholder="Python, SQL, PyTorch")
            if st.form_submit_button("Create goal", type="primary", use_container_width=True):
                payload = {"title": title, "target_role": target_role or None, "description": description or None, "daily_minutes": daily_minutes, "preferred_technologies": [x.strip() for x in technologies.split(",") if x.strip()]}
                if deadline: payload["deadline"] = deadline.isoformat()
                _, error = safe_call("POST", "/goals", json=payload)
                if error: show_error(error)
                else: st.success("Goal created. Select it below to begin discovery."); rerun()
        if goals:
            selected = st.selectbox("Active goal", goals, format_func=lambda item: item.get("title", "Untitled"), key="selected_goal")
        else:
            selected = None
            st.info("Create your first goal to unlock discovery and roadmap planning.")
    with right:
        if not selected:
            return
        goal_id = selected["id"]
        st.markdown(f"### {selected.get('title', 'Goal')}")
        st.caption(f"{selected.get('status', 'discovery').title()} · {selected.get('target_role') or 'Role not specified'}")
        with st.form(f"goal_edit_{goal_id}"):
            new_title = st.text_input("Title", value=selected.get("title", ""))
            new_description = st.text_area("Description", value=selected.get("description", "") or "")
            new_role = st.text_input("Target role", value=selected.get("target_role", "") or "")
            if st.form_submit_button("Save goal details"):
                _, error = safe_call("PUT", f"/goals/{goal_id}", json={"title": new_title, "description": new_description, "target_role": new_role})
                if error: show_error(error)
                else: st.success("Goal updated."); rerun()
        st.markdown("#### Discovery conversation")
        with st.form(f"discussion_{goal_id}", clear_on_submit=True):
            message = st.text_area("Tell Nexa more about this direction", placeholder="Why does this matter to you right now?", height=90)
            if st.form_submit_button("Continue discovery", type="primary"):
                reply, error = safe_call("POST", f"/goals/{goal_id}/discuss", json={"message": message})
                if error: show_error(error)
                else:
                    st.success(reply.get("reply", "Thanks — keep going."))
                    if reply.get("ready_for_draft"): st.info("You have shared enough for a first roadmap draft.")
        details, error = safe_call("GET", f"/goals/{goal_id}")
        if not error and details:
            roadmap = details.get("roadmap")
            if roadmap:
                st.markdown("#### Current roadmap")
                for phase in roadmap.get("phases", []):
                    st.markdown(f"**{phase.get('order', '')}. {phase.get('title', '')}** · {phase.get('status', 'not started').replace('_', ' ').title()}")
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Generate roadmap draft", type="primary", use_container_width=True):
                _, error = safe_call("POST", f"/goals/{goal_id}/roadmap/generate")
                if error: show_error(error)
                else: st.success("Roadmap draft generated."); rerun()
        with c2:
            if selected.get("roadmap_status") == "finalized":
                st.success("Roadmap finalized")


def roadmap_page() -> None:
    page_header("Plan", "Roadmap workshop", "Review phases, adjust the plan, and explicitly finalize the path before daily tasks begin.")
    goals, error = safe_call("GET", "/goals")
    show_error(error)
    goals = goals or []
    if not goals:
        st.info("Create a goal in Goal studio first.")
        return
    goal = st.selectbox("Goal", goals, format_func=lambda item: item.get("title", "Untitled"), key="roadmap_goal")
    details, error = safe_call("GET", f"/goals/{goal['id']}")
    show_error(error)
    roadmap = (details or {}).get("roadmap")
    if not roadmap:
        st.warning("This goal has no roadmap yet.")
        if st.button("Generate roadmap draft", type="primary"):
            _, error = safe_call("POST", f"/goals/{goal['id']}/roadmap/generate")
            show_error(error)
            if not error: rerun()
        return
    phases = roadmap.get("phases", [])
    st.caption(f"Status: {roadmap.get('status', 'draft').title()} · {len(phases)} phases")
    phase_inputs = []
    for index, phase in enumerate(phases):
        with st.expander(f"{index + 1}. {phase.get('title', 'Phase')} · {phase.get('status', 'not_started').replace('_', ' ').title()}", expanded=index == 0):
            title = st.text_input("Phase title", phase.get("title", ""), key=f"phase_title_{index}")
            description = st.text_area("Description", phase.get("description", "") or "", key=f"phase_desc_{index}")
            skills = st.text_input("Skills", option_text(phase.get("skills", [])), key=f"phase_skills_{index}")
            minutes = st.number_input("Estimated minutes", min_value=15, value=int(phase.get("estimated_minutes", 300)), step=15, key=f"phase_minutes_{index}")
            priority = st.selectbox("Priority", ["low", "medium", "high"], index=["low", "medium", "high"].index(phase.get("priority", "medium")) if phase.get("priority", "medium") in ["low", "medium", "high"] else 1, key=f"phase_priority_{index}")
            phase_inputs.append({"title": title, "description": description, "skills": [x.strip() for x in skills.split(",") if x.strip()], "estimated_minutes": minutes, "priority": priority})
    c1, c2 = st.columns(2)
    with c1:
        if st.button("Save roadmap edits", type="primary", use_container_width=True):
            _, error = safe_call("PUT", f"/roadmaps/{roadmap['id']}", json={"phases": phase_inputs, "status": "draft"})
            show_error(error)
            if not error: st.success("Roadmap updated."); rerun()
    with c2:
        if st.button("Finalize roadmap", use_container_width=True):
            _, error = safe_call("POST", f"/roadmaps/{roadmap['id']}/finalize")
            show_error(error)
            if not error: st.success("Roadmap finalized. Daily planning is now unlocked."); rerun()


def daily_plan() -> None:
    page_header("Today", "Daily plan", "Generate a realistic set of actions from your current roadmap and leave evidence as you go.")
    tasks, error = safe_call("GET", "/tasks/today")
    show_error(error)
    tasks = tasks or []
    if st.button("Generate today's plan", type="primary"):
        value, error = safe_call("POST", "/tasks/generate-daily")
        if error: show_error(error)
        else: st.success(f"{len(value or [])} actions added to your plan."); rerun()
    if not tasks:
        st.info("No actions planned yet. Finalize a roadmap and generate today's plan.")
        return
    for task in tasks:
        with st.container(border=True):
            top = st.columns([4, 1, 1])
            with top[0]:
                st.markdown(f"### {task.get('title', 'Untitled task')}")
                st.caption(f"{task.get('task_type', 'activity').title()} · {task.get('estimated_minutes', 0)} min · {task.get('status', 'planned').replace('_', ' ').title()}")
            with top[1]:
                st.metric("Progress", f"{task.get('completion_percentage', 0)}%")
            with top[2]:
                if st.button("Learn", key=f"learn_task_{task['id']}"):
                    st.session_state.page = "Learning lab"
                    st.session_state.learning_task_id = task["id"]
                    rerun()
            if task.get("description"): st.write(task["description"])
            with st.form(f"complete_task_{task['id']}"):
                pct = st.slider("Completion", 0, 100, int(task.get("completion_percentage", 0)), key=f"pct_{task['id']}")
                reflection = st.text_input("Reflection / evidence", key=f"reflection_{task['id']}", placeholder="What did you learn or produce?")
                if st.form_submit_button("Save progress"):
                    _, error = safe_call("POST", f"/tasks/{task['id']}/complete", json={"completion_percentage": pct, "reflection": reflection or None})
                    show_error(error)
                    if not error: st.success("Progress saved."); rerun()


def learning_lab() -> None:
    page_header("Capability", "Learning lab", "Study one focused topic, ask contextual questions, and check your understanding.")
    tasks, error = safe_call("GET", "/tasks/today")
    show_error(error)
    tasks = tasks or []
    lessons, error = safe_call("GET", "/learning/today")
    show_error(error)
    lessons = lessons or []
    if tasks:
        st.markdown("### Generate from a task")
        task = st.selectbox("Choose a task", tasks, format_func=lambda x: x.get("title", "Task"), key="learning_task")
        if st.button("Generate interactive lesson", type="primary"):
            value, error = safe_call("POST", f"/learning/generate/{task['id']}")
            show_error(error)
            if not error: st.success("Lesson ready."); rerun()
    if not lessons:
        st.info("No learning content for today's tasks yet.")
        return
    lesson = st.selectbox("Open lesson", lessons, format_func=lambda x: x.get("title", "Lesson"), key="selected_lesson")
    details, error = safe_call("GET", f"/learning/{lesson['id']}")
    show_error(error)
    details = details or lesson
    st.markdown(f"## {details.get('title', details.get('topic', 'Lesson'))}")
    st.caption(f"{details.get('topic', '')} · {details.get('difficulty', 'foundation').title()} · {details.get('estimated_minutes', '—')} minutes")
    for section in details.get("sections", []):
        with st.container(border=True):
            st.markdown(f"### {section.get('heading', section.get('title', section.get('type', 'Concept').title()))}")
            if section.get("content"): st.write(section["content"])
            if section.get("nodes"): st.write(" → ".join(section["nodes"]))
    if details.get("code_examples"):
        st.markdown("### Code examples")
        for example in details["code_examples"]: st.code(example)
    c1, c2, c3 = st.columns(3)
    with c1:
        if st.button("Mark lesson complete", use_container_width=True):
            _, error = safe_call("POST", f"/learning/{details['id']}/complete")
            show_error(error)
            if not error: st.success("Lesson completed.")
    with c2:
        if st.button("Create assessment", type="primary", use_container_width=True):
            value, error = safe_call("POST", f"/learning/{details['id']}/assessment")
            show_error(error)
            if not error:
                st.session_state.assessment_id = value["id"]
                st.session_state.page = "Assessments"
                rerun()
    with c3:
        if st.button("Ask about this lesson", use_container_width=True):
            st.session_state.chat_context = {"context_type": "learning", "context_id": details["id"], "title": details.get("topic", "lesson")}
            st.session_state.page = "Nexa chat"
            rerun()
    st.markdown("### Contextual Q&A")
    with st.form("lesson_question"):
        question = st.text_input("Ask a question about this lesson")
        if st.form_submit_button("Get explanation"):
            value, error = safe_call(
                "POST",
                f"/learning/{details['id']}/chat",
                json={"message": question, "context_type": "learning", "context_id": details["id"]},
            )
            show_error(error)
            if not error: st.info(value.get("answer", value.get("message", "No answer returned.")))


def assessments() -> None:
    page_header("Check understanding", "Assessments", "Turn learning into feedback, then use the result to choose your next action.")
    assessment_id = st.session_state.get("assessment_id")
    if not assessment_id:
        st.info("Create an assessment from a lesson in Learning lab.")
        return
    assessment, error = safe_call("GET", f"/assessments/{assessment_id}")
    show_error(error)
    if not assessment: return
    st.markdown(f"## {assessment.get('title', 'Assessment')}")
    st.caption(f"{assessment.get('difficulty', 'foundation').title()} · {len(assessment.get('questions', []))} prompts")
    answers = {}
    with st.form("assessment_form"):
        for index, question in enumerate(assessment.get("questions", []), 1):
            prompt = question.get("prompt", question.get("question", f"Question {index}"))
            answers[question.get("id", str(index))] = st.text_area(f"{index}. {prompt}", key=f"answer_{question.get('id', index)}")
        if st.form_submit_button("Submit for feedback", type="primary", use_container_width=True):
            value, error = safe_call("POST", f"/assessments/{assessment_id}/submit", json={"answers": answers})
            show_error(error)
            if not error:
                st.session_state.assessment_result = value
                rerun()
    result = st.session_state.get("assessment_result")
    if st.button("Load latest submitted result"):
        value, error = safe_call("GET", f"/assessments/{assessment_id}/results")
        show_error(error)
        if not error:
            st.session_state.assessment_result = value
            rerun()
    if result:
        st.markdown("### Latest result")
        cols = st.columns(3)
        with cols[0]: metric_card("Score", f"{result.get('score', 0)}%", result.get("outcome", "review").title())
        with cols[1]: metric_card("Outcome", result.get("outcome", "review").title(), "Adaptive next step")
        with cols[2]: metric_card("Next level", result.get("difficulty_next", "foundation").title(), "Suggested difficulty")
        st.info(result.get("next_action", "Review the feedback and continue."))


def career_intelligence() -> None:
    page_header("Market signal", "Career intelligence", "Bring verified, current career research into your roadmap — without pretending when sources are unavailable.")
    if st.button("Generate verified career update", type="primary"):
        value, error = safe_call("POST", "/news/generate")
        show_error(error)
        if not error:
            st.session_state.news = value
            st.success("Career intelligence refreshed.")
    news = st.session_state.get("news")
    if not news:
        news, error = safe_call("GET", "/news/today")
        show_error(error)
    if not news: return
    if news.get("status") == "unavailable":
        st.warning(news.get("reason", "No verified update is available yet."))
        return
    st.markdown(f"## {news.get('title', 'Career update')}")
    st.caption(f"Search query: {news.get('query', 'Personalized career research')}")
    items = news.get("items", news.get("news_items", []))
    if not items:
        st.info("No articles were returned by the configured search provider.")
    for item in items:
        with st.container(border=True):
            st.markdown(f"### {item.get('title', 'Untitled source')}")
            st.write(item.get("summary", item.get("content", "")))
            if item.get("source_url"): st.link_button("Open source", item["source_url"])
            article_id = item.get("id") or news.get("id")
            if article_id:
                c1, c2 = st.columns(2)
                with c1:
                    if st.button("Discuss this signal", key=f"news_chat_{article_id}"):
                        st.session_state.chat_context = {"context_type": "news", "context_id": article_id, "title": item.get("title", "career signal")}
                        st.session_state.page = "Nexa chat"
                        rerun()
                with c2:
                    if st.button("Add to roadmap", key=f"news_roadmap_{article_id}"):
                        value, error = safe_call("POST", f"/career/news/{article_id}/add-to-roadmap")
                        show_error(error)
                        if not error: st.success(value.get("message", "Added to roadmap."))
                with st.expander("Ask about this source"):
                    with st.form(f"news_question_{article_id}"):
                        question = st.text_input("Your question", key=f"news_question_input_{article_id}")
                        if st.form_submit_button("Ask in article context"):
                            value, error = safe_call(
                                "POST",
                                f"/news/{article_id}/chat",
                                json={"message": question, "context_type": "news", "context_id": article_id},
                            )
                            show_error(error)
                            if not error:
                                st.info(value.get("message", value.get("answer", "No answer returned.")))


def recommendations() -> None:
    page_header("Next best action", "Recommendations", "Nexa combines your goals, progress, memories, and assessments into practical suggestions.")
    if st.button("Generate recommendation", type="primary"):
        value, error = safe_call("POST", "/recommendations/generate")
        show_error(error)
        if not error: st.success("New recommendation created."); rerun()
    values, error = safe_call("GET", "/recommendations")
    show_error(error)
    for item in values or []:
        with st.container(border=True):
            cols = st.columns([4, 1])
            with cols[0]:
                st.markdown(f"### {item.get('title', 'Recommendation')}")
                st.write(item.get("description", item.get("why", "")))
                st.caption(item.get("reason", item.get("how", item.get("expected_benefit", ""))))
            with cols[1]:
                st.markdown(f"<span class='tag'>{item.get('priority', item.get('kind', 'action')).title()}</span>", unsafe_allow_html=True)
                rid = item.get("id")
                if rid:
                    for label, action in [("Accept", "accept"), ("Complete", "complete"), ("Dismiss", "reject")]:
                        if st.button(label, key=f"rec_{action}_{rid}", use_container_width=True):
                            _, error = safe_call("POST", f"/recommendations/{rid}/{action}")
                            show_error(error)
                            if not error: rerun()


def projects() -> None:
    page_header("Proof of work", "Projects", "Create portfolio-sized evidence that turns a skill into something you can show.")
    with st.expander("Plan a new project", expanded=True):
        with st.form("project_form"):
            title = st.text_input("Project title", placeholder="Build a retrieval-augmented career coach")
            objective = st.text_area("Objective")
            skills = st.text_input("Required skills", placeholder="Python, APIs, evaluation")
            technologies = st.text_input("Technologies", placeholder="FastAPI, MongoDB, Streamlit")
            difficulty = st.selectbox("Difficulty", ["foundation", "intermediate", "advanced"])
            minutes = st.number_input("Estimated minutes", min_value=30, value=600, step=30)
            if st.form_submit_button("Create project", type="primary"):
                value, error = safe_call("POST", "/projects", json={"title": title, "objective": objective, "required_skills": [x.strip() for x in skills.split(",") if x.strip()], "technologies": [x.strip() for x in technologies.split(",") if x.strip()], "difficulty": difficulty, "estimated_minutes": minutes})
                show_error(error)
                if not error: st.success(f"Created {value.get('title', 'project')}."); rerun()
    values, error = safe_call("GET", "/projects")
    show_error(error)
    for item in values or []:
        with st.container(border=True):
            st.markdown(f"### {item.get('title', 'Project')}")
            st.write(item.get("objective", ""))
            st.caption(f"{item.get('difficulty', 'foundation').title()} · {item.get('estimated_minutes', 0)} minutes · {item.get('status', 'planned').title()}")
            milestones = item.get("milestones", [])
            if milestones:
                st.progress(sum(m.get("status") == "completed" for m in milestones) / len(milestones))
                st.write(" · ".join(f"{'✓' if m.get('status') == 'completed' else '○'} {m.get('title', '')}" for m in milestones))


def progress_page() -> None:
    page_header("Evidence", "Progress & reports", "See the trajectory behind the feeling: tasks, roadmap phases, skills, history, and weekly reflection.")
    progress, error = safe_call("GET", "/progress")
    show_error(error)
    progress = progress or {}
    cols = st.columns(4)
    for column, label, key in zip(cols, ["Goal", "Tasks", "Roadmap", "Assessments"], ["goal_progress", "task_completion_rate", "roadmap_progress", "assessment_average"]):
        with column: metric_card(label, f"{progress.get(key, 0)}%" if progress.get(key) is not None else "—", "Current signal")
    st.markdown("### Skill breakdown")
    skills, error = safe_call("GET", "/progress/skills")
    show_error(error)
    if skills:
        rows = [{"Skill": key, "Progress": value} for key, value in skills.items()]
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    weekly, error = safe_call("GET", "/reports/weekly")
    show_error(error)
    if weekly:
        st.markdown("### Weekly reflection")
        card(weekly.get("title", "Weekly report"), f"<p>{weekly.get('summary', '')}</p><p class='muted'>Assessment average: {weekly.get('assessment_average', '—')}</p>")
    with st.expander("Raw activity history"):
        history, error = safe_call("GET", "/history")
        show_error(error)
        if history:
            for category, records in history.items():
                st.markdown(f"**{category.replace('_', ' ').title()}** · {len(records)} events")
                if records: st.dataframe(pd.DataFrame(records), use_container_width=True, hide_index=True)


def memories() -> None:
    page_header("Personal context", "Memory vault", "Choose what Nexa should remember, inspect the source, and remove anything that no longer represents you.")
    with st.expander("Capture a memory from text", expanded=True):
        with st.form("memory_extract"):
            content = st.text_area("What should Nexa remember?", placeholder="I prefer short morning sessions and learn best by building.")
            category = st.selectbox("Category", ["preference", "career", "skill", "goal", "learning", "strength", "weakness", "behavior", "project", "decision", "recommendation"])
            if st.form_submit_button("Extract and save", type="primary"):
                value, error = safe_call("POST", "/memories/extract", json={"content": content, "category": category})
                show_error(error)
                if not error: st.success(f"Saved {len(value or [])} memory signal(s)."); rerun()
    values, error = safe_call("GET", "/memories")
    show_error(error)
    for item in values or []:
        with st.container(border=True):
            cols = st.columns([4, 1, 1])
            with cols[0]:
                st.markdown(f"**{item.get('category', item.get('type', 'memory')).title()}**")
                st.write(item.get("content", item.get("value", "")))
                st.caption(f"Source: {item.get('source', 'user')} · Confidence: {item.get('confidence', 'explicit')}")
            with cols[2]:
                if st.button("Edit", key=f"edit_memory_{item.get('id')}"):
                    st.session_state[f"editing_memory_{item.get('id')}"] = True
                if st.button("Delete", key=f"delete_memory_{item.get('id')}"):
                    _, error = safe_call("DELETE", f"/memories/{item.get('id')}")
                    show_error(error)
                    if not error: rerun()
            if st.session_state.get(f"editing_memory_{item.get('id')}"):
                with st.form(f"edit_memory_form_{item.get('id')}"):
                    edited = st.text_area("Memory content", value=item.get("content", ""), key=f"edited_memory_{item.get('id')}")
                    edited_category = st.text_input("Category", value=item.get("category", "custom"), key=f"edited_category_{item.get('id')}")
                    if st.form_submit_button("Save memory"):
                        _, error = safe_call("PUT", f"/memories/{item.get('id')}", json={"content": edited, "category": edited_category})
                        show_error(error)
                        if not error: rerun()


def documents() -> None:
    page_header("Personal knowledge", "Documents", "Give Nexa grounded context from your own notes, resumes, project docs, and study material.")
    uploaded = st.file_uploader("Upload a document", type=["pdf", "txt", "md", "docx", "csv"])
    if uploaded and st.button("Ingest document", type="primary"):
        value, error = safe_call("POST", "/documents", files={"file": (uploaded.name, uploaded.getvalue(), uploaded.type)})
        show_error(error)
        if not error: st.success(f"{uploaded.name} is now searchable."); rerun()
    values, error = safe_call("GET", "/documents")
    show_error(error)
    if values:
        st.markdown("### Your source library")
        for item in values:
            with st.container(border=True):
                cols = st.columns([5, 1])
                with cols[0]:
                    st.markdown(f"**{item.get('filename', item.get('name', 'Document'))}**")
                    st.caption(f"{item.get('content_type', 'source')} · {item.get('size', '—')} bytes")
                with cols[1]:
                    if st.button("Delete", key=f"delete_doc_{item.get('id')}"):
                        _, error = safe_call("DELETE", f"/documents/{item.get('id')}")
                        show_error(error)
                        if not error: rerun()
    st.markdown("### Search your documents")
    with st.form("document_search"):
        query = st.text_input("Search query", placeholder="What did I write about evaluation?")
        if st.form_submit_button("Search"):
            value, error = safe_call("GET", "/documents/search", params={"query": query})
            show_error(error)
            if value:
                for result in value:
                    st.markdown(f"**{result.get('document_id', 'Source')}**")
                    st.write(result.get("text", result.get("content", result)))


def chat_page() -> None:
    context = st.session_state.get("chat_context")
    page_header("Intelligence layer", "Nexa chat", "Ask about your goals, tasks, learning, documents, or career decisions.")
    if context:
        st.info(f"Context: {context.get('title', 'selected item')}")
        if st.button("Clear context"):
            st.session_state.pop("chat_context", None)
            rerun()
    for message in st.session_state.chat_messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            if message.get("sources"):
                st.caption("Sources: " + ", ".join(map(str, message["sources"])))
    prompt = st.chat_input("What would you like to think through?")
    if prompt:
        st.session_state.chat_messages.append({"role": "user", "content": prompt})
        payload = {
            "message": prompt,
            "conversation_id": st.session_state.get("conversation_id"),
            **(context or {}),
        }
        value, error = safe_call("POST", "/chat", json=payload)
        if error:
            show_error(error)
        else:
            st.session_state.conversation_id = value.get("conversation_id")
            st.session_state.chat_messages.append({"role": "assistant", "content": value.get("message", ""), "sources": value.get("sources", [])})
            rerun()
    with st.expander("Search grounded documents directly"):
        with st.form("chat_doc_search"):
            query = st.text_input("Document query")
            if st.form_submit_button("Search sources"):
                value, error = safe_call("GET", "/documents/search", params={"query": query})
                show_error(error)
                if value: st.json(value)


def notifications() -> None:
    page_header("Stay in rhythm", "Notifications", "Control reminders and delivery windows without losing ownership of your time.")
    prefs, error = safe_call("GET", "/notifications/preferences")
    show_error(error)
    current = prefs or {}
    with st.form("notification_prefs"):
        enabled = st.toggle("Enable notifications", value=current.get("enabled", True))
        task_reminders = st.toggle("Task reminders", value=current.get("task_reminders", True))
        learning_reminders = st.toggle("Learning reminders", value=current.get("learning_reminders", True))
        article_reminders = st.toggle("Career article reminders", value=current.get("article_reminders", True))
        timezone = st.text_input("Timezone", value=current.get("timezone", "UTC"))
        learning_time = st.time_input("Learning reminder time", value=time.fromisoformat(current["learning_time"]) if current.get("learning_time") else time(8, 0))
        if st.form_submit_button("Save notification preferences", type="primary"):
            payload = {"enabled": enabled, "task_reminders": task_reminders, "learning_reminders": learning_reminders, "article_reminders": article_reminders, "timezone": timezone, "learning_time": learning_time.isoformat(), "article_times": []}
            _, error = safe_call("PUT", "/notifications/preferences", json=payload)
            show_error(error)
            if not error: st.success("Preferences saved.")
    st.markdown("### Notification inbox")
    values, error = safe_call("GET", "/notifications")
    show_error(error)
    for item in values or []:
        st.markdown(f"- **{item.get('title', item.get('type', 'Notification'))}** — {item.get('message', item.get('description', ''))}")


def automations() -> None:
    page_header("Workspace systems", "Automations", "Keep reusable personal workflows visible and editable instead of hiding them in backend records.")
    with st.expander("Create an automation", expanded=True):
        with st.form("automation_form"):
            title = st.text_input("Automation name", placeholder="Weekly portfolio review")
            description = st.text_area("What should this workflow help you do?")
            category = st.selectbox("Category", ["planning", "learning", "reflection", "career", "custom"])
            priority = st.selectbox("Priority", ["low", "medium", "high"])
            if st.form_submit_button("Save automation", type="primary"):
                _, error = safe_call("POST", "/automations", json={"title": title, "description": description, "category": category, "priority": priority})
                show_error(error)
                if not error:
                    st.success("Automation saved.")
                    rerun()
    values, error = safe_call("GET", "/automations")
    show_error(error)
    for item in values or []:
        with st.container(border=True):
            cols = st.columns([4, 1, 1])
            with cols[0]:
                st.markdown(f"### {item.get('title', 'Automation')}")
                st.write(item.get("description", ""))
                st.caption(f"{item.get('category', 'custom').title()} · {item.get('priority', 'medium').title()} priority")
            with cols[1]:
                if st.button("Pause", key=f"pause_auto_{item.get('id')}"):
                    _, error = safe_call("PUT", f"/automations/{item.get('id')}", json={**item, "status": "paused"})
                    show_error(error)
                    if not error:
                        rerun()
            with cols[2]:
                if st.button("Delete", key=f"delete_auto_{item.get('id')}"):
                    _, error = safe_call("DELETE", f"/automations/{item.get('id')}")
                    show_error(error)
                    if not error:
                        rerun()


def conversations() -> None:
    page_header("Conversation memory", "Conversations", "Reopen previous conversations and continue thinking with the context Nexa stored for you.")
    values, error = safe_call("GET", "/conversations")
    show_error(error)
    if not values:
        st.info("Your conversation history will appear here after your first chat.")
        return
    for item in values:
        with st.container(border=True):
            st.markdown(f"### {item.get('title', 'Nexa conversation')}")
            st.caption(f"Created {fmt_date(item.get('created_at'))}")
            if st.button("Continue conversation", key=f"continue_conversation_{item.get('id')}"):
                st.session_state.conversation_id = item.get("id")
                messages, error = safe_call("GET", f"/conversations/{item.get('id')}/messages")
                if error:
                    show_error(error)
                else:
                    st.session_state.chat_messages = [
                        {"role": message.get("role", "assistant"), "content": message.get("content", ""), "sources": message.get("sources", [])}
                        for message in messages or []
                    ]
                st.session_state.page = "Nexa chat"
                rerun()


def profile_account() -> None:
    page_header("Workspace", "Profile & account", "Tune the context Nexa uses and keep your account secure.")
    me, error = safe_call("GET", "/users/me")
    show_error(error)
    profile = (me or {}).get("profile", {})
    profile_record, profile_error = safe_call("GET", "/profile")
    if not profile_error and profile_record:
        profile = {**profile_record, **profile}
    with st.form("profile_form"):
        name = st.text_input("Name", value=profile.get("name", ""))
        profession = st.text_input("Current profession", value=profile.get("profession", profile.get("career_field", "")) or "")
        target = st.text_input("Target career", value=profile.get("target_career", "") or "")
        experience = st.text_input("Experience level", value=profile.get("experience_level", "") or "")
        skills = st.text_input("Current skills", value=option_text(profile.get("skills", profile.get("current_skills", []))))
        interests = st.text_input("Interests", value=option_text(profile.get("interests", [])))
        style = st.selectbox("Learning style", ["visual", "hands-on", "reading", "mixed"], index=["visual", "hands-on", "reading", "mixed"].index(profile.get("learning_style", "mixed")) if profile.get("learning_style", "mixed") in ["visual", "hands-on", "reading", "mixed"] else 3)
        timezone = st.text_input("Timezone", value=profile.get("timezone", "UTC"))
        memory_enabled = st.toggle("Allow Nexa to save explicit memories", value=profile.get("memory_enabled", True))
        if st.form_submit_button("Save career profile", type="primary"):
            payload = {"name": name or None, "profession": profession or None, "target_career": target or None, "experience_level": experience or None, "skills": [x.strip() for x in skills.split(",") if x.strip()], "interests": [x.strip() for x in interests.split(",") if x.strip()], "learning_style": style, "timezone": timezone, "memory_enabled": memory_enabled}
            _, error = safe_call("PUT", "/profile", json={
                "name": payload["name"],
                "career_field": payload["profession"],
                "target_career": payload["target_career"],
                "experience_level": payload["experience_level"],
                "skills": payload["skills"],
                "interests": payload["interests"],
                "learning_style": payload["learning_style"],
                "timezone": payload["timezone"],
            })
            if not error:
                _, error = safe_call("PUT", "/users/me", json={
                    "name": payload["name"],
                    "profession": payload["profession"],
                    "experience_level": payload["experience_level"],
                    "current_skills": payload["skills"],
                    "interests": payload["interests"],
                    "preferred_learning_style": payload["learning_style"],
                    "timezone": payload["timezone"],
                    "memory_enabled": payload["memory_enabled"],
                })
            show_error(error)
            if not error: st.success("Profile updated.")
    with st.expander("Change password"):
        with st.form("password_form"):
            current = st.text_input("Current password", type="password")
            new = st.text_input("New password", type="password")
            if st.form_submit_button("Change password"):
                _, error = safe_call("POST", "/auth/change-password", json={"current_password": current, "new_password": new})
                show_error(error)
                if not error: st.success("Password changed.")
    with st.expander("API and system health"):
        health, error = safe_call("GET", "/health")
        if error: show_error(error)
        else: st.json(health)


def render() -> None:
    init_state()
    inject_styles()
    if not st.session_state.token:
        auth_page()
        return
    page = sidebar()
    {
        "Overview": overview,
        "Goal studio": goal_studio,
        "Roadmap": roadmap_page,
        "Daily plan": daily_plan,
        "Learning lab": learning_lab,
        "Assessments": assessments,
        "Career intelligence": career_intelligence,
        "Recommendations": recommendations,
        "Projects": projects,
        "Progress & reports": progress_page,
        "Memories": memories,
        "Documents": documents,
        "Automations": automations,
        "Nexa chat": chat_page,
        "Conversations": conversations,
        "Notifications": notifications,
        "Profile & account": profile_account,
    }.get(page, overview)()


render()
