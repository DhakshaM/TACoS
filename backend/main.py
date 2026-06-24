# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json, os, csv

from tokenizers_engine import tokenize_all, build_live_metrics

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
    working_text, all_tokens = tokenize_all(req.text, lang_code, lang_short)
    metrics = build_live_metrics(req.text, all_tokens, lang_code, lang_short)

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


# ── Energy / CodeCarbon ────────────────────────────────────────────────────────
EMISSIONS_CSV = os.path.join(
    os.path.dirname(__file__), "..", "emissions", "emissions.csv"
)

# Human-readable labels for known experiment_id values
EXPERIMENT_LABELS = {
    "evaluation_pipeline":    "Evaluation Pipeline",
    "crosslingual_probing":   "Cross-lingual Probing",
    "historical_analysis":    "Historical Analysis",
}

@app.get("/energy")
def get_energy():
    """
    Read CodeCarbon emissions.csv and return per-experiment energy rows.
    If the file does not exist the endpoint returns an empty list so the
    frontend can show a 'no data' state instead of an error.
    """
    csv_path = os.path.abspath(EMISSIONS_CSV)
    if not os.path.exists(csv_path):
        return {"rows": [], "csv_found": False}

    rows = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for record in reader:
            exp_id = record.get("experiment_id") or record.get("project_name") or "unknown"
            # emissions is in kg CO2-eq; convert to grams for display
            emissions_kg = float(record.get("emissions") or 0)
            energy_kwh   = float(record.get("energy_consumed") or 0)
            duration_s   = float(record.get("duration") or 0)
            rows.append({
                "experiment_id":  exp_id,
                "label":          EXPERIMENT_LABELS.get(exp_id, exp_id.replace("_", " ").title()),
                "emissions_g":    round(emissions_kg * 1000, 6),
                "energy_kwh":     round(energy_kwh, 8),
                "duration_s":     round(duration_s, 2),
                "country":        record.get("country_name", ""),
                "cpu_model":      record.get("cpu_model", ""),
                "os":             record.get("os", ""),
            })

    return {"rows": rows, "csv_found": True}