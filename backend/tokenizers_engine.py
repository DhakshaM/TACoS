# backend/tokenizers_engine.py
from __future__ import annotations
import unicodedata

import os, re, regex, json
from typing import Callable, Dict, List, Optional, Tuple
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

_HF_STRATEGIES = frozenset({"bpe", "wordpiece", "unigram", "bbpe"})

def working_text_for_language(text: str, lang_short: str) -> str:
    if lang_short == "ta":
        return clean_tamil(text)
    return text

def tokenize_all(text: str, lang_code: str, lang_short: str = "hi") -> Tuple[str, Dict[str, List[str]]]:
    working = working_text_for_language(text, lang_short)
    models = _load_lang(lang_code)

    def _hf(key: str) -> List[str]:
        m = models.get(key)
        if m is None:
            return ["[model not loaded]"]
        try:
            return m.encode(working).tokens
        except Exception:
            return []

    return working, {
        "whitespace": whitespace_tokenize(working),
        "word":       word_tokenize(working, lang_short),
        "character":  char_tokenize(working),
        "bpe":        _hf("bpe"),
        "wordpiece":  _hf("wordpiece"),
        "unigram":    _hf("unigram"),
        "bbpe":       _hf("bbpe"),
    }

def _parse_unk_literal_from_json(path: str) -> Optional[str]:
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
    except Exception:
        return None
    model = d.get("model") or {}
    ut = model.get("unk_token")
    if isinstance(ut, str) and ut:
        return ut
    if model.get("type") == "Unigram":
        uid = model.get("unk_id")
        vocab = model.get("vocab")
        if isinstance(uid, int) and isinstance(vocab, list) and 0 <= uid < len(vocab):
            entry = vocab[uid]
            if isinstance(entry, (list, tuple)) and entry and isinstance(entry[0], str):
                return entry[0]
    for t in d.get("added_tokens") or []:
        c = t.get("content")
        if isinstance(c, str) and "unk" in c.lower():
            return c
    return None

def unk_literal_for_strategy(lang_code: str, strategy: str) -> Optional[str]:
    if strategy not in _HF_STRATEGIES:
        return None
    path = os.path.join(BASE, f"{lang_code}_{strategy}.json")
    return _parse_unk_literal_from_json(path)

def vocab_size_for_hf_model(model) -> int:
    if model is None:
        return 0
    try:
        return int(model.get_vocab_size(with_added_tokens=True))
    except Exception:
        pass
    try:
        return len(model.get_vocab())
    except Exception:
        return 0

def tokenize_single_word(word: str, strategy: str, lang_short: str, models: dict) -> List[str]:
    if not word:
        return []
    if strategy == "whitespace":
        return whitespace_tokenize(word)
    if strategy == "word":
        return word_tokenize(word, lang_short)
    if strategy == "character":
        return char_tokenize(word)
    m = models.get(strategy)
    if m is None:
        return []
    try:
        return m.encode(word).tokens
    except Exception:
        return []

def _strip_to_lexical(word: str) -> str:
    """
    Strip all leading and trailing characters that are NOT
    letters or combining marks (vowel signs, halant etc.).
    Uses Unicode category: L* = letters, M* = marks (matras, halant).
    This correctly handles all punctuation including smart quotes,
    em-dash, ellipsis, brackets etc.
    """
    # Strip from left
    start = 0
    while start < len(word):
        cat = unicodedata.category(word[start])
        if cat.startswith('L') or cat.startswith('M'):
            break
        start += 1
    # Strip from right
    end = len(word)
    while end > start:
        cat = unicodedata.category(word[end - 1])
        if cat.startswith('L') or cat.startswith('M'):
            break
        end -= 1
    return word[start:end]

def compute_live_metrics(
    text: str,
    tokens: List[str],
    *,
    encode_word: Optional[Callable[[str], List[str]]],
    observed_vocab: Optional[set] = None,
) -> dict:
    """
    Compute tokenization metrics matching notebook formula precisely.
    Metrics: fertility, nsl, cpt, pcw, oov_rate computed from raw text.
    
    Args:
        text: raw input text (whitespace-delimited)
        tokens: tokenized output from strategy
        encode_word: function to tokenize single word (for PCW/OOV computation)
        observed_vocab: set of tokens seen in the corpus (for OOV rate)
    
    Returns:
        dict with keys: fertility, oov_rate, nsl, cpt, pcw, n_tokens, vocab_size
    """
    words = text.split()
    n_words = len(words)
    n_tokens = len(tokens)
    n_chars = len(text)

    # Total character length of all tokens
    total_token_chars = sum(len(t) for t in tokens)

    fertility = (n_tokens / n_words) if n_words else 0.0
    nsl = (n_tokens / n_chars) if n_chars else 0.0
    cpt = (total_token_chars / n_tokens) if n_tokens else 0.0

    # OOV rate: fraction of tokens not in observed vocabulary
    if observed_vocab is not None and n_tokens:
        oov_count = sum(1 for t in tokens if t not in observed_vocab)
        oov_rate = oov_count / n_tokens
    else:
        oov_rate = 0.0

    # PCW: fraction of words fragmented into > 1 token
    # Uses Unicode-aware punctuation stripping
    fragmented = 0
    if encode_word is not None and n_words:
        for w in words:
            lex = _strip_to_lexical(w)
            if not lex:
                continue
            word_tokens = [t for t in encode_word(lex) if t.strip()]
            if len(word_tokens) > 1:
                fragmented += 1
    pcw = (fragmented / n_words) if n_words else 0.0

    # Build vocab from observed tokens if not provided
    vocab_set = observed_vocab if observed_vocab is not None else set(tokens)
    vocab_size = len(vocab_set)

    return {
        "fertility": round(fertility, 4),
        "oov_rate":  round(oov_rate, 4),
        "nsl":       round(nsl, 6),
        "cpt":       round(cpt, 4),
        "pcw":       round(pcw, 4),
        "n_tokens":  n_tokens,
        "vocab_size": vocab_size,
    }

def build_live_metrics(
    text: str,
    all_tokens: Dict[str, List[str]],
    lang_code: str,
    lang_short: str,
) -> Dict[str, dict]:
    """
    Build live metrics for all tokenization strategies.
    Computes metrics matching notebook formula v3.
    
    Args:
        text: raw input text (will be cleaned per language before metric computation)
        all_tokens: dict of strategy -> tokens list
        lang_code: language code (hindi/marathi/tamil)
        lang_short: 2-letter language code (hi/mr/ta)
    
    Returns:
        dict of strategy -> metrics dict
    """
    # Apply same text transformation that tokenize_all() uses
    # This ensures metrics are computed on same text as tokenizers
    working_text = working_text_for_language(text, lang_short)
    
    models = _load_lang(lang_code)
    metrics = {}
    
    # Build combined observed vocabulary from all strategies
    all_vocab = set()
    for tokens in all_tokens.values():
        all_vocab.update(tokens)
    
    for strategy, tokens in all_tokens.items():
        metrics[strategy] = compute_live_metrics(
            working_text,
            tokens,
            encode_word=lambda w, _s=strategy: tokenize_single_word(w, _s, lang_short, models),
            observed_vocab=all_vocab,
        )
    return metrics