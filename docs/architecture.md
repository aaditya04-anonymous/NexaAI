# Architecture

Nexa uses a Streamlit client and a FastAPI API. FastAPI authenticates every protected request, passes the trusted subject ID to services, and repositories always query user-owned documents with that subject ID. MongoDB stores operational records with user/time indexes. The LangGraph workflow classifies intent and generates Gemini responses through a dedicated node; models never receive database access.

External services are configured by environment variables. Gemini is only invoked when configured. LangSmith-compatible LangChain/LangGraph instrumentation is enabled by standard `LANGSMITH_*` environment variables without forwarding credentials into prompts.
