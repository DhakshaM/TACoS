#!/usr/bin/env python3
"""
collect_emissions.py
--------------------
Runs the three experiment stages from the Indic Tokenizer project under
CodeCarbon tracking and writes ./emissions/emissions.csv.

Run from the TACoS root directory:
    python collect_emissions.py

One CSV row is appended per stage.  Existing rows are preserved so you
can re-run individual stages without duplicating entries (the script
clears the file first to get a clean run; remove the clear block if
you want to accumulate across runs).
"""

import sys
import os

# ── make sure the backend package is importable ──────────────────────────────
BACKEND = os.path.join(os.path.dirname(__file__), "backend")
sys.path.insert(0, BACKEND)

from tokenizers_engine import tokenize_all, build_live_metrics

# ── output directory ──────────────────────────────────────────────────────────
EMISSIONS_DIR = os.path.join(os.path.dirname(__file__), "emissions")
os.makedirs(EMISSIONS_DIR, exist_ok=True)

# ── corpora used for evaluation (representative sentences per language) ────────
# These are the same sentence types shown in the playground presets.
# Repeated 150 times each so the tracker has enough CPU work to measure.

HINDI_SENTENCES = [
    "भारत एक महान देश है।",
    "क्षमा करना बहुत कठिन है लेकिन न्यायपूर्ण कार्य है।",
    "हिन्दी भारत की राजभाषा है और यह देवनागरी लिपि में लिखी जाती है।",
    "भारतीय संविधान में हिन्दी को राजभाषा का दर्जा दिया गया है जो पूरे देश में बोली और समझी जाती है।",
    "संविधान ने भारत को धर्मनिरपेक्ष लोकतांत्रिक गणराज्य घोषित किया है।",
    "भारतीय अर्थव्यवस्था विश्व की प्रमुख अर्थव्यवस्थाओं में से एक है।",
    "दुनिया का सातवाँ सबसे बड़ा देश भारत विशाल भौगोलिक विविधता से भरा है।",
    "भारत की आधिकारिक भाषाओं में हिंदी और अंग्रेज़ी शामिल हैं।",
    "हिन्दी साहित्य में कबीर, तुलसीदास और मीराबाई के ग्रंथ महत्त्वपूर्ण हैं।",
    "मुला मुनारै क्या चढ़हि, अला न बहिरा होइ।",
]

MARATHI_SENTENCES = [
    "मराठी ही महाराष्ट्राची राजभाषा आहे.",
    "क्षमा, ज्ञान आणि श्रद्धा या गुणांनी जीवन समृद्ध होते.",
    "मुलांशी बोलताना तो शांतपणे चर्चा करत राहिला.",
    "महाराष्ट्रात मराठी भाषा अधिकृतपणे वापरली जाते.",
    "संविधानाने भारतला धर्मनिरपेक्ष लोकशाही गणराज्य घोषित केले.",
    "भारतीय अर्थव्यवस्था जगातील प्रमुख अर्थव्यवस्थांपैकी एक आहे.",
    "वक्तृत्व आपल्या गोडपणाने अमृताला पलीकडे सर असे म्हणते.",
    "भारत हा संघराज्यीय लोकशाही असलेला देश आहे.",
    "श्रीगुरूंचे पाय जैं हृदय गिंवसूनि ठाय।",
    "ज्ञानेश्वरीमधील अभंग मराठी साहित्याचा आधारस्तंभ आहे.",
]

TAMIL_SENTENCES = [
    "தமிழ் மொழி அழகானது.",
    "க்ஷமை கேட்பது மிகவும் கஷ்டமான காரியம்.",
    "இந்தியா ஒரு பெரிய நாடு. இங்கு பல மொழிகள் பேசப்படுகின்றன.",
    "தமிழ் மொழி உலகின் பழமையான மொழிகளில் ஒன்றாகும்.",
    "அரசியலமைப்பு இந்தியாவை மதச்சார்பற்ற ஜனநாயக குடியரசாக அறிவிக்கிறது.",
    "இந்திய பொருளாதாரம் உலகின் முக்கிய பொருளாதாரங்களில் ஒன்று.",
    "இந்தியாவின் அதிகாரப்பூர்வ மொழிகளில் இந்தியும் ஆங்கிலமும் அடங்கும்.",
    "இன்சொலால் ஈரம் அளைஇப் படிறுஇலவாம் செம்பொருள் கண்டார்வாய்ச் சொல்.",
    "முகத்தான் அமர்ந்துஇனிது நோக்கி அகத்தானாம் இன்சொ லினதே அறம்.",
    "தமிழ் தமிழ்நாட்டின் அதிகாரப்பூர்வ மொழி ஆகும்.",
]

LANGUAGES = [
    ("hindi",   "hi", HINDI_SENTENCES),
    ("marathi", "mr", MARATHI_SENTENCES),
    ("tamil",   "ta", TAMIL_SENTENCES),
]

REPEATS = 10   # repeat the sentence list — keeps runtime a few seconds per stage


def run_evaluation_pipeline():
    """Stage 1 — tokenize all language/strategy combinations and compute metrics."""
    print("  Running evaluation pipeline across all 3 languages × 7 strategies …")
    total = 0
    for lang_code, lang_short, sentences in LANGUAGES:
        corpus = sentences * REPEATS
        for sentence in corpus:
            _, tokens = tokenize_all(sentence, lang_code, lang_short)
            build_live_metrics(sentence, tokens, lang_code, lang_short)
            total += 1
    print(f"  Processed {total:,} sentence-tokenizations.")


