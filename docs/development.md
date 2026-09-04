# Development

Create a virtual environment, install `backend/requirements.txt` and `frontend/requirements.txt`, copy `.env.example` to `.env`, then run `uvicorn app.main:app --app-dir backend --reload` and `streamlit run frontend/app.py` in separate terminals. Run `pytest backend/tests` for backend tests.

Use a local MongoDB instance or MongoDB Atlas. Never commit `.env`; rotate any key exposed outside a secure secret manager.
