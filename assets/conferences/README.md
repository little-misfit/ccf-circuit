# Conference artwork

These local image files are **unmodified copies of artwork served by the official
conference or organizing association websites**, retrieved on 2026-11-23. They
identify conference series in CCF-Schedule; they do not indicate sponsorship or
endorsement. Copyright and trademark rights remain with their respective owners.
No open-source license is asserted for these marks.

`../../conference-brands.js` maps uppercase event identities to a local image,
an accent color, the official source page, and an optional image-chip background.
Lookup priority is `ID:${event.id.toUpperCase()}`, then `TITLE:YEAR`, then the
undated `TITLE` key. Event-ID keys distinguish unrelated conferences that share
an acronym. Do not reuse an edition-specific file for a different year.
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
initial five series-level marks contain no year or host city. The three edition-specific
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

## Expanded coverage (2026-11-23)

The following additional files were found in the image or icon markup of the
linked official conference pages and visually checked before inclusion. Accent
colors are sampled from the original artwork; monochrome marks use neutral
`#707070` for contrast. Source images are unmodified. A dark chip is a display
choice for white/yellow artwork, not a claim about the conference brand palette.

| Key | Local file | Official page | Exact image URL | Accent |
| --- | --- | --- | --- | --- |
| AAMAS:2027 | `aamas-2027.jpg` | [Official](https://warwick.ac.uk/fac/sci/dcs/aamas2027/) | [Download](https://warwick.ac.uk/fac/sci/dcs/aamas2027/aamas27-logo-small.jpg) | `#136fb1` |
| COLING:2027 | `coling-2027.png` | [Official](https://2027.coling-iccl.org/) | [Download](https://2027.coling-iccl.org/assets/images/logo/coling2027-logo.png) | `#0083c6` |
| ECAI:2027 | `ecai-2027.svg` | [Official](https://ecai2027.org/) | [Download](https://ecai2027.org/assets/img/logos/ecai-2027-logo-light.svg) | `#f68b1f` |
| ICAPS | `icaps.png` | [Official](https://icaps27.icaps-conference.org/) | [Download](https://icaps27.icaps-conference.org/img/icapslogo.png) | `#f5821f` |
| KR:2027 | `kr-2027.png` | [Official](https://kr.org/KR2027/) | [Download](https://kr.org/KR2027/images/Logo-KR-BA.png) | `#1972bb` |
| EUROVIS:2027 | `eurovis-2027.svg` | [Official](https://eurovis27.github.io/web/) | [Download](https://eurovis27.github.io/web/_astro/logo_eurovis.w4HjceOT_Z1E5pR2.svg) | `#004191` |
| ICME:2027 | `icme-2027.png` | [Official](https://2027.ieeeicme.org/) | [Download](https://confcats-siteplex.s3.amazonaws.com/icme/images/favicons/icme27-logo-hr_favicon.png) | `#26ace2` |
| ICMR:2027 | `icmr-2027.svg` | [Official](https://www.icmr2027.org/) | [Download](https://www.icmr2027.org/media/icmr27-logo.svg) | `#932323` |
| INTERSPEECH:2027 | `interspeech-2027.svg` | [Official](https://interspeech2027.org/) | [Download](https://interspeech2027.org/assets/images/favicon.svg) | `#006b3c` |
| ACM SIGGRAPH:2027 | `acm-siggraph-2027.png` | [Official](https://s2027.siggraph.org/) | [Download](https://s2027.siggraph.org/wp-content/themes/siggraph2027/assets/images/2027-siggraph-logo-brand--purple.png) | `#db2c6f` |
| CADE:2027 | `cade-2027.png` | [Official](https://fscd-cade.science.ru.nl/) | [Download](https://fscd-cade.science.ru.nl/assets/logo-et6-fkTm.png) | `#707070` |
| CAV:2027 | `cav-2027.svg` | [Official](https://conferences.i-cav.org/2027/) | [Download](https://conferences.i-cav.org/2027/assets/img/cav-2027-logo-black.svg) | `#36c2de` |
| LICS | `lics.png` | [Official](https://lics.siglog.org/lics27/) | [Download](https://lics.siglog.org/lics20/images/lics-ico.png) | `#005100` |
| DASFAA:2027 | `dasfaa-2027.png` | [Official](https://dasfaa2027.github.io/) | [Download](https://dasfaa2027.github.io/_upload/tpl/02/82/642/template642/images/brand/dasfaa-2027-logo.png) | `#012b5f` |
| PODS:2027 | `pods-2027.png` | [Official](https://2027.sigmod.org/) | [Download](https://2027.sigmod.org/img27/logos/sigmod-pods27-logo.png?v=e9e05c477a93) | `#0a509a` |
| VLDB:2027 | `vldb-2027.webp` | [Official](https://www.vldb.org/2027/) | [Download](https://www.vldb.org/2027/assets/img/vldb2027-logo.webp) | `#dbb98b` |
| SIGOPS ATC:2027 | `sigops-atc-2027.svg` | [Official](https://atc.sigops.org/2027/) | [Download](https://atc.sigops.org/2027/icon.svg?icon.3q4y8uw13s1-r.svg) | `#ee7855` |
| HPDC:2027 | `hpdc-2027.png` | [Official](https://hpdc.sci.utah.edu/2027/) | [Download](https://hpdc.sci.utah.edu/2027/assets/images/logosmall.png) | `#ff0f10` |
| ICS:2027 | `ics-2027.png` | [Official](https://klab-ai3.github.io/ics2027/) | [Download](https://klab-ai3.github.io/ics2027/assets/images/logo.png) | `#707070` · dark chip |
| ISCA:2027 | `isca-2027.svg` | [Official](https://iscaconf.org/isca2027/) | [Download](https://iscaconf.org/isca2027/images/isca2027logo.svg) | `#b39051` |
| MOBILEHCI:2027 | `mobilehci-2027.png` | [Official](https://mobilehci.acm.org/2027/) | [Download](https://mobilehci.acm.org/2027/wp-content/uploads/2026/08/MOBILE-HCI2027-square-300x300.png) | `#54bec3` |
| UIST:2027 | `uist-2027.svg` | [Official](https://uist.acm.org/2027/) | [Download](https://uist.acm.org/2027/assets/uist27-branding/favicon.svg) | `#476a40` |
| ISMB:2027 | `ismb-2027.png` | [Official](https://www.iscb.org/ismbeccb2027/) | [Download](https://www.iscb.org/images/banners/banner.ConferenceBanner.ISMBECCB.2027.png) | `#354b66` |
| MOBISYS:2027 | `mobisys-2027.svg` | [Official](https://www.sigmobile.org/mobisys/2027/) | [Download](https://www.sigmobile.org/mobisys/2027/images/mobisys27/wordmark.svg) | `#707070` |
| SIGCOMM:2027 | `sigcomm-2027.svg` | [Official](https://conferences.sigcomm.org/sigcomm/2027/) | [Download](https://conferences.sigcomm.org/sigcomm/2027/img/primary/2027.svg) | `#1537b3` |
| DSN:2027 | `dsn-2027.png` | [Official](https://dsn2027-berlin.github.io/) | [Download](https://dsn2027-berlin.github.io/assets/logo.png) | `#143f92` |
| ID:IACR-FSE27 | `fse-2027.png` | [Official](https://fse.iacr.org/2027/) | [Download](https://fse.iacr.org/2027/images/FSE2027_logoTransparent.png) | `#001b54` |
| USENIX SECURITY:2027 | `usenix-security-2027.png` | [Official](https://www.usenix.org/conference/usenixsecurity27) | [Download](https://files.usenix.org/s3fs-public/sec27_wordmark_stacked_yellow.png) | `#ffcd1a` · dark chip |
| OSDI:2027 | `osdi-2027.png` | [Official](https://www.usenix.org/conference/osdi27) | [Download](https://files.usenix.org/s3fs-public/osdi27_logo_white_wordmark_510x268.png) | `#707070` · dark chip |

`SIGMOD:2027` and `PODS:2027` share the official joint SIGMOD/PODS 2027
artwork. `ICAPS` and `LICS` are undated series marks; all other entries in this
batch are limited to the inspected edition, including distinctive city artwork.
`ID:IACR-FSE27` is exclusively Fast Software Encryption (IACR, security). It must
not match the unrelated ACM Foundations of Software Engineering event `fse27`;
the latter retains its text fallback until its own artwork is verified. The
2026-11-23 snapshot's remaining mapped keys were checked for conflicting series
names and categories; no other ambiguous mapping was found.

NAACL 2027 currently uses the ACL parent association icon. It is not added as a
separate NAACL logo. Likewise, generic researchr, ACM, IACR, university, social
media, sponsor, and website-template icons are not used as conference identities.

### Additional popular conferences

| Key | Local file | Official page | Exact image URL | Accent |
| --- | --- | --- | --- | --- |
| ACM MM:2027 | `acm-mm-2027.svg` | [Official](https://2027.acmmm.org/) | Inline SVG favicon data URI in the official page head (decoded without changing its SVG bytes) | `#e22a72` |
| ICDE:2027 | `icde-2027.svg` | [Official](https://icde2027.github.io/) | [Download](https://icde2027.github.io/img/icde2027_logo_tiny.svg) | `#df273a` |
| PAKDD:2027 | `pakdd-2027.svg` | [Official](https://www.pakdd2027.org/) | [Download](https://www.pakdd2027.org/assets/img/favicon.svg) | `#9b86ff` |
| ASPLOS:2027 | `asplos-2027.png` | [Official](https://www.asplos-conference.org/asplos2027/cfp/) | [Download](https://www.asplos-conference.org/wp-content/uploads/2026/04/cropped-asplos27_logo_01.png) | `#25f7da` · dark chip |
| FAST:2028 | `fast-2028.png` | [Official](https://www.usenix.org/conference/fast28) | [Download](https://files.usenix.org/s3fs-public/fast28_logo_yellow_600x240.png) | `#fdb720` · dark chip |
| CHI:2027 | `chi-2027.png` | [Official](https://chi2027.acm.org/) | [Download](https://chi2027.acm.org/wp-content/uploads/2026/04/cropped-favicon-512x512-2-192x192.png) | `#274370` |
| WWW:2027 | `www-2027.png` | [Official](https://www2027.thewebconf.org/) | [Download](https://www2027.thewebconf.org/wp-content/uploads/2026/08/favicon.png) | `#17a638` |
| NDSS | `ndss.png` | [Official](https://www.ndss-symposium.org/ndss2027/) | [Download](https://www.ndss-symposium.org/wp-content/uploads/cropped-NDSS_512x512-192x192.png) | `#22a8d7` |
| FAST:2027 | `fast-2027.png` | [Official](https://www.usenix.org/conference/fast27) | [Download](https://files.usenix.org/s3fs-public/fast27_logo_white_600x240.png) | `#707070` · dark chip |
| NSDI:2027 | `nsdi-2027.png` | [Official](https://www.usenix.org/conference/nsdi27) | [Download](https://files.usenix.org/s3fs-public/nsdi27_logo_wordmark_500.png) | `#707070` · dark chip |

NDSS uses its undated padlock-and-globe mark. The other additions above are
restricted to the recorded edition. In particular, FAST 2027 and FAST 2028 have
separate artwork and do not substitute for one another. ACM MM 2027 publishes its
compact MM mark as an inline SVG favicon; its exact decoded source is retained.

Additional rejected candidates: SOSP 2026 uses a generic Bootstrap B favicon;
CCS 2027 currently displays the organizing SIGSAC association mark. Neither is
misrepresented here as the conference logo. Text-only conference headers and
inaccessible/unverified artwork continue to use the application fallback.

The collection now contains 48 lookup entries and 47 image files (9.23 MB total),
covering all ten CCF categories. Against the 2026-11-23 source snapshot, 32 of the
57 A/B conference editions with a future submission round have verified artwork.
This is a bounded collection of verified identities, not a claim that every CCF
conference has an available logo. The larger original CADE, DASFAA, and ICDE
files are retained unchanged. ICDE's SVG contains a local embedded PNG, and
SIGCOMM's SVG contains a local embedded ICC color profile; neither fetches remote
resources when displayed.
