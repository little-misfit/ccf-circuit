# CCF-Schedule

Explore CCF A, B and C conferences on an interactive 3D globe and track submission deadlines. The site opens with submission deadlines filtered to **Artificial Intelligence** and **CCF A**. The initial year contains the next future deadline within those filters, using UTC+8; if none is announced, it falls back to the current year. Change the year, month, subject or rank, switch to conference dates when needed, and save conferences in your browser. Resetting the filters clears the subject and rank restrictions so all conferences can be explored.

The English interface uses a muted red, white and blue palette. Red highlights the next deadline; blue identifies other locations and controls.

## Globe interaction

- Drag to rotate. Use the mouse wheel, a two-finger gesture or the zoom buttons to change scale. With keyboard focus on the globe, use the arrow keys to rotate and `+` / `-` to zoom.
- City markers use geographic coordinates. Floating labels show the next submission deadline for each city within the active filters. Labels avoid one another and disappear on the far side of the Earth.
- The nearest future deadline has a highlighted marker, ring and label. The sidebar shows its full countdown and the following three submission entries. **Locate on globe** brings its location into view.
- “Next” means the **earliest future submission deadline within the active filters**, including abstract and paper deadlines. It does not mean the next conference date. No countdown is shown when a future deadline has not been announced.
- Automatic rotation pauses on hover, during keyboard reading and after manual interaction. The rotation button can resume it. The system’s reduced-motion preference disables automatic rotation and repeating rings by default.
- Devices without WebGL2 use the interactive 2D map. The schedule and saved conferences remain available. Online conferences and conferences without a reliable location remain in the schedule.

## Dates and data

Conference records come from [CCFDDL](https://ccfddl.com/) and its [public dataset](https://ccfddl.com/conference/allconf.json). Each abstract and paper submission round is listed separately. Countdown calculations respect the source time zone; displayed submission times use **UTC+8**. The details panel also retains the original local deadline and time zone.

Conference names, venue descriptions, dates and submission notes are preserved from the source. Saved conferences remain in the current browser; the existing storage key is retained across the rename to CCF-Schedule.

## Run locally

Use Python 3.9 or later to generate a data snapshot and start the preview server:

```sh
bash run.sh sync
bash run.sh serve
```

Open http://127.0.0.1:8769 in your browser. To use another port, run `bash run.sh serve 8000`.

The Earth texture, renderer and conference snapshot are served locally. After generating the snapshot, the site can be previewed offline over HTTP. Use the local server rather than opening the HTML file directly, since browser security rules can prevent WebGL textures from loading from file URLs.

## Validation

`bash run.sh check` validates conference data and local assets. `node check.cjs --browser` also runs browser smoke checks. Set `NODE_BIN` or `CHROME_BIN` to select a Node or Chrome executable.

With the local server running and Python Playwright installed, run the extended browser checks:

```sh
python3 tests/check_globe_browser.py --url http://127.0.0.1:8769/ --browser /path/to/chrome
```

These checks cover real pointer input, deadline rollover, responsive layouts and WebGL fallback. Reports and screenshots are written to `preview/`.

## Project files

- `globe-view.js`: 3D rendering, floating labels and camera controls.
- `globe.css` and `style.css`: globe, countdown and schedule presentation.
- `app.js`: filters, conference details, saved conferences and date logic.
- `venues.js`: city aliases and coordinates.
- `sync_ccf.py`: CCFDDL snapshot generation.

## Updates and deployment

GitHub Actions refreshes the data daily at 02:23 UTC (10:23 UTC+8) and builds on pushes to `main`. It validates the data and tests the globe, filters, saved conferences and submission schedule before publishing to GitHub Pages. If a build fails, the previous successful deployment remains live.

The globe uses NASA Blue Marble imagery and a locally pinned globe.gl / Three.js bundle. Sources and licenses are documented in `assets/README.md` and `vendor/globe.gl/`. The fallback map uses Natural Earth 1:110m land data via World Atlas. Markers indicate host cities; consult conference websites for exact venue addresses. See `CCFDDL-LICENSE.txt` for the dataset license.
