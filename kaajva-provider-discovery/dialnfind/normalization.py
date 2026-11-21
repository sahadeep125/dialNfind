"""Normalization helpers: phones, emails, names, PIN codes, URLs, opening hours."""

from __future__ import annotations

import re
import unicodedata
from fnmatch import fnmatch
from urllib.parse import urlsplit, urlunsplit

import phonenumbers
from phonenumbers import NumberParseException, PhoneNumberFormat

DEFAULT_REGION = "IN"

# ---------------------------------------------------------------- text


def clean_text(value: object) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    return re.sub(r"\s+", " ", text).strip()


# ---------------------------------------------------------------- phones

_PLACEHOLDER_NUMBERS = {
    "1234567890",
    "0123456789",
    "9876543210",
    "0987654321",
    "9123456789",
    "9012345678",
    "1122334455",
}


def normalize_phone(raw: str, region: str = DEFAULT_REGION) -> str:
    """Normalize a phone number to E.164 (``+919876543210``).

    Returns ``""`` when the input is not a valid number. Does not judge whether the
    number is a placeholder -- see :func:`is_junk_phone`.
    """
    text = clean_text(raw)
    if not text:
        return ""
    text = re.sub(r"(?i)^(tel|phone|callto):", "", text).strip()
    text = re.sub(r"(?i)\s*(ext|extn|x)\.?\s*\d{1,5}$", "", text)
    digits = re.sub(r"\D", "", text)
    if not 8 <= len(digits) <= 15:
        return ""
    has_plus = text.lstrip().startswith("+")
    if not has_plus:
        if len(digits) == 12 and digits.startswith("91"):
            text = "+" + digits
        elif len(digits) == 13 and digits.startswith("091"):
            text = "+" + digits[1:]
        elif len(digits) == 14 and digits.startswith("0091"):
            text = "+" + digits[2:]
    try:
        number = phonenumbers.parse(text, region)
    except NumberParseException:
        return ""
    if not phonenumbers.is_valid_number(number):
        return ""
    return phonenumbers.format_number(number, PhoneNumberFormat.E164)


def is_junk_phone(e164: str) -> bool:
    """Obvious placeholders/dummies: repeated digits, sequences, template numbers."""
    if not e164:
        return True
    try:
        nsn = str(phonenumbers.parse(e164).national_number)
    except NumberParseException:
        return True
    if len(set(nsn)) <= 2:
        return True
    if nsn in _PLACEHOLDER_NUMBERS or nsn[-10:] in _PLACEHOLDER_NUMBERS:
        return True
    # long ascending/descending runs, e.g. 9812345678 contains 12345678
    for seq in ("0123456789", "9876543210"):
        for i in range(len(seq) - 7):
            if seq[i : i + 8] in nsn:
                return True
    return False


def clean_phone(raw: str) -> str:
    """Normalize and drop junk; the value used by extraction."""
    e164 = normalize_phone(raw)
    return "" if is_junk_phone(e164) else e164


def phone_type(e164: str) -> str:
    try:
        kind = phonenumbers.number_type(phonenumbers.parse(e164))
    except NumberParseException:
        return ""
    return {
        phonenumbers.PhoneNumberType.MOBILE: "mobile",
        phonenumbers.PhoneNumberType.FIXED_LINE: "landline",
        phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE: "mobile_or_landline",
        phonenumbers.PhoneNumberType.TOLL_FREE: "toll_free",
    }.get(kind, "other")


# ---------------------------------------------------------------- emails

EMAIL_RE = re.compile(
    r"(?<![\w.+-])[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}(?![\w-])"
)
_EMAIL_FULL = re.compile(r"^[a-z0-9][a-z0-9._%+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$")
_JUNK_EMAIL_DOMAINS = {
    "example.com", "example.org", "example.net", "example.in", "domain.com", "yourdomain.com",
    "email.com", "test.com", "yoursite.com", "website.com", "mysite.com", "company.com",
    "sentry.io", "wixpress.com", "sentry-next.wixpress.com", "sentry.wixpress.com",
}
_JUNK_EMAIL_LOCALS = {
    "noreply", "no-reply", "donotreply", "do-not-reply", "example", "test", "user", "username",
    "your", "youremail", "yourname", "name", "email", "abc", "xyz", "someone",
}
_ASSET_TLDS = {"png", "jpg", "jpeg", "gif", "webp", "svg", "css", "js", "ico", "bmp", "avif"}
FREE_MAIL_DOMAINS = {
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "hotmail.com",
    "outlook.com", "live.com", "rediffmail.com", "icloud.com", "aol.com", "protonmail.com",
    "proton.me", "ymail.com", "zoho.com", "zohomail.in",
}
_ROLE_LOCALS = {
    "info", "contact", "support", "sales", "service", "services", "enquiry", "enquiries",
    "inquiry", "office", "admin", "care", "customercare", "booking", "bookings", "help", "hello",
}


