import os
import requests
import streamlit as st

API_URL = os.getenv("BACKEND_URL", "http://localhost:8000") + "/api"
st.set_page_config(page_title="Nexa | Personal Growth", page_icon="✦", layout="wide")
st.markdown("""<style>.block-container{max-width:1100px;padding-top:2rem}.nexa-card{padding:1.2rem;border:1px solid #e8e8ee;border-radius:16px;background:#fff}.stApp{background:#fafafe}</style>""", unsafe_allow_html=True)

def api(method, path, **kwargs):
    headers = kwargs.pop("headers", {})
    if st.session_state.get("token"): headers["Authorization"] = f"Bearer {st.session_state.token}"
    response = requests.request(method, f"{API_URL}{path}", headers=headers, timeout=25, **kwargs)
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
    st.title("Your growth space")
    try: summary = api("GET", "/progress/summary")
    except RuntimeError as exc: st.error(str(exc)); return
    cols = st.columns(3)
    cols[0].metric("Active goals", summary["active_goals"]); cols[1].metric("Completed tasks", summary["completed_tasks"]); cols[2].metric("Overdue tasks", summary["overdue_tasks"])
    st.info("Nexa only reports metrics stored in your account. Add goals and tasks to generate useful insights.")

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
        page = st.radio("Navigate", ["Overview", "Chat", "Goals", "Tasks", "Memories", "Recommendations"])
        if st.button("Log out", use_container_width=True): st.session_state.clear(); st.rerun()
    if page == "Overview": dashboard()
    elif page == "Chat": chat()
    else: resource_page(page)
