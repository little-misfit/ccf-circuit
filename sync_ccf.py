"""Build the self-contained calendar snapshot from CCFDDL's public JSON feed."""
import argparse
import calendar
from datetime import date, datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import tempfile
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

SOURCE = "https://ccfddl.com/conference/allconf.json"
MONTHS = {key.lower(): i for i in range(1, 13)
          for key in (calendar.month_name[i], calendar.month_abbr[i])}
MONTHS["sept"] = 9
MONTH_PATTERN = "|".join(sorted(MONTHS, key=len, reverse=True))
DATE_TOKEN = re.compile(rf"\b(?:({MONTH_PATTERN})\.?\s+)?(\d{{1,2}})\b", re.I)


def meeting_dates(edition):
    """Keep the source opening date. Parse the final day only from dated ranges."""
    raw = edition.get("date") or ""
    opening = edition.get("opening")
    first = date.fromisoformat(opening[:10]) if opening else None
    stripped = re.sub(r"\([^)]*\)|\b\d{4}\b", "", raw)
    month = None
    explicit_year = re.search(r"\b(\d{4})\b", raw)
    year = first.year if first else (int(explicit_year[1]) if explicit_year else edition["year"])
    days = []
    for match in DATE_TOKEN.finditer(stripped):
        if match.group(1):
            next_month = MONTHS[match.group(1).lower()]
            if month == 12 and next_month == 1:
                year += 1
            month = next_month
        if month:
            try:
                days.append(date(year, month, int(match.group(2))))
            except ValueError:
                continue
    start = first or min(days, default=None)
    end = max(days, default=None)
    return (start.isoformat() if start else None,
            end.isoformat() if end and (not start or end >= start) else None)


def deadline_utc(local, zone):
    if not local or str(local).strip().upper() in {"TBD", "TBA", "N/A"}:
        return None
    dt = datetime.fromisoformat(local)
    if dt.tzinfo is None:
        if zone == "AoE":
            tz = timezone(timedelta(hours=-12))
        elif zone == "PT":
            tz = ZoneInfo("America/Los_Angeles")
        elif zone in {"UTC", "GMT"}:
            tz = timezone.utc
        else:
            fixed = re.fullmatch(r"(?:UTC|GMT)([+-])(\d{1,2})(?::(\d{2}))?", zone or "")
            if fixed:
                hours = int(fixed[2]) * 60 + int(fixed[3] or 0)
                tz = timezone(timedelta(minutes=hours * (1 if fixed[1] == "+" else -1)))
            else:
                tz = ZoneInfo(zone)
        dt = dt.replace(tzinfo=tz)
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def normalize(series):
    events = []
    ids = set()
    for entry in series:
        rank = entry["rank"]["ccf"]
        if rank not in {"A", "B", "C"}:
            continue
        for conf in entry["confs"]:
            eid = conf["id"]
            if not eid or eid in ids:
                raise ValueError(f"Missing or duplicate conference id: {eid!r}")
            ids.add(eid)
            start, end = meeting_dates(conf)
            deadlines = []
            for index, timeline in enumerate(conf["timeline"], 1):
                zone = timeline.get("timezone") or conf["timezone"]
                for field, kind in (("abstract_deadline", "abstract"), ("deadline", "paper")):
                    if field not in timeline:
                        continue
                    local = timeline[field]
                    deadlines.append(dict(type=kind, at=deadline_utc(local, zone), local=local,
                                          timezone=zone, note=timeline.get("comment") or "", round=index))
            events.append(dict(id=eid, title=entry["title"], name=entry["description"],
                               year=conf["year"], rank=rank, category=entry["sub"],
                               place=conf["place"], date=conf["date"], start=start, end=end,
                               link=conf["link"], deadlines=deadlines))
    if not events or {e["rank"] for e in events} != {"A", "B", "C"}:
        raise ValueError("Expected a populated aggregate containing all three CCF ranks")
    return events


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="local copy of CCFDDL allconf.json")
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("conferences.js"))
    args = parser.parse_args()
    if args.input:
        with args.input.open(encoding="utf-8") as f:
            series = json.load(f)
    else:
        req = Request(SOURCE, headers={"User-Agent": "CCF-Schedule/1", "Accept": "application/json"})
        with urlopen(req, timeout=45) as response:
            series = json.load(response)
    events = normalize(series)
    payload = dict(updatedAt=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
                   source=SOURCE, events=events)
    # Write atomically, so an upstream or filesystem error preserves the old snapshot.
    tmp_name = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=args.output.parent, delete=False) as f:
            tmp_name = f.name
            f.write("window.CCF_DATA = ")
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
            f.write(";\n")
        os.chmod(tmp_name, 0o644)
        os.replace(tmp_name, args.output)
    finally:
        if tmp_name and os.path.exists(tmp_name):
            os.unlink(tmp_name)
    print(f"{args.output}: {len(events)} CCF editions, "
          f"{len({e['title'] for e in events})} series, "
          f"{sum(len(e['deadlines']) for e in events)} submission milestones")


if __name__ == "__main__":
    main()
