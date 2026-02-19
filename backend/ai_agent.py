import concurrent.futures
import datetime
import json
import logging
import os
import random
import re
import time
import uuid
from functools import lru_cache
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from duckduckgo_search import DDGS
from google import genai
from google.genai import types

load_dotenv()
logger = logging.getLogger(__name__)

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

if not client:
    logger.critical("GEMINI_API_KEY missing, AI features will fail")

MODEL_FAST = "gemini-2.5-flash"


def generate_with_retry(model: str, prompt: str, config: types.GenerateContentConfig, retries: int = 3):
    for i in range(retries):
        try:
            return client.models.generate_content(model=model, contents=prompt, config=config)
        except Exception as e:
            error_msg = str(e)
            retryable = ("429" in error_msg) or ("RESOURCE_EXHAUSTED" in error_msg) or ("503" in error_msg)
            if not retryable:
                raise
            if i == retries - 1:
                raise
            sleep_time = (2 ** (i + 1)) + random.uniform(0.5, 1.5)
            time.sleep(sleep_time)


def clean_json_text(text: str) -> str:
    if not text:
        return "{}"
    cleaned = text.strip()

    if "```" in cleaned:
        parts = cleaned.split("```")
        if len(parts) >= 3:
            content = parts[1]
            if content.startswith("json"):
                content = content[4:]
            cleaned = content.strip()

    if not (cleaned.startswith("{") or cleaned.startswith("[")):
        match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
        if match:
            cleaned = match.group(0)

    return cleaned


