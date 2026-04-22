import concurrent.futures
import datetime
import io
import json
import logging
import os
import random
import re
import time
import traceback
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from sqlalchemy.orm import Session, joinedload
from backend import models 
import pdfplumber
from dotenv import load_dotenv
from duckduckgo_search import DDGS
from google import genai
from google.genai import types
from supabase import Client, create_client

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

if not client:
    logger.critical("GEMINI_API_KEY missing, AI features will fail")

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase_client: Optional[Client] = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

MODEL_FAST = "gemini-2.5-flash"
CV_MODEL = "gemini-2.5-flash"

def map_1_10_to_1_5(x: int) -> int:
    x = max(1, min(10, int(x)))
    return 1 + (x - 1) * 4 // 9

def generate_with_retry(model: str, prompt: str, config: types.GenerateContentConfig, retries: int = 3):
    last_error = None

    for i in range(retries):
        try:
            return client.models.generate_content(model=model, contents=prompt, config=config)
        except Exception as e:
            last_error = e
            error_msg = str(e)
            retryable = ("429" in error_msg) or ("RESOURCE_EXHAUSTED" in error_msg) or ("503" in error_msg) or ("UNAVAILABLE" in error_msg)

            if not retryable:
                raise

            if i < retries - 1:
                sleep_time = (2 ** i) + random.uniform(0.5, 1.0)
                time.sleep(sleep_time)

    raise UpstreamAIUnavailable(f"Gemini temporarily unavailable after {retries} attempts: {last_error}")



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
        "geeksforgeeks", "w3schools", "tutorialspoint", "javatpoint",
        "studytonight", "quora", "chegg", "brainly", "scribd",
        "slideshare", "coursehero", "pdfcoffee", "pdfdrive",
        "pastebin", "medium.com", "dev.to", "hashnode",
        "freecodecamp.org/news", "csdn.net", "zhihu.com",
        "qiita.com", "juejin.cn", "cnblogs.com", "bilibili.com"
    )

    BLOCK_IFRAME_DOMAINS = (
        "github.com", "figma.com", "developer.mozilla.org",
        "stackoverflow.com", "medium.com", "youtube.com",
        "youtu.be", "amazon.com", "amazon.co.uk", "oreilly.com",
        "goodreads.com", "manning.com"
    )

    TYPE_PREFER = {
        "doc": (
            "docs.python.org", "developer.mozilla.org", "learn.microsoft.com",
            "kubernetes.io", "postgresql.org", "nodejs.org", "react.dev",
            "fastapi.tiangolo.com", "docs.aws.amazon.com", "cloud.google.com",
        ),
        "deep_dive": (
            "martinfowler.com", "cloudflare.com", "aws.amazon.com",
            "engineering.fb.com", "netflixtechblog.com", "uber.com",
            "github.blog", "highscalability.com",
        ),
        "video": ("youtube.com", "youtu.be", "vimeo.com",),
        "repo": ("github.com",),
        "interactive": (
            "exercism.org", "codewars.com", "leetcode.com",
            "hackerrank.com", "developer.mozilla.org", "react.dev",
        ),
        "book": (
            "amazon.com", "amazon.co.uk", "oreilly.com",
            "manning.com", "nostarch.com", "goodreads.com",
        )
    }

    TYPE_KEY_NORMALISE = {
        "doc": "doc", "documentation": "doc",
        "deep dive": "deep_dive", "deep_dive": "deep_dive",
        "article": "deep_dive", "video": "video",
        "talk": "video", "repo": "repo",
        "repository": "repo", "interactive": "interactive",
        "playground": "interactive", "book": "book",
        "textbook": "book", "guide": "book"
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
        if "amazon." in u:
            return "Amazon"
        return "Web"

    @staticmethod
    def _looks_low_quality(url: str, title: str = "", body: str = "") -> bool:
        u = (url or "").lower()
        if any(tok in u for tok in ResourceCurator.BLOCKLIST_TOKENS):
            return True

        combined_text = f"{title} {body}"
        if re.search(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7a3]', combined_text):
            return True

        if "youtube.com" in u and not any(valid in u for valid in ["watch?v=", "playlist?list=", "embed/", "shorts/"]):
            return True

        return False

    @staticmethod
    def _score_url(res_type: str, url: str, title: str = "") -> int:
        if not url:
            return 0
        u = url.lower()
        if ResourceCurator._looks_low_quality(u, title):
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

        if res_type == "book" and ("amazon." in dom or "oreilly" in dom):
            score += 20

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
            return list(ddgs.text(query, region="uk-en", max_results=max_results))

    @staticmethod
    @lru_cache(maxsize=900)
    def _ddg_videos(query: str, max_results: int = 8) -> List[Dict[str, Any]]:
        time.sleep(random.uniform(0.7, 2.0))
        with DDGS() as ddgs:
            return list(ddgs.videos(query, region="uk-en", max_results=max_results))

    @staticmethod
    def _pick_best_candidate(res_type: str, query: str, title_hint: str) -> Optional[Dict[str, Any]]:
        try:
            candidates = []
            safe_query = f"{query} english"

            if res_type == "video":
                results = ResourceCurator._ddg_videos(safe_query, 8)
                for r in results:
                    url = (r.get("content") or "").strip()
                    title = (r.get("title") or "").strip()
                    if not url or ResourceCurator._looks_low_quality(url, title):
                        continue
                    score = ResourceCurator._score_url(res_type, url, title_hint)
                    candidates.append((score, url))
            else:
                results = ResourceCurator._ddg_text(safe_query, 8)
                for r in results:
                    url = (r.get("href") or "").strip()
                    title = (r.get("title") or "").strip()
                    body = (r.get("body") or "").strip()
                    if not url or ResourceCurator._looks_low_quality(url, title, body):
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
        google_query = f"https://www.google.com/search?q={s.replace(' ', '+')}+documentation+english"
        book_query = f"https://www.amazon.co.uk/s?k={s.replace(' ', '+')}+programming+book"
        return [
            {
                "type": "doc",
                "title": f"{s} official documentation",
                "description": "Start with the canonical reference so terminology and APIs are correct.",
                "estimated_minutes": 45,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 50, "iframe_safe": False},
            },
            {
                "type": "deep_dive",
                "title": f"{s} engineering deep dive",
                "description": "A conceptual explanation that focuses on why trade offs exist.",
                "estimated_minutes": 35,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 45, "iframe_safe": False},
            },
            {
                "type": "video",
                "title": f"{s} conference talk",
                "description": "A talk that frames the mental model and common pitfalls.",
                "estimated_minutes": 40,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 40, "iframe_safe": False},
            },
            {
                "type": "repo",
                "title": f"{s} reference implementation repo",
                "description": "A well structured repository you can read and clone.",
                "estimated_minutes": 30,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 40, "iframe_safe": False},
            },
            {
                "type": "interactive",
                "title": f"{s} interactive practice",
                "description": "Hands on practice to confirm you can apply the concept.",
                "estimated_minutes": 30,
                "meta": {"url": google_query, "platform": "Web", "provider": "Search", "quality_score": 40, "iframe_safe": False},
            },
            {
                "type": "book",
                "title": f"{s} authoritative book",
                "description": "A comprehensive guide for deep foundational understanding.",
                "estimated_minutes": 120,
                "meta": {"url": book_query, "platform": "Amazon", "provider": "Search", "quality_score": 40, "iframe_safe": False},
            }
        ]

    @staticmethod
    def curate_from_db(skill: str, target_count: int = 10) -> List[Dict[str, Any]]:
        clean_skill = skill.strip().lower()
        if not supabase_client:
            return []

        try:
            response = supabase_client.table("resources").select("*").eq("skill_name", clean_skill).order("quality_score", desc=True).execute()
            if not response.data:
                return []
                
            db_items = []
            for row in response.data:
                db_items.append({
                    "id": str(row.get("id")),
                    "type": row.get("type", "doc"),
                    "title": row.get("title", ""),
                    "description": row.get("description", ""),
                    "estimated_minutes": row.get("estimated_minutes", 30),
                    "meta": {
                        "url": row.get("url", ""),
                        "platform": row.get("platform", "Web"),
                        "provider": row.get("provider", "Web"),
                        "quality_score": row.get("quality_score", 50),
                        "iframe_safe": row.get("iframe_safe", False)
                    }
                })
            return ResourceCurator._ensure_diversity(db_items, target_count)
        except Exception as e:
            logger.error(f"Database fetch failed for {skill}: {e}")
            return []

    @staticmethod
    def curate_from_ai(skill: str, level: str, style: str, target_count: int = 10) -> List[Dict[str, Any]]:
        clean_skill = skill.strip().lower()

        if not client:
            return []

        prompt = f"""
        ACT AS: Senior staff engineer.
        TASK: Curate {target_count} high quality resources for learning "{skill}" at level "{level}" for a "{style}" learner.

        RULES
        1 Avoid low quality tutorial spam sites and generic blogs.
        2 Prefer official documentation, respected engineering blogs, reputable conference talks, and strong repositories.
        3 Ensure diversity across providers and formats.
        4 Return a balanced mix with at least 3 docs, 2 deep dives, 2 videos, 1 repo, 1 interactive, 1 book.
        5 All returned resources and search queries must be strictly in English.

        OUTPUT JSON ARRAY
        [
          {{
            "type": "Doc" | "Deep Dive" | "Video" | "Repo" | "Interactive" | "Book",
            "title": "Specific title",
            "description": "One sentence on why it is good",
            "search_query": "Precise English query that finds the canonical source",
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
                iframe_safe = not any(tok in url.lower() for tok in ResourceCurator.BLOCK_IFRAME_DOMAINS)

                final_resources.append(
                    {
                        "type": res_type,
                        "title": title,
                        "description": item["description"],
                        "estimated_minutes": item["estimated_minutes"],
                        "meta": {"url": url, "platform": platform, "provider": provider, "quality_score": qscore, "iframe_safe": iframe_safe},
                    }
                )

            final_resources.sort(key=lambda x: int(x.get("meta", {}).get("quality_score", 0)), reverse=True)
            final_resources = ResourceCurator._ensure_diversity(final_resources, target_count)

            merged = final_resources
            if len(final_resources) < 6:
                merged = final_resources + ResourceCurator._fallback_pack(skill)
                merged = ResourceCurator._ensure_diversity(merged, target_count)

            if supabase_client and merged:
                try:
                    records = []
                    for m in merged:
                        records.append({
                            "skill_name": clean_skill,
                            "type": m["type"],
                            "title": m["title"],
                            "description": m["description"],
                            "url": m["meta"]["url"],
                            "platform": m["meta"]["platform"],
                            "provider": m["meta"]["provider"],
                            "estimated_minutes": m["estimated_minutes"],
                            "quality_score": m["meta"]["quality_score"],
                            "iframe_safe": m["meta"]["iframe_safe"],
                            "is_verified": False
                        })
                    supabase_client.table("resources").upsert(records, on_conflict="url").execute()
                except Exception as e:
                    logger.error(f"Database insert failed: {e}")

            return merged

        except Exception as e:
            logger.error(f"resource curation failed for {skill}: {e}")
            return ResourceCurator._ensure_diversity(ResourceCurator._fallback_pack(skill), target_count)

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

def process_gap(gap: Dict[str, Any], prefs: Any, use_db: bool = True) -> Dict[str, Any]:
    skill_name = gap.get("skill_name") or "Topic"
    
    if use_db:
        resources = ResourceCurator.curate_from_db(skill_name, 10)
        if len(resources) < 3:
            time.sleep(random.uniform(0.2, 0.9))
            resources = ResourceCurator.curate_from_ai(
                skill_name,
                getattr(prefs, "experienceLevel", "Mid"),
                getattr(prefs, "learningStyle", "Visual"),
            )
    else:
        time.sleep(random.uniform(0.2, 0.9))
        resources = ResourceCurator.curate_from_ai(
            skill_name,
            getattr(prefs, "experienceLevel", "Mid"),
            getattr(prefs, "learningStyle", "Visual"),
        )

    return {"skill_name": skill_name, "gap_hours": float(gap.get("estimated_hours", 5)), "resources": resources}

def generate_dynamic_roadmap(gaps: List[Dict[str, Any]], prefs: Any, use_db: bool = True) -> List[Dict[str, Any]]:
    hours_per_week = int(getattr(prefs, "hoursPerWeek", 10) or 10)
    hours_per_week = max(1, hours_per_week)

    priority_rank = {"High": 0, "Medium": 1, "Low": 2}
    gaps.sort(key=lambda g: (priority_rank.get(g.get("priority", "Medium"), 9), -float(g.get("estimated_hours", 0))))

    current_date = datetime.datetime.now()
    phase_counter = 1

    results: List[Dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(process_gap, gap, prefs, use_db) for gap in gaps]
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
                    "id": r.get("id") or str(uuid.uuid4()),
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
                "description": f"Master {focus} through curated theory, media, and practical application.",
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
    ACT AS: Senior engineering reviewer.

    TASK: Evaluate a junior developer submission.

    PROJECT: {title}
    REQUIREMENTS: {requirements}
    SUBMISSION: {user_input}

    RULES:
    1 If submission is a valid link, explanation, or structured attempt pass it
    2 If vague, irrelevant, or spam fail it
    3 Be strict but fair
    4 Focus on engineering reasoning, not formatting

    OUTPUT JSON:
    {{
      "passed": boolean,
      "feedback": "one clear constructive sentence"
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
            return {"passed": True, "feedback": "Invalid format, credit granted."}
        return {
            "passed": bool(data.get("passed", True)),
            "feedback": str(data.get("feedback", ""))
        }
    except Exception as e:
        logger.error(f"Grading error: {e}")
        return {"passed": True, "feedback": "Grading unavailable. Credit granted."}

def interview_turn(history: List[Dict[str, Any]], user_input: str, role: str, company: str, context: str = "") -> Dict[str, Any]:
    if not client:
        return {"text": "AI Offline. Let us continue.", "evaluation": "N/A"}

    is_first_turn = len(history) == 0 or user_input == "START_INTERVIEW"

    compressed_history = []
    for i in range(0, len(history[-6:]), 2):
        if i + 1 < len(history[-6:]):
            q = history[-6:][i].get('content', '')
            a = history[-6:][i+1].get('content', '')
            compressed_history.append(f"Q: {q}\nA: {a}")
    
    history_text = "\n\n".join(compressed_history)

    if is_first_turn:
        prompt = f"""
        ACT AS: Expert technical hiring manager at {company or "Tech Corp"} interviewing for {role}.
        CONTEXT & PERSONA: {context}

        TASK:
        This is Turn 1. The interview is just starting.
        1. Introduce yourself briefly.
        2. Ask the very first technical question based on the role and context.
        3. Do not evaluate anything yet.
        
        CONSTRAINTS:
        Keep spoken text strictly under 50 words.
        Ask exactly one question.
        Provide output in strictly formatted JSON.

        OUTPUT JSON:
        {{
            "evaluation": "Initialising session",
            "text": "The spoken introduction and first question"
        }}
        """
    else:
        prompt = f"""
        ACT AS: Expert technical hiring manager at {company or "Tech Corp"} interviewing for {role}.
        CONTEXT & PERSONA: {context}

        RECENT HISTORY:
        {history_text}

        CANDIDATE ANSWER: {user_input}

        TASK:
        This is a continuation of the interview.
        1. Assess the candidate's answer internally.
        2. Acknowledge the answer naturally, give brief specific feedback, and ask the next relevant technical question.
        
        CONSTRAINTS:
        "evaluation" field must be strictly under 12 words, grading correctness, depth, and clarity.
        "text" field must be strictly under 50 words.
        Ask exactly one question.
        If explaining architecture or flow, include 

