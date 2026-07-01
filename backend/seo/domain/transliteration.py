"""Hebrew → Latin transliteration for URL slugs."""

import re
import unicodedata

# Common Hebrew letter mapping (ISO 259 / simplified)
_HEBREW_MAP = {
    "א": "",
    "ב": "b",
    "ג": "g",
    "ד": "d",
    "ה": "h",
    "ו": "v",
    "ז": "z",
    "ח": "ch",
    "ט": "t",
    "י": "y",
    "כ": "k",
    "ך": "k",
    "ל": "l",
    "מ": "m",
    "ם": "m",
    "נ": "n",
    "ן": "n",
    "ס": "s",
    "ע": "",
    "פ": "p",
    "ף": "p",
    "צ": "ts",
    "ץ": "ts",
    "ק": "k",
    "ר": "r",
    "ש": "sh",
    "ת": "t",
}


def transliterate_hebrew(text: str) -> str:
    result = []
    for char in text:
        if char in _HEBREW_MAP:
            result.append(_HEBREW_MAP[char])
        else:
            result.append(char)
    return "".join(result)


def slugify(text: str, *, max_length: int = 200) -> str:
    """Generate a URL-safe slug with Hebrew transliteration support."""
    if not text:
        return ""

    value = transliterate_hebrew(text.strip())
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"[-\s]+", "-", value.strip().lower())
    value = value.strip("-")

    if len(value) > max_length:
        value = value[:max_length].rstrip("-")

    return value or "page"
