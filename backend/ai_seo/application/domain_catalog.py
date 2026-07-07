DOMAIN_EN: dict[str, dict] = {
    "law": {"label": "Law", "keywords": ["lawyer", "legal advice", "civil lawsuit"]},
    "real_estate": {"label": "Real Estate", "keywords": ["homes for sale", "real estate investing", "mortgage"]},
    "insurance": {"label": "Insurance", "keywords": ["car insurance", "health insurance", "business insurance"]},
    "finance": {"label": "Finance", "keywords": ["loans", "financial planning", "investments"]},
    "medical": {"label": "Private Medicine", "keywords": ["specialist doctor", "private clinic", "doctor appointment"]},
    "dentistry": {"label": "Dentistry", "keywords": ["dentist", "orthodontics", "dental implants"]},
    "beauty": {"label": "Beauty & Aesthetics", "keywords": ["facial treatments", "laser hair removal", "medical aesthetics"]},
    "fitness": {"label": "Fitness & Health", "keywords": ["personal trainer", "workout plan", "weight loss"]},
    "home_services": {"label": "Home Services", "keywords": ["plumber", "electrician", "home renovation"]},
    "automotive": {"label": "Automotive", "keywords": ["auto repair", "vehicle inspection", "car insurance"]},
    "education": {"label": "Education & Courses", "keywords": ["online course", "certification program", "private lessons"]},
    "tourism": {"label": "Tourism & Travel", "keywords": ["vacation packages", "boutique hotel", "family travel"]},
    "restaurants": {"label": "Restaurants & Food", "keywords": ["recommended restaurant", "catering", "food delivery"]},
    "ecommerce": {"label": "E-commerce", "keywords": ["online shopping", "promotions", "online store"]},
    "b2b": {"label": "B2B & Business Services", "keywords": ["business consulting", "CRM system", "B2B services"]},
    "cyber": {"label": "Cyber & Technology", "keywords": ["information security", "IT services", "cybersecurity for business"]},
    "marketing": {"label": "Digital Marketing", "keywords": ["SEO", "Google Ads", "business marketing"]},
    "events": {"label": "Events", "keywords": ["event venue", "event production", "event photographer"]},
    "nonprofits": {"label": "Nonprofits", "keywords": ["donations", "nonprofit", "volunteering"]},
    "local_business": {"label": "Local Business", "keywords": ["local business", "service near me", "tradespeople"]},
    "sports": {
        "label": "Sports",
        "keywords": ["football", "Premier League", "Champions League", "soccer", "match report", "transfer news"],
    },
    "economy": {"label": "Economy", "keywords": ["economy", "stock market", "inflation", "interest rates"]},
    "current_affairs": {"label": "Current Affairs", "keywords": ["breaking news", "politics", "headlines"]},
    "world_news": {"label": "World News", "keywords": ["international news", "geopolitics", "Europe", "United States"]},
    "international_news": {
        "label": "International News Translation",
        "keywords": ["world news", "BBC", "Reuters", "CNN", "Guardian", "translate"],
    },
}


def localize_domain(domain: dict, locale: str) -> dict:
    if locale != "en":
        return domain
    en = DOMAIN_EN.get(domain.get("value", ""), {})
    return {
        **domain,
        "label": en.get("label") or domain.get("label", ""),
        "keywords": en.get("keywords") or domain.get("keywords", []),
    }


def batch_locales(data: dict) -> list[str]:
    locales = data.get("locales")
    if isinstance(locales, list) and locales:
        return [locale for locale in locales if locale in ("he", "en")]
    mode = data.get("content_locales", "both")
    if mode == "he":
        return ["he"]
    if mode == "en":
        return ["en"]
    return ["he", "en"]


