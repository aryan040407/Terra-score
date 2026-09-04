.PHONY: setup data train api web dev docker
setup: ; pip install -r backend/requirements.txt && cd frontend && npm install
data:  ; python ml/generate_data.py
train: ; python ml/train.py
api:   ; uvicorn backend.main:app --reload --port 8000
web:   ; cd frontend && npm run dev
docker:; docker compose up --build