def normalize_email(raw: str) -> str:
    text = clean_text(raw).lower()
    text = re.sub(r"^mailto:", "", text).split("?", 1)[0].strip().strip(".,;:")
    if not _EMAIL_FULL.match(text):
        return ""
    local, domain = text.rsplit("@", 1)
    if domain.rsplit(".", 1)[-1] in _ASSET_TLDS or re.search(r"@\d+x\.", text):
        return ""
    if domain in _JUNK_EMAIL_DOMAINS or local in _JUNK_EMAIL_LOCALS:
        return ""
    if re.fullmatch(r"[0-9a-f]{20,}", local):  # hashed tracking ids
        return ""
    return text


def extract_emails(text: str) -> list[str]:
    found: list[str] = []
    for match in EMAIL_RE.finditer(text or ""):
        email = normalize_email(match.group(0))
        if email and email not in found:
            found.append(email)
    return found


def rank_emails(emails: list[str], site_domain: str = "") -> list[str]:
    """Business-domain emails first, then role mailboxes, then the rest.

    If any email on the business's own domain exists, emails on other domains are
    dropped to avoid collecting individuals' personal addresses.
    """
    unique = list(dict.fromkeys(e for e in emails if e))
    site = registrable_domain(site_domain) if site_domain else ""
    on_domain = [e for e in unique if site and registrable_domain(e.rsplit("@", 1)[1]) == site]
    if on_domain:
        unique = on_domain

    def key(email: str) -> tuple[int, int]:
        local, domain = email.rsplit("@", 1)
        return (0 if local in _ROLE_LOCALS else 1, 1 if domain in FREE_MAIL_DOMAINS else 0)

    return sorted(unique, key=key)


# ---------------------------------------------------------------- names

_LEGAL_TOKENS = {"pvt", "private", "ltd", "limited", "llp", "inc", "corp", "opc", "co", "company"}
GENERIC_NAME_TOKENS = {
    "the", "and", "services", "service", "solutions", "solution", "enterprise", "enterprises",
    "appliance", "appliances", "repair", "repairs", "repairing", "centre", "center", "shop",
    "store", "works", "agency", "agencies", "traders", "trading", "group", "india", "electronics",
    "electronic", "electricals", "electrical", "ac", "tv", "home", "sales", "point", "hub", "world",
    "zone", "technologies", "technology", "tech", "systems", "system", "associates", "brothers",
    "bros", "maintenance", "installation", "servicing",
}


def normalize_name(name: str) -> str:
    """Casefolded, punctuation-free name with legal suffixes removed."""
    text = clean_text(name).casefold().replace("&", " and ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^\w\s]", " ", text).replace("_", " ")
    tokens = [t for t in text.split() if t not in _LEGAL_TOKENS]
    return " ".join(tokens)


def core_name(name: str, extra_stopwords: set[str] | None = None) -> str:
    """Distinctive part of a name for fuzzy matching ("Cool Care AC Services" -> "cool care")."""
    base = normalize_name(name)
    stop = GENERIC_NAME_TOKENS | {w.casefold() for w in (extra_stopwords or set())}
    tokens = [t for t in base.split() if t not in stop]
    return " ".join(tokens) if tokens else base


def squash(text: str) -> str:
    return re.sub(r"\s+", "", text)


# ---------------------------------------------------------------- PIN codes

PIN_RE = re.compile(r"(?<![\d-])([1-9]\d{2})\s?(\d{3})(?![\d-])")


def normalize_pincode(raw: object) -> str:
    """Return a valid 6-digit Indian PIN code or ``""``."""
    text = clean_text(raw)
    digits = re.sub(r"\s", "", text)
    return digits if re.fullmatch(r"[1-9]\d{5}", digits) else ""


def extract_pincodes(text: str) -> list[str]:
    found: list[str] = []
    for m in PIN_RE.finditer(text or ""):
        pin = m.group(1) + m.group(2)
        if pin not in found:
            found.append(pin)
    return found


# ---------------------------------------------------------------- URLs / domains

_MULTI_PART_SUFFIXES = {
    "co.in", "net.in", "org.in", "firm.in", "gen.in", "ind.in", "gov.in", "ac.in", "edu.in",
    "res.in", "co.uk", "org.uk", "com.au", "net.au", "co.nz", "com.sg", "com.np", "com.bd",
}


def normalize_url(url: str) -> str:
    text = clean_text(url)
    if not text:
        return ""
    if text.startswith("//"):
        text = "https:" + text
    if not re.match(r"(?i)^https?://", text):
        if re.match(r"(?i)^[a-z][a-z0-9+.-]*:", text):
            return ""  # mailto:, javascript:, ...
        text = "https://" + text
    parts = urlsplit(text)
    host = (parts.hostname or "").lower().rstrip(".")
    if not host or "." not in host:
        return ""
    netloc = host if parts.port in (None, 80, 443) else f"{host}:{parts.port}"
    path = parts.path or "/"
    return urlunsplit((parts.scheme.lower(), netloc, path, parts.query, ""))


