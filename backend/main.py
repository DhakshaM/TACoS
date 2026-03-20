# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json, os

from tokenizers_engine import tokenize_all, compute_live_metrics

app = FastAPI(title="Tokenizer Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LANG_MAP = {
    "hindi":   ("hindi",   "hi"),
    "marathi": ("marathi", "mr"),
    "tamil":   ("tamil",   "ta"),
}

class TokenizeRequest(BaseModel):
    text: str
    language: str = "hindi"

@app.post("/tokenize")
def tokenize(req: TokenizeRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is empty")
    lang_code, lang_short = LANG_MAP.get(req.language, ("hindi", "hi"))
    all_tokens = tokenize_all(req.text, lang_code, lang_short)

    # compute metrics for each strategy
    metrics = {}
    for strategy, tokens in all_tokens.items():
        hardcode_pcw = 0.0 if strategy in ("whitespace", "word") else None
        metrics[strategy] = compute_live_metrics(req.text, tokens, hardcode_pcw)

    return {"tokens": all_tokens, "metrics": metrics, "language": req.language}

@app.get("/metrics/{language}")
def get_corpus_metrics(language: str):
    """Return pre-computed corpus-level metrics from Kaggle training."""
    path = os.path.join(os.path.dirname(__file__), "models",
                        f"{language}_all_metrics.json")
    if not os.path.exists(path):
        raise HTTPException(404, f"Metrics file not found for {language}")
    with open(path) as f:
        return json.load(f)

@app.get("/health")
def health():
    return {"status": "ok"}