class ResourceCurator:
    BLOCKLIST_TOKENS = (
        "geeksforgeeks",
        "w3schools",
        "tutorialspoint",
        "javatpoint",
        "studytonight",
        "quora",
        "chegg",
        "brainly",
        "scribd",
        "slideshare",
        "coursehero",
        "pdfcoffee",
        "pdfdrive",
        "pastebin",
        "medium.com",
        "dev.to",
        "hashnode",
        "freecodecamp.org/news",
    )

    TYPE_PREFER = {
        "doc": (
            "docs.python.org",
            "developer.mozilla.org",
            "learn.microsoft.com",
            "kubernetes.io",
            "postgresql.org",
            "nodejs.org",
            "react.dev",
            "fastapi.tiangolo.com",
            "docs.aws.amazon.com",
            "cloud.google.com",
        ),
        "deep_dive": (
            "martinfowler.com",
            "cloudflare.com",
            "aws.amazon.com",
            "engineering.fb.com",
            "netflixtechblog.com",
            "uber.com",
            "github.blog",
            "highscalability.com",
        ),
        "video": (
            "youtube.com",
            "youtu.be",
            "vimeo.com",
        ),
        "repo": (
            "github.com",
        ),
        "interactive": (
            "exercism.org",
            "codewars.com",
            "leetcode.com",
            "hackerrank.com",
            "developer.mozilla.org",
            "react.dev",
        ),
    }

    TYPE_KEY_NORMALISE = {
        "doc": "doc",
        "documentation": "doc",
        "deep dive": "deep_dive",
        "deep_dive": "deep_dive",
        "article": "deep_dive",
        "video": "video",
        "talk": "video",
        "repo": "repo",
        "repository": "repo",
        "interactive": "interactive",
        "playground": "interactive",
    }

    @staticmethod
    def _domain(url: str) -> str:
        try:
            parsed = urlparse(url)
            host = (parsed.netloc or "").lower()
            if host.startswith("www."):
                host = host[4:]
            return host
        except Exception:
            return ""

    @staticmethod
    def _platform(url: str) -> str:
        u = (url or "").lower()
        if "youtube.com" in u or "youtu.be" in u or "vimeo.com" in u:
            return "YouTube"
        if "github.com" in u:
            return "GitHub"
        return "Web"

    @staticmethod
    def _looks_low_quality(url: str) -> bool:
        u = (url or "").lower()
        return any(tok in u for tok in ResourceCurator.BLOCKLIST_TOKENS)

    @staticmethod
    def _score_url(res_type: str, url: str, title: str = "") -> int:
        if not url:
            return 0
        u = url.lower()
        if ResourceCurator._looks_low_quality(u):
            return 5

        score = 35
        dom = ResourceCurator._domain(u)
        prefer = ResourceCurator.TYPE_PREFER.get(res_type, ())

        if any(dom.endswith(p) for p in prefer):
            score += 45

        if res_type == "repo" and "github.com" in u:
            score += 25

        if res_type == "video" and ("youtube.com" in u or "youtu.be" in u or "vimeo.com" in u):
            score += 20

        if res_type == "doc" and ("docs" in dom or "developer" in dom):
            score += 10

        if "utm_" in u:
            score -= 5

        if len(title) >= 8:
            score += 5

        if score < 0:
            score = 0
        if score > 100:
            score = 100
        return score

    @staticmethod
    @lru_cache(maxsize=900)
    def _ddg_text(query: str, max_results: int = 8) -> List[Dict[str, Any]]:
        time.sleep(random.uniform(0.7, 2.0))
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))

    @staticmethod
    @lru_cache(maxsize=900)
    def _ddg_videos(query: str, max_results: int = 8) -> List[Dict[str, Any]]:
        time.sleep(random.uniform(0.7, 2.0))
        with DDGS() as ddgs:
            return list(ddgs.videos(query, max_results=max_results))

    @staticmethod
    def _pick_best_candidate(res_type: str, query: str, title_hint: str) -> Optional[Dict[str, Any]]:
        try:
            candidates = []
            if res_type == "video":
                results = ResourceCurator._ddg_videos(query, 8)
                for r in results:
                    url = (r.get("content") or "").strip()
                    if not url or ResourceCurator._looks_low_quality(url):
                        continue
                    score = ResourceCurator._score_url(res_type, url, title_hint)
                    candidates.append((score, url))
            else:
                results = ResourceCurator._ddg_text(query, 8)
                for r in results:
                    url = (r.get("href") or "").strip()
                    if not url or ResourceCurator._looks_low_quality(url):
                        continue
                    score = ResourceCurator._score_url(res_type, url, title_hint)
                    candidates.append((score, url))

            if not candidates:
                return None

            candidates.sort(key=lambda x: x[0], reverse=True)
            best_score, best_url = candidates[0]
            provider = ResourceCurator._domain(best_url)
            return {"url": best_url, "provider": provider, "quality_score": int(best_score)}
        except Exception as e:
            logger.warning(f"candidate pick failed: {e}")
            return None

    @staticmethod
    def _normalise_type(t: str) -> str:
        raw = (t or "").strip().lower()
        return ResourceCurator.TYPE_KEY_NORMALISE.get(raw, raw if raw in ResourceCurator.TYPE_PREFER else "deep_dive")

    @staticmethod
    def _ensure_diversity(items: List[Dict[str, Any]], target_count: int) -> List[Dict[str, Any]]:
        seen_url = set()
        seen_domain = set()
        platform_counts: Dict[str, int] = {}
        out: List[Dict[str, Any]] = []

        for it in items:
            url = it.get("meta", {}).get("url") or ""
            dom = ResourceCurator._domain(url)
            plat = it.get("meta", {}).get("platform") or "Web"

            if not url or url in seen_url:
                continue

            if dom and dom in seen_domain and len(out) < target_count:
                if len(out) < max(3, target_count // 2):
                    continue

            plat_count = platform_counts.get(plat, 0)
            if plat == "YouTube" and plat_count >= max(2, target_count // 4):
                continue
            if plat == "GitHub" and plat_count >= 2:
                continue

            seen_url.add(url)
            if dom:
                seen_domain.add(dom)
            platform_counts[plat] = plat_count + 1
            out.append(it)

            if len(out) >= target_count:
                break

        return out

    @staticmethod
    def _fallback_pack(skill: str) -> List[Dict[str, Any]]:
        s = (skill or "").strip()
        google_query = f"https://www.google.com/search?q={s.replace(' ', '+')}"
        return [
            {
                "type": "doc",
                "title": f"{s} official documentation",
                "description": "Start with the canonical reference so terminology and APIs are correct.",
                "estimated_minutes": 45,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 50},
            },
            {
                "type": "deep_dive",
                "title": f"{s} engineering deep dive",
                "description": "A conceptual explanation that focuses on why trade offs exist.",
                "estimated_minutes": 35,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 45},
            },
            {
                "type": "video",
                "title": f"{s} conference talk",
                "description": "A talk that frames the mental model and common pitfalls.",
                "estimated_minutes": 40,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 40},
            },
            {
                "type": "repo",
                "title": f"{s} reference implementation repo",
                "description": "A well structured repository you can read and clone.",
                "estimated_minutes": 30,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 40},
            },
            {
                "type": "interactive",
                "title": f"{s} interactive practice",
                "description": "Hands on practice to confirm you can apply the concept.",
                "estimated_minutes": 30,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 40},
            },
        ]

    @staticmethod
    def curate_resources(skill: str, level: str, style: str) -> List[Dict[str, Any]]:
        if not client:
            return []

        target_count = 10

        prompt = f"""
        ACT AS: Senior staff engineer.
        TASK: Curate {target_count} high quality resources for learning "{skill}" at level "{level}" for a "{style}" learner.

        RULES
        1 Avoid low quality tutorial spam sites and generic blogs.
        2 Prefer official documentation, respected engineering blogs, reputable conference talks, and strong repositories.
        3 Ensure diversity across providers and formats.
        4 Return a balanced mix with at least 3 docs, 3 deep dives, 2 videos, 1 repo, 1 interactive.

        OUTPUT JSON ARRAY
        [
          {{
            "type": "Doc" | "Deep Dive" | "Video" | "Repo" | "Interactive",
            "title": "Specific title",
            "description": "One sentence on why it is good",
            "search_query": "Precise query that finds the canonical source",
            "estimated_minutes": 15 to 180
          }}
        ]
        """

        try:
            response = generate_with_retry(
                model=MODEL_FAST,
                prompt=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            raw = json.loads(clean_json_text(response.text))
            if not isinstance(raw, list):
                return []

            cleaned_items: List[Dict[str, Any]] = []
            for r in raw:
                if not isinstance(r, dict):
                    continue
                t = ResourceCurator._normalise_type(str(r.get("type", "")))
                title = str(r.get("title", "")).strip()
                desc = str(r.get("description", "")).strip()
                query = str(r.get("search_query") or title or skill).strip()
                mins = r.get("estimated_minutes", 30)
                try:
                    mins_int = int(mins)
                except Exception:
                    mins_int = 30
                mins_int = max(10, min(240, mins_int))

                cleaned_items.append(
                    {"type": t, "title": title, "description": desc, "estimated_minutes": mins_int, "search_query": query}
                )

            final_resources: List[Dict[str, Any]] = []
            for item in cleaned_items:
                res_type = item["type"]
                title = item["title"]
                query = item["search_query"]

                candidate = ResourceCurator._pick_best_candidate(res_type, query, title)
                if not candidate:
                    continue

                url = candidate["url"]
                platform = ResourceCurator._platform(url)
                provider = candidate["provider"] or platform
                qscore = candidate["quality_score"]

                final_resources.append(
                    {
                        "type": res_type,
                        "title": title,
                        "description": item["description"],
                        "estimated_minutes": item["estimated_minutes"],
                        "meta": {"url": url, "platform": platform, "provider": provider, "quality_score": qscore},
                    }
                )

            final_resources.sort(key=lambda x: int(x.get("meta", {}).get("quality_score", 0)), reverse=True)
            final_resources = ResourceCurator._ensure_diversity(final_resources, target_count)

            if len(final_resources) >= 6:
                return final_resources

            merged = final_resources + ResourceCurator._fallback_pack(skill)
            merged = ResourceCurator._ensure_diversity(merged, target_count)
            return merged

        except Exception as e:
            logger.error(f"resource curation failed for {skill}: {e}")
            return ResourceCurator._ensure_diversity(ResourceCurator._fallback_pack(skill), 10)


@lru_cache(maxsize=80)
def extract_skills_from_jd(description: str) -> List[Dict[str, Any]]:
    if not client:
        raise RuntimeError("API key missing")

    prompt = f"""
    ROLE: Technical recruiter.
    TASK: Extract technical skills from the job description.
    INSTRUCTIONS
    1 Ignore soft skills unless they are methodologies such as Agile or Scrum
    2 Categorise strictly as Language, Framework, Tool, Concept, Database, Cloud

    INPUT: {description[:20000]}

    OUTPUT JSON: {{ "skills": [ {{ "skill": "React", "category": "Framework", "importance": "Critical" }} ] }}
    """

    try:
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = json.loads(clean_json_text(response.text))
        if isinstance(data, dict):
            skills = data.get("skills", [])
            return skills if isinstance(skills, list) else []
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []


def get_ai_analysis(role: str, skill: str, current: int, target: int) -> Dict[str, Any]:
    gap = target - current
    if gap >= 3:
        priority = "High"
    elif gap == 2:
        priority = "Medium"
    else:
        priority = "Low"
    estimated_hours = max(1, 2 + (gap * 2))
    return {"priority": priority, "estimated_hours": estimated_hours}


def process_gap(gap: Dict[str, Any], prefs: Any) -> Dict[str, Any]:
    skill_name = gap.get("skill_name") or "Topic"
    time.sleep(random.uniform(0.2, 0.9))

    resources = ResourceCurator.curate_resources(
        skill_name,
        getattr(prefs, "experienceLevel", "Mid"),
        getattr(prefs, "learningStyle", "Visual"),
    )

    return {"skill_name": skill_name, "gap_hours": float(gap.get("estimated_hours", 5)), "resources": resources}


def generate_dynamic_roadmap(gaps: List[Dict[str, Any]], prefs: Any) -> List[Dict[str, Any]]:
    hours_per_week = int(getattr(prefs, "hoursPerWeek", 10) or 10)
    hours_per_week = max(1, hours_per_week)

    priority_rank = {"High": 0, "Medium": 1, "Low": 2}
    gaps.sort(key=lambda g: (priority_rank.get(g.get("priority", "Medium"), 9), -float(g.get("estimated_hours", 0))))

    current_date = datetime.datetime.now()
    phase_counter = 1

    results: List[Dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(process_gap, gap, prefs) for gap in gaps]
        for f in concurrent.futures.as_completed(futures):
            try:
                results.append(f.result())
            except Exception as e:
                logger.error(f"Gap processing error: {e}")

    skill_order = {g.get("skill_name"): i for i, g in enumerate(gaps)}
    results.sort(key=lambda x: skill_order.get(x.get("skill_name"), 999))

    roadmap: List[Dict[str, Any]] = []
    for res in results:
        days = max(1, round((res["gap_hours"] / hours_per_week) * 7))
        end_date = current_date + datetime.timedelta(days=days)

        tasks: List[Dict[str, Any]] = []
        for r in res.get("resources", []):
            meta = r.get("meta", {}) if isinstance(r.get("meta", {}), dict) else {}
            tasks.append(
                {
                    "id": str(uuid.uuid4()),
                    "type": r.get("type", "doc"),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "estimated_minutes": int(r.get("estimated_minutes", 30) or 30),
                    "xp_reward": 100,
                    "due_date": end_date.isoformat(),
                    "meta": meta,
                    "status": "Pending",
                }
            )

        focus = res.get("skill_name", "Skill")
        roadmap.append(
            {
                "week_number": phase_counter,
                "label": f"Module: {focus}",
                "focus_area": focus,
                "description": f"Master {focus} through high quality resources.",
                "tasks": tasks,
                "total_hours": round(float(res.get("gap_hours", 0)), 1),
                "start_date": current_date.strftime("%b %d"),
                "end_date": end_date.strftime("%b %d"),
                "is_locked": phase_counter > 1,
                "is_completed": False,
            }
        )

        current_date = end_date + datetime.timedelta(days=1)
        phase_counter += 1

    return roadmap


def generate_interview_response(history: List[Dict[str, str]], user_input: str, role: str, company: str) -> Dict[str, Any]:
    if not client:
        return {"text": "AI Offline"}

    system_instruction = f"""
    You are an expert technical interviewer for a {role} role at {company}.

    Protocol
    1 Analyse the candidate answer
    2 Give brief specific feedback
    3 If explaining architecture or flow include a Mermaid diagram block

    Candidate input: "{user_input}"
    Last turns: {json.dumps(history[-3:] if history else [])}

    Output JSON: {{ "text": "..." }}
    """

    try:
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=system_instruction,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(clean_json_text(response.text))
    except Exception as e:
        logger.error(f"Interview error: {e}")
        return {"text": "Could you go deeper into the technical implementation and trade offs"}


def generate_quiz(skill: str, level: str) -> List[Dict[str, Any]]:
    if not client:
        return []

    prompt = f"""
    TASK: Create a mini quiz for "{skill}" at level "{level}".
    OUTPUT: JSON array of 3 objects.

    FORMAT:
    [
      {{
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "correct_index": 0,
        "explanation": "..."
      }}
    ]
    """

    try:
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = json.loads(clean_json_text(response.text))
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Quiz error: {e}")
        return []


def grade_submission(title: str, requirements: str, user_input: str) -> Dict[str, Any]:
    if not client:
        return {"passed": True, "feedback": "AI Offline: Submission auto accepted."}

    prompt = f"""
    ACT AS: Senior tech lead.
    TASK: Evaluate a junior developer submission.

    Project title: {title}
    Requirements: {requirements}
    Submission: {user_input}

    Instructions
    1 If the submission is a valid GitHub or Replit link or a reasonable explanation pass it
    2 If nonsense or spam fail it
    3 Provide one sentence of constructive feedback

    OUTPUT JSON:
    {{
        "passed": boolean,
        "feedback": "string"
    }}
    """

    try:
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = json.loads(clean_json_text(response.text))
        if not isinstance(data, dict):
            return {"passed": True, "feedback": "Grading returned invalid format. Credit granted."}
        return {"passed": bool(data.get("passed", True)), "feedback": str(data.get("feedback", ""))}
    except Exception as e:
        logger.error(f"Grading error: {e}")
        return {"passed": True, "feedback": "Grading service unavailable. Credit granted."}


def interview_turn(history: List[Dict[str, Any]], user_input: str, role: str, company: str, context: str = "") -> Dict[str, Any]:
    if not client:
        return {"text": "AI Offline. Lets continue."}

    history_text = "\n".join([f"{m.get('role', 'unknown')}: {m.get('content', '')}" for m in history[-6:]])

    prompt = f"""
    ACT AS: Hiring manager at {company or "Tech Corp"} interviewing for {role}.
    Context: {context}

    History:
    {history_text}

    Candidate said: {user_input}

    Task
    1 If start introduce and ask first question
    2 Otherwise acknowledge briefly and ask a follow up or new question
    3 Keep under 50 words
    4 If explaining architecture or flow include a diagram trigger token [Image of X]

    Output raw text only
    """

    try:
        response = client.models.generate_content(model=MODEL_FAST, contents=prompt)
        return {"text": (response.text or "").strip()}
    except Exception as e:
        logger.error(f"Interview turn error: {e}")
        return {"text": "Ok. Lets move to the next topic."}


def interview_report(history: List[Dict[str, Any]], role: str) -> Dict[str, Any]:
    if not client:
        return {"overall_score": 0, "decision": "Error", "summary": "AI Offline"}

    transcript = "\n".join([f"{m.get('role', 'unknown')}: {m.get('content', '')}" for m in history])

    prompt = f"""
    ACT AS: Interview bar raiser.
    Analyse this interview transcript for a {role} position.

    Transcript:
    {transcript[:30000]}

    OUTPUT JSON:
    {{
        "overall_score": int,
        "decision": "HIRE" | "NO HIRE" | "STRONG HIRE" | "LEAN HIRE",
        "summary": "Two sentence executive summary",
        "strengths": ["a", "b", "c"],
        "weaknesses": ["a", "b", "c"]
    }}
    """

    try:
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = json.loads(clean_json_text(response.text))
        if not isinstance(data, dict):
            return {"overall_score": 0, "decision": "ERROR", "summary": "Invalid report format.", "strengths": [], "weaknesses": []}
        return {
            "overall_score": int(data.get("overall_score", 0) or 0),
            "decision": str(data.get("decision", "ERROR")),
            "summary": str(data.get("summary", "")),
            "strengths": data.get("strengths", []) if isinstance(data.get("strengths", []), list) else [],
            "weaknesses": data.get("weaknesses", []) if isinstance(data.get("weaknesses", []), list) else [],
        }
    except Exception as e:
        logger.error(f"Report error: {e}")
        return {"overall_score": 0, "decision": "ERROR", "summary": "Could not generate report.", "strengths": [], "weaknesses": []}
