# Hugging Face Space (Docker SDK) / Render. Python 3.12: fastembed has no wheels for 3.15.
FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH \
    FASTEMBED_CACHE_PATH=/home/user/.cache/fastembed \
    PYTHONUNBUFFERED=1
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the embedding model into the image so the first /chat isn't slow.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')"

COPY --chown=user app ./app
COPY --chown=user data ./data

EXPOSE 7860
# $PORT is set by Render/Railway; Hugging Face uses 7860.
CMD ["sh", "-c", "uvicorn app.api:app --host 0.0.0.0 --port ${PORT:-7860}"]
