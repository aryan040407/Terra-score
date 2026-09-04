FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY ml ./ml
COPY data ./data
# Regenerate data + model inside the image if they are missing (keeps repo light)
RUN [ -f ml/saved_model/terrascore_model.joblib ] || (python ml/generate_data.py && python ml/train.py)
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
