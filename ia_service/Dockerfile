FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY ia_service/requirements.txt ./ia_service/requirements.txt
RUN pip install --no-cache-dir -r ia_service/requirements.txt

COPY ia_service/ ./ia_service/

EXPOSE 8000

CMD ["uvicorn", "ia_service.main:app", "--host", "0.0.0.0", "--port", "8000"]