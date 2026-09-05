import os
import requests
import streamlit as st

API_URL = os.getenv("BACKEND_URL", "http://localhost:8000") + "/api"
st.set_page_config(page_title="Nexa | Personal Growth", page_icon="✦", layout="wide")
st.markdown("""<style>.block-container{max-width:1100px;padding-top:2rem}.nexa-card{padding:1.2rem;border:1px solid #e8e8ee;border-radius:16px;background:#fff}.stApp{background:#fafafe}</style>""", unsafe_allow_html=True)

def api(method, path, **kwargs):
    headers = kwargs.pop("headers", {})
    if st.session_state.get("token"): headers["Authorization"] = f"Bearer {st.session_state.token}"
    response = requests.request(method, f"{API_URL}{path}", headers=headers, timeout=120, **kwargs)
    if response.status_code >= 400: raise RuntimeError(response.json().get("detail", "Request failed"))
    return response.json() if response.content else None

def authenticate():
    st.title("✦ Nexa")
    st.caption("A private, evidence-aware growth companion for your goals, work, and learning.")
    login, register = st.tabs(["Sign in", "Create account"])
    with login:
        with st.form("login"):
            email = st.text_input("Email"); password = st.text_input("Password", type="password")
            if st.form_submit_button("Sign in", use_container_width=True):
                try: st.session_state.token = api("POST", "/auth/login", json={"email": email, "password": password})["access_token"]; st.rerun()
                except RuntimeError as exc: st.error(str(exc))
    with register:
        with st.form("register"):
            email = st.text_input("Email", key="register_email"); password = st.text_input("Password (12+ characters)", type="password", key="register_password")
            if st.form_submit_button("Create secure account", use_container_width=True):
                try: st.session_state.token = api("POST", "/auth/register", json={"email": email, "password": password})["access_token"]; st.rerun()
                except RuntimeError as exc: st.error(str(exc))

def dashboard():
    st.title("Your career growth command center")
    st.caption("Your goal, roadmap, daily actions, and evidence of progress stay connected.")
    try: data = api("GET", "/dashboard")
    except RuntimeError as exc: st.error(str(exc)); return
    snapshot, today, progress = data["career_snapshot"], data["today"], data["progress"]
    cols = st.columns(3)
    cols[0].metric("Career goal", snapshot["goal"]["title"] if snapshot["goal"] else "Set your direction")
    cols[1].metric("Goal progress", f'{snapshot["progress"]}%')
    cols[2].metric("Today’s plan", f'{len(today["tasks"])} actions')
    st.subheader("NexaAI insight")
    st.info(data["ai_insight"])
    left, right = st.columns([3, 2])
    with left:
        st.subheader("Today's connected plan")
        if not today["tasks"]:
            st.caption("Finalize a roadmap, then generate a daily plan based on your available time.")
        for task in today["tasks"]:
            st.markdown(f"**{task['title']}** · {task.get('estimated_minutes', 0)} min · {task.get('task_type', 'activity').title()}")
            st.progress(task.get("completion_percentage", 0))
    with right:
        st.subheader("Journey signals")
        st.metric("Task completion", f'{progress["task_completion_rate"]}%')
        st.metric("Roadmap completion", f'{progress["roadmap_progress"]}%')
        phase = snapshot.get("current_phase")
        st.caption(f"Current phase: {phase['title'] if phase else 'Not set yet'}")
    if today.get("recommended_action"):
        st.subheader("Recommended next action")
        st.write(today["recommended_action"].get("description") or today["recommended_action"]["title"])

def resource_page(name):
    st.title(name)
    endpoint = "/" + name.lower()
    try: values = api("GET", endpoint)
    except RuntimeError as exc: st.error(str(exc)); return
    with st.expander(f"Add {name[:-1].lower()}"):
        with st.form(f"new-{name}"):
            title = st.text_input("Title"); description = st.text_area("Description"); priority = st.selectbox("Priority", ["low", "medium", "high"])
            if st.form_submit_button("Save"):
                try: api("POST", endpoint, json={"title": title, "description": description, "priority": priority}); st.rerun()
                except RuntimeError as exc: st.error(str(exc))
    if not values: st.caption(f"No {name.lower()} yet.")
    for item in values:
        with st.container(border=True):
            st.subheader(item["title"]); st.caption(f"{item.get('status', 'active').title()} · {item.get('priority', 'medium').title()} priority")
            if item.get("description"): st.write(item["description"])

def api_summary_page(title, endpoint, empty_message):
    st.title(title)
    try: value = api("GET", endpoint)
    except RuntimeError as exc: st.error(str(exc)); return
    if isinstance(value, list):
        if not value: st.caption(empty_message)
        for item in value:
            with st.container(border=True):
                st.subheader(item.get("title", "NexaAI item"))
                st.write(item.get("description") or item.get("summary") or item.get("content") or "")
    elif value.get("status") == "unavailable":
        st.info(value.get("reason", empty_message))
    else:
        st.json(value)

def chat():
    st.title("Chat with Nexa")
    st.caption("Nexa separates your profile, stored memories, documents, web sources, and general knowledge in its responses.")
    for message in st.session_state.get("chat", []):
        with st.chat_message(message["role"]): st.markdown(message["content"])
    if prompt := st.chat_input("Ask about your goals, learning, or plan…"):
        st.session_state.setdefault("chat", []).append({"role":"user", "content":prompt})
        with st.chat_message("user"): st.markdown(prompt)
        with st.chat_message("assistant"):
            with st.spinner("Reviewing your relevant context…"):
                try: answer = api("POST", "/chat", json={"message": prompt}); st.markdown(answer["message"])
                except RuntimeError as exc: st.error(str(exc)); return
        st.session_state.chat.append({"role":"assistant", "content":answer["message"]})

if not st.session_state.get("token"):
    authenticate()
else:
    with st.sidebar:
        st.header("✦ Nexa")
        page = st.radio("Navigate", ["Overview", "Chat", "Goals", "Roadmap", "Today's Tasks", "Today's Learning", "Career Updates", "Recommendations", "Projects", "Progress", "History", "Memories", "Profile / Settings"])
        if st.button("Log out", use_container_width=True): st.session_state.clear(); st.rerun()
    if page == "Overview": dashboard()
    elif page == "Chat": chat()
    elif page == "Goals": resource_page("Goals")
    elif page == "Roadmap": api_summary_page(page, "/goals", "Create a goal and discuss it with NexaAI to draft a roadmap.")
    elif page == "Today's Tasks": api_summary_page(page, "/tasks/today", "No planned tasks for today.")
    elif page == "Today's Learning": api_summary_page(page, "/learning/today", "Generate learning from a task to begin.")
    elif page == "Career Updates": api_summary_page(page, "/news/today", "No verified career update is available yet.")
    elif page == "Recommendations": api_summary_page(page, "/recommendations", "Generate a recommendation from your progress.")
    elif page == "Projects": api_summary_page(page, "/projects", "No project recommendation yet.")
    elif page == "Progress": api_summary_page(page, "/progress", "No progress evidence yet.")
    elif page == "History": api_summary_page(page, "/history", "No history yet.")
    elif page == "Memories": api_summary_page(page, "/memories", "No saved memories yet.")
    else: api_summary_page(page, "/users/me", "Complete your career profile to personalize NexaAI.")
