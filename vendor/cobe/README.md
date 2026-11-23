# COBE 2.0.1

`cobe-2.0.1.esm.js` is the unmodified production ESM from the official npm package
[`cobe@2.0.1`](https://www.npmjs.com/package/cobe/v/2.0.1), the latest stable npm
release checked on 2026-11-23. It is 12,937 bytes, has no runtime dependencies or
imports, and includes its shaders and land-mask texture. No CDN or texture server
is contacted at runtime. The package's types, metadata, upstream README, and MIT
license are retained alongside it. Exact integrity values are in
`PROVENANCE.json`.

Upstream commit: `4fc247f673fbec28d5ae6d4798757e2bca83ed3b`.

- [Official documentation](https://cobe.vercel.app/)
- [Pinned renderer source](https://github.com/shuding/cobe/blob/4fc247f673fbec28d5ae6d4798757e2bca83ed3b/src/index.js)
- [Pinned CSS-anchor source](https://github.com/shuding/cobe/blob/4fc247f673fbec28d5ae6d4798757e2bca83ed3b/src/anchor.js)
- [Pinned shader helpers](https://github.com/shuding/cobe/blob/4fc247f673fbec28d5ae6d4798757e2bca83ed3b/src/webgl.js)

## Licenses and map attribution

COBE's code is MIT, copyright 2021 Shu Ding; see `LICENSE`.

The embedded land mask is adapted upstream from **World map blank without
borders**, by **Crates**, [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:World_map_blank_without_borders.svg),
available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
([legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode)). COBE
provides a raster adaptation; this project retains that embedded raster unchanged.
The map attribution and CC BY-SA terms apply to that artwork, separately from the
MIT renderer. Keep this notice and a map credit with the displayed globe.

## Public interface

```js
import createGlobe from './vendor/cobe/cobe-2.0.1.esm.js';
const globe = createGlobe(canvas, options);
globe.update({ phi, theta });
globe.destroy();
```

The shipped `index.d.ts` is the complete typed API. There is no exported camera,
projection function, controls object, or event emitter. There is no automatic
animation loop. The `onRender` callback in the upstream README is a legacy
example and is not implemented in this release.

Options: `width`, `height`, `devicePixelRatio`, `phi`, `theta`, `mapSamples`,
`mapBrightness`, `mapBaseBrightness`, `baseColor`, `markerColor`, `glowColor`,
`diffuse`, `dark`, `opacity`, `offset`, `scale`, `context`, `markers`, `arcs`,
`arcColor`, `arcWidth`, `arcHeight`, and `markerElevation`.

Colors are RGB arrays in the 0–1 range. Locations are `[latitude, longitude]` in
degrees. `phi` and `theta` are radians. Markers are
`{ location, size, color?, id? }`; arcs are `{ from, to, color?, id? }`.
Marker color overrides are native. Arc width and height are global options.

## Exact pinned behavior relevant to the adapter

- **Dimensions:** pass CSS pixel width and height. The implementation multiplies
  both by `devicePixelRatio` internally, despite the documentation's pre-scaled
  sample. Set the canvas's CSS dimensions separately. Resize with both `width`
  and `height` in the same `update` call.
- **DPR/context:** captured at creation. `update({devicePixelRatio, context})` does
  not apply these two options; recreate the instance if they must change.
- **Rendering:** prefers WebGL2; otherwise WebGL1 with
  `ANGLE_instanced_arrays`. The globe draws a fullscreen triangle quad; markers
  use instanced quads, and arcs use instanced triangle strips. No context gives
  no-op `update`/`destroy` methods. There is no explicit readiness/failure API.
- **Wrapper:** creation inserts a relative, full-size wrapper around the canvas.
  Marker anchors are 1px absolute divs inside this wrapper, with native percentage
  `left` and `top` positions. Position the canvas and overlays consistently.
- **Native CSS anchoring:** a marker ID creates anchor name `--cobe-ID`; an arc ID
  creates `--cobe-arc-ID`. Use unique, application-generated CSS-safe IDs because
  the library interpolates IDs directly into CSS without escaping.
- **Native visibility:** a stylesheet appended to `document.head` sets variables
  on `:root`. A visible marker has `--cobe-visible-ID:N`; a hidden marker's
  variable is absent. Arc variables are `--cobe-visible-arc-ID`. The literal `N`
  is a sentinel, not numeric 1. CSS `opacity:var(--cobe-visible-ID,0)` works via
  the visible state's invalid value resolving to opacity's initial 1. JS should
  check for a nonempty variable, never `parseFloat(...)`. Hidden labels also need
  hit-testing disabled by the application.
- **Visibility geometry:** elevated points on the rear hemisphere remain visible
  when outside the globe silhouette, matching the native marker shader.
- **Texture readiness:** the internal embedded image loads asynchronously. Its
  onload uploads the texture but does not trigger another render. Schedule an
  update after initial image decoding, even with automatic rotation disabled.
- **Reduced motion:** not detected by COBE. Keep the adapter's animation loop
  stopped and call `update` for deliberate input, resize, theme, and data changes.
- **Context loss:** no upstream loss/restoration listeners or automatic resource
  rebuild. The adapter must prevent default loss handling where appropriate and
  recreate on restoration, restoring its own state.
- **Cleanup:** `destroy` deletes buffers, programs, anchor divs, and its root
  stylesheet. It does not remove the wrapper/canvas, cancel the internal image
  callback, explicitly delete its texture, or lose the GL context. The adapter
  owns animation cancellation and host DOM cleanup.
- **Arc updates:** marker/arc arrays upload before appearance options are applied
  during an update. If changing arc geometry settings, apply those settings first
  and refresh arcs in a subsequent update so buffers use the new values.

## Projection fallback only

Prefer native CSS anchors/anchor probes for label placement. If CSS anchor
positioning is unavailable, the following equations match this pinned release.
`W,H` are CSS pixel dimensions, `S` is scale, and offsets are CSS pixels.

```js
const a = lat * Math.PI / 180;
const b = lon * Math.PI / 180 - Math.PI;
const r = 0.8 + markerElevation;
const px = -Math.cos(a) * Math.cos(b) * r;
const py = Math.sin(a) * r;
const pz = Math.cos(a) * Math.sin(b) * r;
const cx = Math.cos(theta), sx = Math.sin(theta);
const cy = Math.cos(phi), sy = Math.sin(phi);
const rx = cy * px + sy * pz;
const ry = sy * sx * px + cx * py - cy * sx * pz;
const rz = -sy * cx * px + sx * py + cy * cx * pz;
const x = (((rx / (W / H)) * S + offsetX * S / W + 1) / 2) * W;
const y = ((-ry * S + offsetY * S / H + 1) / 2) * H;
const visible = rz >= 0 || rx * rx + ry * ry >= 0.64;
```

Derived from these equations, centering a location requires
`phi = -longitude * PI/180 - PI/2` (modulo `2*PI`) and
`theta = latitude * PI/180`. Interpolate the shortest wrapped angular path for
focus transitions; the renderer itself does not implement camera flights.

## Validation

The npm tarball's SHA-512 integrity and the bundle's SHA-256 were verified before
copying. A local Chromium smoke check rendered nonempty pixels with both WebGL2
and forced WebGL1, with zero GL errors. It confirmed internal DPR multiplication,
paired resize updates, immutable DPR, native visibility sentinels, the centering
equations above, and the cleanup behavior described here. No package code was
patched or rebuilt.
