import httpx

from dialnfind.config import Settings
from dialnfind.crawler import OUTCOME_BLOCKED, OUTCOME_FAILED, OUTCOME_SKIPPED, Crawler
from dialnfind.rate_limiter import DomainRateLimiter
from dialnfind.robots import parse_robots


def make_crawler(handler, **crawler_kw):
    settings = Settings(blocked_domains=["google.*", "justdial.com"], contact_email="ops@example.org")
    for k, v in crawler_kw.items():
        setattr(settings.crawler, k, v)
    sleeps: list[float] = []
    crawler = Crawler(settings, None, transport=httpx.MockTransport(handler), sleep=sleeps.append)
    return crawler, sleeps


def test_robots_semantics():
    agent = "dialnfindProviderDiscovery/1.0"
    rules = parse_robots(200, "User-agent: *\nDisallow: /private/\nCrawl-delay: 5\n", agent)
    assert rules.allowed("https://x.example/contact") and not rules.allowed("https://x.example/private/a")
    assert rules.crawl_delay() == 5
    assert not parse_robots(403, "", agent).allowed("https://x.example/")
    assert parse_robots(404, "", agent).allowed("https://x.example/")
    assert not parse_robots(503, "", agent).allowed("https://x.example/")  # unreachable -> disallow
    specific = parse_robots(200, "User-agent: dialnfindProviderDiscovery\nDisallow: /\n", agent)
    assert not specific.allowed("https://x.example/")


def test_user_agent_is_honest():
    seen = {}

    def handler(request):
        seen["ua"] = request.headers["user-agent"]
        return httpx.Response(404) if request.url.path == "/robots.txt" else httpx.Response(
            200, headers={"content-type": "text/html"}, text="<html></html>")

    crawler, _ = make_crawler(handler)
    assert crawler.fetch_page("https://biz.example/").ok
    assert seen["ua"].startswith("dialnfindProviderDiscovery/1.0") and "ops@example.org" in seen["ua"]
    assert "Mozilla" not in seen["ua"]


def test_blocked_domain_never_requested():
    calls = []
    crawler, _ = make_crawler(lambda r: calls.append(str(r.url)) or httpx.Response(200))
    assert crawler.fetch_page("https://www.google.com/maps/search/ac+repair").outcome == OUTCOME_BLOCKED
    assert crawler.fetch_page("https://www.justdial.com/Siliguri").outcome == OUTCOME_BLOCKED
    assert calls == []


def test_redirect_to_blocked_domain_is_stopped():
    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(404)
        return httpx.Response(301, headers={"location": "https://www.justdial.com/x"})

    crawler, _ = make_crawler(handler)
    assert crawler.fetch_page("https://biz.example/").outcome == OUTCOME_BLOCKED


def test_robots_disallow_respected():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        return httpx.Response(200, text="User-agent: *\nDisallow: /\n")

    crawler, _ = make_crawler(handler)
    result = crawler.fetch_page("https://biz.example/contact")
    assert result.outcome == OUTCOME_SKIPPED
    assert calls == ["/robots.txt"]


def test_challenge_page_skips_domain_without_retry():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        if request.url.path == "/robots.txt":
            return httpx.Response(404)
        return httpx.Response(503, text="<title>Just a moment...</title> cf-chl")

    crawler, sleeps = make_crawler(handler)
    assert crawler.fetch_page("https://biz.example/").outcome == OUTCOME_SKIPPED
    assert crawler.fetch_page("https://biz.example/contact").outcome == OUTCOME_SKIPPED
    assert calls == ["/robots.txt", "/"]  # one attempt, no retries, domain then skipped
    assert len(sleeps) <= 1  # only the normal per-domain politeness delay


def test_bounded_retries_with_backoff():
    calls = []

    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(404)
        calls.append(1)
        return httpx.Response(502, text="bad gateway")

    crawler, sleeps = make_crawler(handler, max_retries=2)
    result = crawler.fetch_page("https://biz.example/")
    assert result.outcome == OUTCOME_FAILED
    assert len(calls) == 3  # 1 try + 2 retries, never infinite
    assert len([s for s in sleeps if s >= 2]) >= 2  # backoff waits


def test_non_html_content_skipped():
    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(404)
        return httpx.Response(200, headers={"content-type": "application/pdf"}, content=b"%PDF")

    crawler, _ = make_crawler(handler)
    assert crawler.fetch_page("https://biz.example/brochure").outcome == OUTCOME_SKIPPED


def test_rate_limiter_spaces_same_domain_requests():
    now = [0.0]
    slept = []

    def sleep(s):
        slept.append(s)
        now[0] += s

    limiter = DomainRateLimiter(2.0, clock=lambda: now[0], sleep=sleep)
    limiter.wait("a.example")
    limiter.wait("a.example")
    limiter.wait("b.example")  # other domain not delayed
    assert slept == [2.0]
    limiter.set_delay("a.example", 10)
    limiter.wait("a.example")
    assert slept[-1] == 2.0  # previous delay still applied for this slot