[Image of system architecture diagram]
.
        Provide output in strictly formatted JSON.

        OUTPUT JSON:
        {{
            "evaluation": "Internal rubric assessment",
            "text": "The spoken response and next question"
        }}
        """

    try:
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = json.loads(clean_json_text(response.text))
        return {
            "text": str(data.get("text", "Let us move to the next topic.")),
            "evaluation": str(data.get("evaluation", "Candidate response captured."))
        }
    except Exception as e:
        logger.error(f"Interview turn error: {e}")
        return {"text": "Could you go deeper into the technical implementation and trade offs?", "evaluation": "Error parsing evaluation."}

def interview_report(history: List[Dict[str, Any]], role: str) -> Dict[str, Any]:
    if not client:
        return {
            "overall_score": 0,
            "decision": "ERROR",
            "summary": "AI Offline",
            "strengths": [],
            "weaknesses": []
        }

    transcript = "\n".join([f"{m.get('role', 'unknown').upper()}: {m.get('content', '')}" for m in history])

    prompt = f"""
    ACT AS: Senior bar-raiser at a top tech company.

    TASK: Evaluate this complete interview transcript for a {role} role.

    TRANSCRIPT:
    {transcript[:30000]}

    EVALUATION RUBRIC & RULES:
    1. Score Technical Depth out of 100
    2. Score Communication out of 100
    3. Score System Design and Problem Solving out of 100
    4. Derive a realistic overall score out of 100 based on the above metrics.
    5. Formulate a final hiring decision based on the overall score.
    6. Identify 3 specific technical strengths and 3 specific technical weaknesses.

    OUTPUT JSON:
    {{
      "overall_score": int,
      "decision": "HIRE" | "NO HIRE" | "STRONG HIRE" | "LEAN HIRE",
      "summary": "Two sentence executive summary justifying the decision",
      "strengths": ["...", "...", "..."],
      "weaknesses": ["...", "...", "..."]
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
            return {
                "overall_score": 0,
                "decision": "ERROR",
                "summary": "Invalid report format.",
                "strengths": [],
                "weaknesses": []
            }
        return {
            "overall_score": int(data.get("overall_score", 0) or 0),
            "decision": str(data.get("decision", "ERROR")),
            "summary": str(data.get("summary", "")),
            "strengths": data.get("strengths", []) if isinstance(data.get("strengths", []), list) else [],
            "weaknesses": data.get("weaknesses", []) if isinstance(data.get("weaknesses", []), list) else []
        }
    except Exception as e:
        logger.error(f"Report error: {e}")
        return {
            "overall_score": 0,
            "decision": "ERROR",
            "summary": "Could not generate report.",
            "strengths": [],
            "weaknesses": []
        }

def explain_notes(notes: str) -> Dict[str, Any]:
    if not client:
        return {"explanation": "AI unavailable"}

    prompt = f"""
    ACT AS: Senior software engineer mentor.

    TASK:
    Explain the following notes clearly and simply.

    INSTRUCTIONS:
    1 Break down complex ideas into simple terms
    2 Add concrete examples where helpful
    3 Highlight any unclear or weak areas
    4 Keep it structured and easy to read

    NOTES:
    {notes[:12000]}

    OUTPUT JSON:
    {{
        "explanation": "clear structured explanation",
        "key_points": ["point1", "point2"],
        "gaps": ["missing concept or unclear area"]
    }}
    """

    try:
        res = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(clean_json_text(res.text))
    except Exception as e:
        logger.error(f"Explain notes error: {e}")
        return {"explanation": "Failed to explain notes"}

def summarise_notes(notes: str) -> Dict[str, Any]:
    if not client:
        return {"summary": "AI unavailable"}

    prompt = f"""
    ACT AS: Technical educator.

    TASK:
    Summarise these notes for fast revision.

    INSTRUCTIONS:
    1 Extract only the most important ideas
    2 Keep it concise and structured
    3 Avoid fluff

    NOTES:
    {notes[:12000]}

    OUTPUT JSON:
    {{
        "summary": "short paragraph",
        "bullets": ["key idea 1", "key idea 2", "key idea 3"]
    }}
    """

    try:
        res = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(clean_json_text(res.text))
    except Exception as e:
        logger.error(f"Summarise error: {e}")
        return {"summary": "Failed to summarise"}

def ask_about_notes(notes: str, question: str) -> Dict[str, Any]:
    if not client:
        return {"answer": "AI unavailable"}

    prompt = f"""
    ACT AS: Senior engineer tutor.

    TASK:
    Answer the user's question using their notes as primary context.

    INSTRUCTIONS:
    1 Use the notes as the main source
    2 If notes are incomplete extend with correct knowledge
    3 Be precise and practical
    4 Keep it concise but insightful

    NOTES:
    {notes[:10000]}

    QUESTION:
    {question}

    OUTPUT JSON:
    {{
        "answer": "clear answer",
        "confidence": "high | medium | low",
        "note_coverage": "did the notes fully answer this or not"
    }}
    """

    try:
        res = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(clean_json_text(res.text))
    except Exception as e:
        logger.error(f"Ask error: {e}")
        return {"answer": "Failed to answer question"}

def scan_cv_and_extract_skills(file_bytes: bytes) -> Dict[str, int]:
    text = ""

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"

    if len(text) < 50 or not client:
        return {}

    prompt = f"""
    ROLE: Technical Recruiter.
    TASK: Extract technical skills and estimate proficiency (1-10).
    OUTPUT: JSON {{ "SkillName": Score }}
    RESUME: {text[:15000]}
    """

    response = generate_with_retry(
        model=CV_MODEL,
        prompt=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    data = json.loads(clean_json_text(response.text))
    mapped: Dict[str, int] = {}

    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, (int, float)):
                mapped[k] = map_1_10_to_1_5(int(v))
            elif isinstance(v, str) and v.isdigit():
                mapped[k] = map_1_10_to_1_5(int(v))

    return mapped

def calculate_skill_gaps(required_skills: list, user_skills: dict, role_name: str) -> tuple:
    gaps = []
    total_score = 0
    max_possible = 0

    for req in required_skills:
        # Handle both Pydantic models and raw dicts securely
        skill_name = req.skill if hasattr(req, "skill") else req.get("skill", "Unknown")
        importance = req.importance if hasattr(req, "importance") else req.get("importance", "Medium")
        
        target_level = 5
        
        # Default to 0 if the skill was not found on the CV
        current_level = int(user_skills.get(skill_name, 0))
        current_level = max(0, min(5, current_level))
        
        max_possible += target_level
        total_score += current_level

        if current_level < target_level:
            meta = get_ai_analysis(role_name, skill_name, current_level, target_level)
            gaps.append({
                "skill_name": skill_name,
                "current_level": current_level,
                "target_level": target_level,
                "priority": meta["priority"],
                "estimated_hours": meta["estimated_hours"],
            })
            
    match_percentage = int((total_score / max_possible) * 100) if max_possible > 0 else 0
    return gaps, match_percentage


# def create_persistent_pathway(db, user_id, role_id, skill_gaps: list):
#     new_pathway = SavedPathway(user_id=user_id, target_role_id=role_id)
#     db.add(new_pathway)
#     db.flush() 

#     for index, skill in enumerate(skill_gaps):
#         step = PathwayStep(
#             pathway_id=new_pathway.pathway_id,
#             skill_id=skill.get("id"), # Ensure you pass the DB skill ID if required
#             sequence_order=index,
#             status=ProgressStatus.AVAILABLE if index == 0 else ProgressStatus.LOCKED
#         )
#         db.add(step)
    
#     db.commit()
#     return new_pathway.pathway_id

class UpstreamAIUnavailable(Exception):
    pass