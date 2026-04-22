import random
import time
from functools import lru_cache
from urllib.parse import urlparse

from duckduckgo_search import DDGS


class SearchService:

    @staticmethod
    @lru_cache(maxsize=500)
    def text_search(query: str, max_results: int = 8):
        time.sleep(random.uniform(0.3, 1.2))
        with DDGS() as ddgs:
            return list(ddgs.text(query, region="uk-en", max_results=max_results))

    @staticmethod
    @lru_cache(maxsize=500)
    def video_search(query: str, max_results: int = 8):
        time.sleep(random.uniform(0.3, 1.2))
        with DDGS() as ddgs:
            return list(ddgs.videos(query, region="uk-en", max_results=max_results))

    @staticmethod
    def domain(url: str) -> str:
        try:
            host = urlparse(url).netloc.lower()
            return host[4:] if host.startswith("www.") else host
        except Exception:
            return ""