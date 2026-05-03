# backend/tokenizers_engine.py
import unicodedata

import os, re, regex, json
from tokenizers import Tokenizer as HFTokenizer

# ── paths ────────────────────────────────────────────────────────────────────
BASE = os.path.join(os.path.dirname(__file__), "models")

# ── IndicNLP setup ───────────────────────────────────────────────────────────
# We attempt to load; if resources aren't present we fall back gracefully.
try:
    from indicnlp import common as indic_common
    _RESOURCES = os.path.join(os.path.dirname(__file__), "indic_nlp_resources")
    if os.path.isdir(_RESOURCES):
        indic_common.set_resources_path(_RESOURCES)
    from indicnlp.tokenize import indic_tokenize as _indic_tok
    from indicnlp.normalize.indic_normalize import IndicNormalizerFactory
    _norm_factory = IndicNormalizerFactory()
    _INDIC_OK = True
except Exception:
    _INDIC_OK = False

def _normalise(text: str, lang: str) -> str:
    if not _INDIC_OK:
        return text
    try:
        n = _norm_factory.get_normalizer(lang)
        return n.normalize(text)
    except Exception:
        return text


# ── punct splitter (for whitespace baseline) ─────────────────────────────────
_PUNCT_RE = re.compile(r'([।॥,;:!?\.\"\'\(\)\[\]\{\}\-])')

def whitespace_tokenize(text: str):
    """Pure whitespace tokenizer - keeps punctuation attached to words"""
    return text.split()   


def word_tokenize(text: str, lang: str = "hi"):
    """Splits punctuation as separate tokens"""
    if not (text or "").strip():
        return []
    if _INDIC_OK:
        try:
            normalized = _normalise(text, lang)
            return _indic_tok.trivial_tokenize(normalized, lang=lang)
        except Exception:
            pass

    expanded = _PUNCT_RE.sub(r' \1 ', text)
    return [t for t in expanded.split() if t]

def char_tokenize(text: str):
    return [gc for gc in regex.findall(r'\X', text) if gc.strip()]

_TAMIL_RE    = re.compile(
    r'[^\u0B80-\u0BFF\u0BE6-\u0BEF\s\|,;:!?\.\"\'\(\)\[\]\{\}\-]'
)
_MULTI_SPACE = re.compile(r'\s+')

def clean_tamil(text: str) -> str:
    text = unicodedata.normalize('NFC', text)
    try:
        norm = _norm_factory.get_normalizer("ta")
        text = norm.normalize(text)
    except Exception:
        pass
    text = _TAMIL_RE.sub(' ', text)
    text = _MULTI_SPACE.sub(' ', text)
    return text.strip()

# ── load trained tokenizers ──────────────────────────────────────────────────
_LANG_MODELS = {}

def _load_lang(lang_code: str):
    """Load the 4 trained HF tokenizers for a language code (e.g. 'hindi')."""
    if lang_code in _LANG_MODELS:
        return _LANG_MODELS[lang_code]
    d = {}
    for strategy in ("bpe", "wordpiece", "unigram", "bbpe"):
        path = os.path.join(BASE, f"{lang_code}_{strategy}.json")
        if os.path.exists(path):
            d[strategy] = HFTokenizer.from_file(path)
        else:
            d[strategy] = None
    _LANG_MODELS[lang_code] = d
    return d

# eager-load on import
for _lc in ("hindi", "marathi", "tamil"):
    _load_lang(_lc)

# ── tokenize one text, all 7 strategies ──────────────────────────────────────
# Replace the existing tokenize_all function in tokenizers_engine.py

def tokenize_all(text: str, lang_code: str, lang_short: str = "hi") -> dict:
    # Apply language-specific cleaning
    if lang_short == "ta":
        text = clean_tamil(text)

    models = _load_lang(lang_code)

    def _hf(key):
        m = models.get(key)
        if m is None:
            return ["[model not loaded]"]
        return m.encode(text).tokens

    return {
        "whitespace": whitespace_tokenize(text),
        "word":       word_tokenize(text, lang_short),
        "character":  char_tokenize(text),
        "bpe":        _hf("bpe"),
        "wordpiece":  _hf("wordpiece"),
        "unigram":    _hf("unigram"),
        "bbpe":       _hf("bbpe"),
    }

# ── compute live metrics for a single tokenization ───────────────────────────
import unicodedata

def _strip_to_lexical(word: str) -> str:
    start = 0
    while start < len(word):
        cat = unicodedata.category(word[start])
        if cat.startswith('L') or cat.startswith('M'):
            break
        start += 1
    end = len(word)
    while end > start:
        cat = unicodedata.category(word[end - 1])
        if cat.startswith('L') or cat.startswith('M'):
            break
        end -= 1
    return word[start:end]

def compute_live_metrics(text: str, tokens: list, pcw_hardcode=None) -> dict:
    words        = text.split()
    n_words      = max(len(words), 1)
    n_tokens     = max(len(tokens), 1)
    n_chars      = max(len(text), 1)
    token_chars  = sum(len(t.lstrip('▁').lstrip('Ġ').replace('##','')) for t in tokens)

    fertility = n_tokens / n_words
    nsl       = n_tokens / n_chars
    cpt       = token_chars / n_tokens

    if pcw_hardcode is not None:
        pcw = pcw_hardcode
    else:
        frag = sum(1 for w in words
                   if len([t for t in tokens
                           if t.lstrip('▁').lstrip('Ġ').replace('##','')
                              in w]) > 1)
        # simpler PCW for live: count words whose lex form appears split
        pcw_words = 0
        for w in words:
            lex = _strip_to_lexical(w)
            if not lex:
                continue
            # count tokens that could belong to this word
            matched = [t for t in tokens if lex.startswith(
                t.lstrip('▁').lstrip('Ġ').replace('##',''))]
            if len(matched) > 1:
                pcw_words += 1
        pcw = pcw_words / n_words

    return {
        "fertility": round(fertility, 3),
        "oov":       0.0,
        "nsl":       round(nsl, 5),
        "cpt":       round(cpt, 3),
        "pcw":       round(pcw, 3),
        "n_tokens":  n_tokens,
        "vocab_size": len(set(tokens)),
    }