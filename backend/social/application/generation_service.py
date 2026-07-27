from __future__ import annotations

from typing import Any

from ai_seo.application.gemini_service import GeminiError, GeminiService
from social.domain.enums import SUPPORTED_PLATFORMS


def _fallback_campaign(payload: dict[str, Any]) -> dict[str, Any]:
    goal = (payload.get("goal") or "Grow Mendeles").strip()
    website = (payload.get("website_url") or "https://mendeles.com").strip()
    audience = (payload.get("target_audience") or "business owners").strip()
    ctype = payload.get("campaign_type") or "traffic"
    tone = payload.get("tone") or "professional"
    platforms = payload.get("platforms") or list(SUPPORTED_PLATFORMS)
    media_type = payload.get("media_type") or "image"

    title = f"{ctype.replace('_', ' ').title()} campaign for {audience}"
    main_idea = f"Position Mendeles as the smart way to achieve: {goal}"
    cta = f"Start free → {website}"
    base_tags = ["#Mendeles", "#AIMarketing", "#LeadGeneration", "#Growth"]

    captions = {}
    hashtags = {}
    if "linkedin" in platforms:
        captions["linkedin"] = (
            f"{main_idea}\n\n"
            f"Goal: {goal}\n"
            f"Built for {audience} who want clearer results with less busywork.\n\n"
            f"{cta}"
        )
        hashtags["linkedin"] = base_tags + ["#B2B", "#LinkedInMarketing"]
    if "instagram" in platforms:
        captions["instagram"] = (
            f"{main_idea} ✨\n\n"
            f"For {audience}.\n"
            f"{goal}\n\n"
            f"{cta}"
        )
        hashtags["instagram"] = base_tags + ["#InstagramMarketing", "#SocialMediaTips"]
    if "tiktok" in platforms:
        captions["tiktok"] = (
            f"POV: you finally automate lead gen 🚀\n"
            f"{goal}\n"
            f"{cta}"
        )
        hashtags["tiktok"] = base_tags + ["#TikTokMarketing", "#SaaS"]
    if "facebook" in platforms:
        captions["facebook"] = (
            f"{main_idea}\n\n"
            f"For {audience}: {goal}\n\n"
            f"{cta}"
        )
        hashtags["facebook"] = base_tags + ["#FacebookMarketing", "#SmallBusiness"]

    result = {
        "title": title,
        "main_idea": main_idea,
        "captions": captions,
        "hashtags": hashtags,
        "cta": cta,
        "media_prompt": (
            f"Professional {tone} marketing visual for {ctype} campaign. "
            f"Theme: {goal}. Audience: {audience}. Clean SaaS aesthetic, brand purple accents, no text clutter."
        ),
    }
    if media_type == "video":
        result["video_prompt"] = (
            f"Vertical 9:16 short video, {tone} tone, {ctype} style. "
            f"Hook in first 2 seconds about {goal}. End screen with CTA to {website}."
        )
    return result


class CampaignGenerationService:
    @staticmethod
    def generate(payload: dict[str, Any], *, tenant_id=None) -> dict[str, Any]:
        platforms = [p for p in (payload.get("platforms") or []) if p in SUPPORTED_PLATFORMS]
        if not platforms:
            platforms = list(SUPPORTED_PLATFORMS)
        payload = {**payload, "platforms": platforms}

        if not GeminiService.configured(tenant_id=tenant_id):
            return _fallback_campaign(payload)

        media_type = payload.get("media_type") or "image"
        prompt = f"""
You are an expert social media strategist for Mendeles, an AI lead-generation SaaS.
Create a multi-platform campaign as JSON only.

Campaign goal: {payload.get("goal", "")}
Campaign type: {payload.get("campaign_type", "traffic")}
Tone: {payload.get("tone", "professional")}
Target audience: {payload.get("target_audience", "")}
Website URL: {payload.get("website_url", "https://mendeles.com")}
Media type: {media_type}
Platforms: {", ".join(platforms)}

Return JSON with this exact shape:
{{
  "title": "short campaign title",
  "main_idea": "1-2 sentence core idea",
  "captions": {{
    "linkedin": "LinkedIn caption (professional, line breaks ok)",
    "instagram": "Instagram caption",
    "tiktok": "TikTok caption (short, punchy)",
    "facebook": "Facebook Page caption (engaging, clear CTA)"
  }},
  "hashtags": {{
    "linkedin": ["#Tag1", "#Tag2"],
    "instagram": ["#Tag1", "#Tag2"],
    "tiktok": ["#Tag1", "#Tag2"],
    "facebook": ["#Tag1", "#Tag2"]
  }},
  "cta": "clear call to action with URL if relevant",
  "media_prompt": "detailed AI image prompt",
  "video_prompt": "detailed AI video prompt or empty string if media is image"
}}

Only include caption/hashtag keys for selected platforms: {platforms}.
Keep captions native to each platform. Hebrew or English to match the goal language.
"""
        try:
            data = GeminiService.generate_json(prompt, tenant_id=tenant_id)
        except GeminiError:
            return _fallback_campaign(payload)

        captions = data.get("captions") if isinstance(data.get("captions"), dict) else {}
        hashtags = data.get("hashtags") if isinstance(data.get("hashtags"), dict) else {}
        out = {
            "title": str(data.get("title") or "").strip() or _fallback_campaign(payload)["title"],
            "main_idea": str(data.get("main_idea") or "").strip(),
            "captions": {k: str(v) for k, v in captions.items() if k in platforms},
            "hashtags": {
                k: [str(t) for t in (v or [])][:12]
                for k, v in hashtags.items()
                if k in platforms and isinstance(v, list)
            },
            "cta": str(data.get("cta") or "").strip(),
            "media_prompt": str(data.get("media_prompt") or "").strip(),
            "video_prompt": str(data.get("video_prompt") or "").strip() if media_type == "video" else "",
        }
        # Ensure every selected platform has content
        fallback = _fallback_campaign(payload)
        for p in platforms:
            out["captions"].setdefault(p, fallback["captions"].get(p, ""))
            out["hashtags"].setdefault(p, fallback["hashtags"].get(p, []))
        if not out["media_prompt"]:
            out["media_prompt"] = fallback["media_prompt"]
        if media_type == "video" and not out["video_prompt"]:
            out["video_prompt"] = fallback.get("video_prompt", "")
        return out