def host_of(url: str) -> str:
    try:
        host = (urlsplit(url).hostname or "").lower()
    except ValueError:
        return ""
    return host[4:] if host.startswith("www.") else host


def registrable_domain(host_or_url: str) -> str:
    host = host_of(host_or_url) if "/" in host_or_url else host_or_url.lower()
    host = host[4:] if host.startswith("www.") else host
    labels = [label for label in host.split(".") if label]
    if len(labels) <= 2:
        return ".".join(labels)
    if ".".join(labels[-2:]) in _MULTI_PART_SUFFIXES:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def site_root(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, "/", "", ""))


def site_key(url: str, shared_hosts: list[str] | tuple[str, ...] = ()) -> str:
    """Identity of a website for dedup: registrable domain, or host(+path) on shared hosting."""
    host = host_of(url)
    if not host:
        return ""
    for shared in shared_hosts:
        if host == shared or host.endswith("." + shared):
            if shared == "wixsite.com":
                first = urlsplit(url).path.strip("/").split("/", 1)[0]
                return f"{host}/{first}" if first else host
            return host
    return registrable_domain(host)


def is_blocked(url_or_host: str, patterns: list[str]) -> bool:
    host = host_of(url_or_host) if "/" in url_or_host else url_or_host.lower()
    for pattern in patterns:
        p = pattern.lower().strip()
        if not p:
            continue
        if host == p or host.endswith("." + p) or fnmatch(host, p) or fnmatch(host, "*." + p):
            return True
    return False


# ---------------------------------------------------------------- opening hours

_DAY_ALIASES = {
    "mo": "Mo", "mon": "Mo", "monday": "Mo",
    "tu": "Tu", "tue": "Tu", "tues": "Tu", "tuesday": "Tu",
    "we": "We", "wed": "We", "wednesday": "We",
    "th": "Th", "thu": "Th", "thur": "Th", "thurs": "Th", "thursday": "Th",
    "fr": "Fr", "fri": "Fr", "friday": "Fr",
    "sa": "Sa", "sat": "Sa", "saturday": "Sa",
    "su": "Su", "sun": "Su", "sunday": "Su",
}
DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]


def day_code(token: str) -> str:
    token = token.strip().lower()
    token = token.rsplit("/", 1)[-1]  # https://schema.org/Monday
    return _DAY_ALIASES.get(token, "")


def parse_opening_hours(text: str) -> list[dict[str, str]]:
    """Parse the common OSM/schema.org subset, e.g. ``Mo-Sa 09:00-20:00; Su 10:00-14:00``.

    Returns ``[{"day": "Mo", "opens": "09:00", "closes": "20:00"}, ...]`` or ``[]``
    when the text can't be parsed confidently.
    """
    if not text:
        return []
    if clean_text(text).lower() == "24/7":
        return [{"day": d, "opens": "00:00", "closes": "24:00"} for d in DAYS]
    result: list[dict[str, str]] = []
    for rule in re.split(r"[;\n]", text):
        rule = rule.strip()
        if not rule:
            continue
        m = re.match(r"^([A-Za-z,\-\s]+?)\s+(.+)$", rule)
        if not m:
            return []
        days = _expand_days(m.group(1))
        spans = re.findall(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", m.group(2))
        if not days or not spans:
            if m.group(2).strip().lower() == "off" and days:
                continue
            return []
        for day in days:
            for opens, closes in spans:
                result.append({"day": day, "opens": opens.zfill(5), "closes": closes.zfill(5)})
    return result


def _expand_days(spec: str) -> list[str]:
    days: list[str] = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = (day_code(x) for x in part.split("-", 1))
            if not start or not end:
                return []
            i, j = DAYS.index(start), DAYS.index(end)
            span = DAYS[i : j + 1] if i <= j else DAYS[i:] + DAYS[: j + 1]
            days.extend(span)
        else:
            code = day_code(part)
            if not code:
                return []
            days.append(code)
    return list(dict.fromkeys(days))


def format_day_range(days: list[str]) -> str:
    """["Mo","Tu","We"] -> "Mo-We"; non-contiguous -> "Mo,We"."""
    idx = sorted({DAYS.index(d) for d in days if d in DAYS})
    if not idx:
        return ""
    if len(idx) > 2 and idx == list(range(idx[0], idx[-1] + 1)):
        return f"{DAYS[idx[0]]}-{DAYS[idx[-1]]}"
    return ",".join(DAYS[i] for i in idx)