def run_crosslingual_probing():
    """
    Stage 2 — cross-lingual probing.
    Tokenize each sentence with every language's tokenizer models (not just
    the native one) and compare fertility / OOV across the mismatch pairs.
    This is the kind of cross-lingual experiment you'd run to probe vocabulary
    transfer between Hindi, Marathi, and Tamil models.
    """
    print("  Running cross-lingual probing (all language pairs) …")
    results = {}
    pairs_done = 0
    for src_lang, src_short, sentences in LANGUAGES:
        for tgt_lang, tgt_short, _ in LANGUAGES:
            corpus = sentences * REPEATS
            for sentence in corpus:
                # tokenize src text with tgt language models
                _, tokens = tokenize_all(sentence, tgt_lang, tgt_short)
                m = build_live_metrics(sentence, tokens, tgt_lang, tgt_short)
                results[(src_lang, tgt_lang)] = m
                pairs_done += 1
    print(f"  Processed {pairs_done:,} cross-lingual sentence-tokenizations.")


def run_historical_analysis():
    """
    Stage 3 — historical / diachronic analysis.
    Tokenize pairs of old vs. modern text samples (the same presets used
    in the Diff view) and compute the full metric set for both, matching
    how the viva Figure A.5 would be motivated.
    """
    print("  Running historical diachronic analysis …")

    OLD_TEXTS = [
        # Old Hindi (Kabir)
        ("hindi", "hi",
         "मुला मुनारै क्या चढ़हि, अला न बहिरा होइ।\n"
         "जेहिं कारन तू बांग दे, सो दिल ही भीतरि जोइ॥\n"
         "नैनाँ अंतरि आव तूँ, ज्यूँ हौं नैन झँपेऊँ।\n"
         "नाँ हौं देखौं और कूँ, नाँ तुझ देखन देऊँ॥"),
        # Old Marathi (Jnaneshwari)
        ("marathi", "mr",
         "वक्तृत्वा गोडपणें । अमृतातें पारुखें म्हणे ।\n"
         "रस होती वोळंगणें । अक्शरांसी ॥\n"
         "भावाचें अवतरण । अवतरविती खूण ।\n"
         "हाता चढे संपूर्ण । तत्त्वभेद ॥"),
        # Old Tamil (Thirukkural)
        ("tamil", "ta",
         "இன்சொலால் ஈரம் அளைஇப் படிறுஇலவாம்\n"
         "செம்பொருள் கண்டார்வாய்ச் சொல்.\n"
         "அகன்அமர்ந்து ஈதலின் நன்றே முகனமர்ந்து\n"
         "இன்சொலன் ஆகப் பெறின்."),
    ]

    NEW_TEXTS = [
        # Modern Hindi
        ("hindi", "hi",
         "हे मुल्ला! तू मीनार पर चढ़कर बाँग देता है, अल्लाह बहरा नहीं है।\n"
         "जिसके लिए तू बाँग देता है, उसे अपने दिल के भीतर देख।\n"
         "आत्मारूपी प्रियतमा कह रही है कि हे प्रियतम! तुम मेरे नेत्रों के भीतर आ जाओ।"),
        # Modern Marathi
        ("marathi", "mr",
         "वक्तृत्व आपल्या गोडपणाने अमृताला पलीकडे सर असे म्हणते.\n"
         "निरनिराळ्या तत्वातील फरक दाखवून अभिप्रायांची स्पष्टता करणारी खूण आपल्या स्वाधीन होते.\n"
         "जेव्हा हृदय श्रीगुरूचे पाय धरून रहाते तेव्हा ज्ञानाला दैव प्राप्त होते."),
        # Modern Tamil
        ("tamil", "ta",
         "அன்பு கலந்து வஞ்சம் அற்றவைகளாகிய சொற்கள் மெய்ப்பொருள் கண்டவர்களின் வாய்ச்சொற்கள்.\n"
         "முகம் மலர்ந்து இன்சொல் உடையவனாக இருக்கப் பெற்றால் ஈகையைவிட நல்லதாகும்.\n"
         "முகத்தால் விரும்பி இனிமையுடன் நோக்கி உள்ளம் கலந்து இன்சொற்களைக் கூறுவதே அறமாகும்."),
    ]

    total = 0
    for texts in (OLD_TEXTS, NEW_TEXTS):
        for lang_code, lang_short, text in texts:
            for _ in range(REPEATS):
                _, tokens = tokenize_all(text, lang_code, lang_short)
                build_live_metrics(text, tokens, lang_code, lang_short)
                total += 1
    print(f"  Processed {total:,} historical sentence-tokenizations.")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    try:
        from codecarbon import EmissionsTracker
    except ImportError:
        print("ERROR: codecarbon is not installed.")
        print("Run:  python -m pip install codecarbon==2.7.2")
        sys.exit(1)

    STAGES = [
        ("evaluation_pipeline",  run_evaluation_pipeline),
        ("crosslingual_probing", run_crosslingual_probing),
        ("historical_analysis",  run_historical_analysis),
    ]

    print(f"\nCodeCarbon emissions collection")
    print(f"Output → {os.path.join(EMISSIONS_DIR, 'emissions.csv')}\n")

    for experiment_id, fn in STAGES:
        print(f"[{experiment_id}]")
        tracker = EmissionsTracker(
            project_name="indic_tokenizer_eval",
            experiment_id=experiment_id,
            output_dir=EMISSIONS_DIR,
            log_level="warning",
            save_to_file=True,
            save_to_api=False,
            allow_multiple_runs=True,
        )
        tracker.start()
        try:
            fn()
        finally:
            emissions = tracker.stop()
        print(f"  ✓ emissions: {emissions * 1000:.6f} g CO₂-eq\n")

    print("Done.  Reload the Energy tab in the UI to see the results.")


if __name__ == "__main__":
    main()
