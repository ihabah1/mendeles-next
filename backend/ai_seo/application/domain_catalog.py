DOMAIN_OPTIONS = [
    {"value": "law", "label": "עריכת דין", "keywords": ["עורך דין", "ייעוץ משפטי", "תביעה אזרחית"]},
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
]


def selected_domain_rows(values: list[str]) -> list[dict]:
    by_value = {item["value"]: item for item in DOMAIN_OPTIONS}
    return [by_value[v] for v in values if v in by_value]
