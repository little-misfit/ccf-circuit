# CCF-Schedule

Explore CCF A, B and C conferences on an interactive 3D globe and track submission deadlines. The site opens with submission deadlines filtered to **Artificial Intelligence** and **CCF A**. The initial year contains the next future deadline within those filters, using UTC+8; if none is announced, it falls back to the current year. Change the year, month, subject or rank, switch to conference dates when needed, and save conferences in your browser. Resetting the filters clears the subject and rank restrictions so all conferences can be explored.

The English interface uses a muted red, white and blue palette and a COBE dot-map globe. Conference cards take their accents from the corresponding official logos; an emphasized outline and ring identify the next deadline.

## Globe interaction

- Drag to rotate. Use the mouse wheel, a two-finger gesture or the zoom buttons to change scale. With keyboard focus on the globe, use the arrow keys to rotate and `+` / `-` to zoom.
- City markers use COBE's native geographic coordinates and per-marker colors, with outlined pins that remain distinct from the land dots even on phones. Pins and floating labels follow its CSS anchors and visibility state. Labels show the next submission deadline for each city within the active filters, favor the sides of the globe, and avoid both other labels and visible markers. The nearest deadline's expanding rings have their own clear space.
- Floating cards pair a local official conference logo with a readable countdown. Every card retains a narrow brand-colored edge; only the nearest deadline receives a tinted surface, emphasized border and colored countdown so a red logo cannot be mistaken for an urgent deadline. When a verified logo is unavailable or fails to load, the card shows the conference abbreviation instead. Sources are documented in `assets/conferences/README.md`.
- The nearest future deadline has a highlighted marker, ring and label. The sidebar shows its full countdown and the following three submission entries. **Locate on globe** brings its location into view.
- “Next” means the **earliest future submission deadline within the active filters**, including abstract and paper deadlines. It does not mean the next conference date. No countdown is shown when a future deadline has not been announced.
- Automatic rotation pauses on hover, during keyboard reading and after manual interaction. The rotation button can resume it. The system’s reduced-motion preference disables automatic rotation and replaces repeating rings with a still outline.
- COBE uses WebGL2 or WebGL1. Devices without a usable WebGL context, or where the renderer fails to load, use the interactive 2D map. The schedule and saved conferences remain available. Online conferences and conferences without a reliable location remain in the schedule.

## Dates and data

Conference records come from [CCFDDL](https://ccfddl.com/) and its [public dataset](https://ccfddl.com/conference/allconf.json). Each abstract and paper submission round is listed separately. Countdown calculations respect the source time zone; displayed submission times use **UTC+8**. The details panel also retains the original local deadline and time zone.

In submission mode, conferences whose deadlines are unannounced remain visible under **Deadlines to be announced** for their conference year, including on the globe. Their cards show **Deadline TBA** instead of a numeric countdown. They are counted separately from known deadline entries and excluded when a specific submission month is selected, since that month is not yet known.

Conference names, venue descriptions, dates and submission notes are preserved from the source. Saved conferences remain in the current browser; the existing storage key is retained across the rename to CCF-Schedule.

## Run locally

Use Python 3.9 or later to generate a data snapshot and start the preview server:

```sh
bash run.sh sync
bash run.sh serve
```

Open http://127.0.0.1:8769 in your browser. To use another port, run `bash run.sh serve 8000`.

After syncing the data, `bash run.sh build` prepares the deployable website in `public/`. Local scripts, styles and data URLs include content hashes so updates load fresh resources instead of mixing releases from browser caches.

The renderer, its embedded map and the conference snapshot are served locally. After generating the snapshot, the site can be previewed offline over HTTP. Use the local server rather than opening the HTML file directly, since browsers restrict module imports from file URLs.

## Validation

`bash run.sh check` validates conference data and local assets. `node check.cjs --browser` also runs browser smoke checks. Set `NODE_BIN` or `CHROME_BIN` to select a Node or Chrome executable.

With the local server running and Python Playwright installed, run the extended browser checks:

```sh
python3 tests/check_globe_browser.py --url http://127.0.0.1:8769/ --browser /path/to/chrome
```

These checks cover real pointer input, deadline rollover, category highlights, marker clearance, conference artwork, responsive layouts and WebGL fallback. Reports and screenshots are written to `preview/`. Add `--only fse-branding` to run just the regression that distinguishes the two unrelated FSE conferences.

## Project files

- `bootstrap.js`: loads the local COBE module, globe adapter and conference app, retaining the 2D fallback if the renderer is unavailable.
- `globe-view.js`: COBE integration, floating labels and pointer/keyboard controls.
- `globe.css` and `style.css`: globe, countdown and schedule presentation.
- `app.js`: filters, conference details, saved conferences and date logic.
- `venues.js`: city aliases and coordinates.
- `conference-brands.js`: verified logo files and conference colors.
- `build_site.py`: static publication bundle and resource versioning.
- `sync_ccf.py`: CCFDDL snapshot generation.

## COBE integration

The pinned, unmodified **COBE 2.0.1** component handles the sphere, land dots, geographic markers, CSS anchors and front/back visibility. The adapter calls its native `createGlobe`, `update` and `destroy` APIs, updates `phi`, `theta`, `scale`, `offset`, and `markers`, and supplies DOM labels through `--cobe-{id}` anchors. Application code handles drag/pinch/keyboard input, label collision avoidance, deadline rings and the conference selection callbacks. No Three.js renderer is shipped.

Browsers without CSS anchor positioning use the pinned component's projection equations for the DOM overlays; COBE still renders the globe. The public application-facing adapter retains `setLocations`, `focusNearest`, `reset`, `zoom`, `stopRotation` and `toggleRotation`. Exact upstream behavior, API types, provenance and licenses are documented in `vendor/cobe/README.md`.

## Updates and deployment

GitHub Actions refreshes the data daily at 02:23 UTC (10:23 UTC+8) and builds on pushes to `main`. It validates the data and tests the globe, filters, saved conferences and submission schedule before publishing to GitHub Pages. If a build fails, the previous successful deployment remains live.

The globe uses COBE (MIT) with its embedded map adapted from **World map blank without borders**, by Crates (CC BY-SA 4.0); credits appear in the footer and `vendor/cobe/`. The fallback map uses Natural Earth 1:110m land data via World Atlas. Markers indicate host cities; consult conference websites for exact venue addresses. See `CCFDDL-LICENSE.txt` for the dataset license.