DOMAIN_OPTIONS = [
    {"value": "law", "label": "משפט ופלילי", "keywords": ["עורך דין", "ייעוץ משפטי", "תביעה אזרחית"]},
    {"value": "real_estate", "label": "נדל\"ן", "keywords": ["דירות למכירה", "השקעות נדלן", "משכנתא"]},
    {"value": "insurance", "label": "ביטוח", "keywords": ["ביטוח רכב", "ביטוח בריאות", "ביטוח עסק"]},
    {"value": "finance", "label": "פיננסים", "keywords": ["הלוואות", "תכנון פיננסי", "השקעות"]},
    {"value": "medical", "label": "רפואה פרטית", "keywords": ["רופא מומחה", "קליניקה פרטית", "תור לרופא"]},
    {"value": "dentistry", "label": "רפואת שיניים", "keywords": ["רופא שיניים", "יישור שיניים", "השתלות שיניים"]},
    {"value": "beauty", "label": "יופי ואסתטיקה", "keywords": ["טיפולי פנים", "הסרת שיער", "אסתטיקה רפואית"]},
    {"value": "fitness", "label": "כושר ובריאות", "keywords": ["מאמן כושר", "תוכנית אימונים", "ירידה במשקל"]},
    {"value": "home_services", "label": "שירותים לבית", "keywords": ["אינסטלטור", "חשמלאי", "שיפוצים"]},
    {"value": "automotive", "label": "רכב", "keywords": ["מוסך", "טסט לרכב", "ביטוח רכב"]},
    {"value": "education", "label": "חינוך וקורסים", "keywords": ["קורס אונליין", "לימודי תעודה", "שיעורים פרטיים"]},
    {"value": "tourism", "label": "תיירות ונופש", "keywords": ["חופשה בישראל", "מלון בוטיק", "טיול משפחתי"]},
    {"value": "restaurants", "label": "מסעדות ואוכל", "keywords": ["מסעדה מומלצת", "קייטרינג", "משלוחי אוכל"]},
    {"value": "ecommerce", "label": "חנויות אונליין", "keywords": ["קניות אונליין", "מבצעים", "חנות אינטרנטית"]},
    {"value": "b2b", "label": "B2B ושירותים לעסקים", "keywords": ["ייעוץ עסקי", "מערכת CRM", "שירות לעסקים"]},
    {"value": "cyber", "label": "סייבר וטכנולוגיה", "keywords": ["אבטחת מידע", "שירותי IT", "סייבר לעסקים"]},
    {"value": "marketing", "label": "שיווק דיגיטלי", "keywords": ["קידום אתרים", "פרסום בגוגל", "שיווק לעסק"]},
    {"value": "events", "label": "אירועים", "keywords": ["אולם אירועים", "הפקת אירועים", "צלם אירועים"]},
    {"value": "nonprofits", "label": "עמותות", "keywords": ["תרומות", "עמותה", "התנדבות"]},
    {"value": "local_business", "label": "עסקים מקומיים", "keywords": ["עסק מקומי", "שירות קרוב אליי", "בעלי מקצוע"]},
    {"value": "sports", "label": "ספורט", "keywords": ["ספורט", "כדורגל", "ליגת העל", "אולימפיאדה", "משחק היום"]},
    {"value": "economy", "label": "כלכלה", "keywords": ["כלכלה", "שוק ההון", "בורסה", "אינפלציה", "ריבית בנק ישראל"]},
    {"value": "current_affairs", "label": "אקטואליה", "keywords": ["אקטואליה", "חדשות היום", "פוליטיקה", "ישראל", "מבזקים"]},
    {"value": "world_news", "label": "בעולם", "keywords": ["חדשות בעולם", "בינלאומי", "גיאופוליטיקה", "ארה\"ב", "אירופה"]},
    {
        "value": "international_news",
        "label": "תרגום חדשות בינלאומיות",
        "keywords": ["חדשות בעולם", "תרגום", "BBC", "Reuters", "CNN", "Guardian", "NYT"],
    },
]


def selected_domain_rows(values: list[str]) -> list[dict]:
    by_value = {item["value"]: item for item in DOMAIN_OPTIONS}
    return [by_value[v] for v in values if v in by_value]
