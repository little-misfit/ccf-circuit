# globe.gl 2.46.2

Locally served, unmodified UMD browser bundle. It exposes `window.Globe` and
includes its Three.js renderer and controls, so no runtime CDN import is needed.

- Upstream: https://github.com/vasturiano/globe.gl/tree/v2.46.2
- npm archive: https://registry.npmjs.org/globe.gl/-/globe.gl-2.46.2.tgz
- Bundle within archive: `package/dist/globe.gl.min.js`
- SHA-256 of `globe.gl.min.js`:
  `2c3e445c04d121215910a89688b96091c8a72071c122a4f830081a39b636c94c`
- npm archive integrity:
  `sha512-oh5fx/sTVtFa06OrLXxgfZ5TV1xhDzLKw0muc0fxJfpHrvfDNRspGqrgURpEBBYWS7REzQA78vodUrjbpfYoqA==`
- Main license: MIT, reproduced in `LICENSE`.
- Bundled dependency licenses: `THIRD_PARTY_NOTICES.txt`. The package list comes
  from the official distribution's source map; version selection follows the
  upstream `v2.46.2` `yarn.lock`.

The source map is not needed at runtime and is not shipped. The minified bundle
does not reference a source-map URL. It includes Three.js r185 and requires a
browser with WebGL2 support. The application supplies its own no-WebGL fallback.

Constructor: `new Globe(element, options)`. Data layers, camera and controls are
configured on that instance. For points with click handlers keep
`pointsMerge(false)`; `onPointClick` does not work with merged points.

Official API documentation:
https://github.com/vasturiano/globe.gl/blob/v2.46.2/README.md
