"""Stage the static website with content-versioned local resource URLs."""
import hashlib
from pathlib import Path
import re
import shutil


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "public"
FILES = (
    "index.html", "style.css", "globe.css", "app.js", "globe-view.js", "bootstrap.js",
    "conference-brands.js", "conferences.js", "venues.js", "world.svg",
    "CCFDDL-LICENSE.txt",
)


def main():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    for name in FILES:
        shutil.copy2(ROOT / name, OUTPUT / name)
    for directory in ("assets", "vendor"):
        shutil.copytree(ROOT / directory, OUTPUT / directory, dirs_exist_ok=True)

    versions = {}

    def asset_url(name):
        digest = hashlib.sha256((OUTPUT / name).read_bytes()).hexdigest()[:12]
        versions[name] = digest
        return f'./{name}?v={digest}'

    # Version the module graph before hashing its entry point in index.html.
    bootstrap = OUTPUT / "bootstrap.js"
    bootstrap.write_text(re.sub(
        r"import\('\./([^'?#]+)'\)",
        lambda match: "import('" + asset_url(match.group(1)) + "')",
        bootstrap.read_text(),
    ))

    def versioned(match):
        name = match.group(2)
        return f'{match.group(1)}"{asset_url(name)}"'

    index = OUTPUT / "index.html"
    html = re.sub(r'(href=|src=)"\./([^"?#]+)"', versioned, index.read_text())
    index.write_text(html)
    print(f"Staged website in {OUTPUT} with {len(versions)} versioned resources.")


if __name__ == "__main__":
    main()
