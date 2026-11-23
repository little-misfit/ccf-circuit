# Conference artwork

These local SVG files are **unmodified copies of artwork served by the official
conference or organizing association websites**, retrieved on 2026-11-23. They
identify conference series in CCF-Schedule; they do not indicate sponsorship or
endorsement. Copyright and trademark rights remain with their respective owners.
No open-source license is asserted for these marks.

`../../conference-brands.js` maps uppercase conference titles to a local image,
an accent color, the official source page, and an optional image-chip background.
Edition-specific artwork uses `TITLE:YEAR` keys; look up that key first, then the
undated `TITLE` key. Do not reuse an edition-specific file for a different year.
Load this classic script before the scripts that render conference cards and globe
labels. Titles absent from the manifest use the application's text fallback.

| Title | File | Official source page | Exact download URL | Accent selection |
| --- | --- | --- | --- | --- |
| ACL | `acl.svg` | [ACL Member Portal](https://www.aclweb.org/portal/) | [Official SVG favicon](https://www.aclweb.org/portal/sites/default/themes/acl_common/images/favicon.svg) | `#ed1e24`, the mark's exact red fill. |
| ICML | `icml.svg` | [ICML](https://icml.cc/) | [Official navbar mark](https://icml.cc/static/core/img/icml-navbar-logo.svg) | `#2a419e`, the blue square in the multicolor mark. A `#24364f` chip background makes its light head silhouette legible. The background is a presentation choice, not a claimed brand color. |
| ICLR | `iclr.svg` | [ICLR](https://iclr.cc/) | [Official navbar mark](https://iclr.cc/static/core/img/iclr-navbar-logo.svg) | `#60c332`, the green used in the mark's gradient and squares (`rgb(96,195,50)`). |
| NeurIPS | `neurips.svg` | [NeurIPS](https://neurips.cc/) | [Official navbar mark](https://neurips.cc/static/core/img/neurips-navbar-logo.svg) | `#68448b`, the darker purple in the mark. |
| IJCAI | `ijcai.svg` | [IJCAI](https://ijcai.org/) | [Official SVG favicon](https://ijcai.org/wp-content/themes/ijcai/assets/img/favicon.svg?v=2) | The source is black and white. Neutral `#707070` is a contrast adjustment for the card accent; the logo itself is unchanged. |
| CVPR:2027 | `cvpr-2027.svg` | [CVPR 2027](https://cvpr.thecvf.com/Conferences/2027) | [Official navbar mark](https://cvpr.thecvf.com/static/core/img/cvpr-navbar-logo.svg) | White Seattle artwork; neutral `#707070` is a contrast-adjusted card accent. A `#24364f` chip background makes the original white mark visible. |
| ICCV:2027 | `iccv-2027.svg` | [ICCV 2027](https://iccv.thecvf.com/Conferences/2027) | [Official navbar mark](https://iccv.thecvf.com/static/core/img/iccv-navbar-logo.svg) | Monochrome Hong Kong artwork (`#37353f` linework and white areas); neutral `#707070` is a contrast-adjusted card accent. A `#24364f` chip background improves the small white skyline's visibility. |
| ECCV:2026 | `eccv-2026.svg` | [ECCV 2026](https://eccv.ecva.net/Conferences/2026) | [Official navbar mark](https://eccv.ecva.net/static/core/img/eccv-navbar-logo.svg) | Monochrome Malmö artwork (`#231f20` and `#bcbec0`); neutral `#707070` is a contrast-adjusted card accent. |

The compact navbar/favicons were chosen over full wordmarks where available. The
five series-level marks contain no year or host city. The three edition-specific
marks retain all original text and artwork; their keys prevent reuse for another
edition. The upstream navbar download URLs can change with each conference year,
so the local filenames and fixed-year source pages record the versions inspected.

## Deliberate omissions

- **AAAI:** the [official logo page](https://aaai.org/about-aaai/aaai-logos/)
  explicitly limits use to approved/sponsored events or separate permission. No
  AAAI artwork is included.
- **Other CVPR, ICCV, and ECCV editions:** the included artwork depicts specific
  years and locations; other editions use the text fallback unless their official
  logos are separately verified and added under matching year keys.
- **NAACL and EMNLP:** no reliable undated series mark was located on the official
  sources checked. No substitute or generated artwork is used.

To add another series, first verify the artwork on its official site, retain an
unmodified local copy, record its exact download URL and color choice here, and
inspect the rendered image on the chip background used by the application.
