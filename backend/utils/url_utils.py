import urllib.request

def is_url_accessible(url: str) -> bool:
    if not url:
        return False

    blocked_fast = [
        "google.com/search",
        "github.com/search",
        "youtube.com/results"
    ]

    if any(b in url for b in blocked_fast):
        return True

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=3) as r:
            return r.getcode() < 400
    except Exception:
        return False