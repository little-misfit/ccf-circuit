"""Stage the static website with content-versioned local resource URLs."""
import hashlib
from pathlib import Path
import re
import shutil


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "public"
FILES = (
    "index.html", "style.css", "globe.css", "app.js", "globe-view.js",
    "conference-brands.js", "conferences.js", "venues.js", "world.svg",
    "CCFDDL-LICENSE.txt",
)


def main():
    OUTPUT.mkdir(exist_ok=True)
    for name in FILES:
        shutil.copy2(ROOT / name, OUTPUT / name)
    for directory in ("assets", "vendor"):
        shutil.copytree(ROOT / directory, OUTPUT / directory, dirs_exist_ok=True)

    versions = {}

    def versioned(match):
        name = match.group(2)
        digest = hashlib.sha256((OUTPUT / name).read_bytes()).hexdigest()[:12]
        versions[name] = digest
        return f'{match.group(1)}"./{name}?v={digest}"'

    index = OUTPUT / "index.html"
    html = re.sub(r'(href=|src=)"\./([^"?#]+)"', versioned, index.read_text())
    index.write_text(html)
    print(f"Staged website in {OUTPUT} with {len(versions)} versioned resources.")


if __name__ == "__main__":
    main()
