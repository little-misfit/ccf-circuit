'use strict';

// Official conference artwork and sampled colors. See assets/conferences/README.md.
// Prefer ID:event-id, then TITLE:YEAR, then TITLE; ambiguous acronyms require an event ID.
window.CCF_BRANDS = Object.freeze({
  "ACL": Object.freeze({
    logo: "./assets/conferences/acl.svg",
    color: "#ed1e24",
    source: "https://www.aclweb.org/portal/",
  }),
  "ICML": Object.freeze({
    logo: "./assets/conferences/icml.svg",
    color: "#2a419e",
    background: "#24364f",
    source: "https://icml.cc/",
  }),
  "ICLR": Object.freeze({
    logo: "./assets/conferences/iclr.svg",
    color: "#60c332",
    source: "https://iclr.cc/",
  }),
  "NEURIPS": Object.freeze({
    logo: "./assets/conferences/neurips.svg",
    color: "#68448b",
    source: "https://neurips.cc/",
  }),
  "IJCAI": Object.freeze({
    logo: "./assets/conferences/ijcai.svg",
    color: "#707070",
    source: "https://ijcai.org/",
  }),
  "CVPR:2027": Object.freeze({
    logo: "./assets/conferences/cvpr-2027.svg",
    color: "#707070",
    background: "#24364f",
    source: "https://cvpr.thecvf.com/Conferences/2027",
  }),
  "ICCV:2027": Object.freeze({
    logo: "./assets/conferences/iccv-2027.svg",
    color: "#707070",
    background: "#24364f",
    source: "https://iccv.thecvf.com/Conferences/2027",
  }),
  "ECCV:2026": Object.freeze({
    logo: "./assets/conferences/eccv-2026.svg",
    color: "#707070",
    source: "https://eccv.ecva.net/Conferences/2026",
  }),
  "AAMAS:2027": Object.freeze({
    logo: "./assets/conferences/aamas-2027.jpg",
    color: "#136fb1",
    source: "https://warwick.ac.uk/fac/sci/dcs/aamas2027/",
  }),
  "COLING:2027": Object.freeze({
    logo: "./assets/conferences/coling-2027.png",
    color: "#0083c6",
    source: "https://2027.coling-iccl.org/",
  }),
  "ECAI:2027": Object.freeze({
    logo: "./assets/conferences/ecai-2027.svg",
    color: "#f68b1f",
    source: "https://ecai2027.org/",
  }),
  "ICAPS": Object.freeze({
    logo: "./assets/conferences/icaps.png",
    color: "#f5821f",
    source: "https://icaps27.icaps-conference.org/",
  }),
  "KR:2027": Object.freeze({
    logo: "./assets/conferences/kr-2027.png",
    color: "#1972bb",
    source: "https://kr.org/KR2027/",
  }),
  "EUROVIS:2027": Object.freeze({
    logo: "./assets/conferences/eurovis-2027.svg",
    color: "#004191",
    source: "https://eurovis27.github.io/web/",
  }),
  "ICME:2027": Object.freeze({
    logo: "./assets/conferences/icme-2027.png",
    color: "#26ace2",
    source: "https://2027.ieeeicme.org/",
  }),
  "ICMR:2027": Object.freeze({
    logo: "./assets/conferences/icmr-2027.svg",
    color: "#932323",
    source: "https://www.icmr2027.org/",
  }),
  "INTERSPEECH:2027": Object.freeze({
    logo: "./assets/conferences/interspeech-2027.svg",
    color: "#006b3c",
    source: "https://interspeech2027.org/",
  }),
  "ACM SIGGRAPH:2027": Object.freeze({
    logo: "./assets/conferences/acm-siggraph-2027.png",
    color: "#db2c6f",
    source: "https://s2027.siggraph.org/",
  }),
  "CADE:2027": Object.freeze({
    logo: "./assets/conferences/cade-2027.png",
    color: "#707070",
    source: "https://fscd-cade.science.ru.nl/",
  }),
  "CAV:2027": Object.freeze({
    logo: "./assets/conferences/cav-2027.svg",
    color: "#36c2de",
    source: "https://conferences.i-cav.org/2027/",
  }),
  "LICS": Object.freeze({
    logo: "./assets/conferences/lics.png",
    color: "#005100",
    source: "https://lics.siglog.org/lics27/",
  }),
  "DASFAA:2027": Object.freeze({
    logo: "./assets/conferences/dasfaa-2027.png",
    color: "#012b5f",
    source: "https://dasfaa2027.github.io/",
  }),
  "PODS:2027": Object.freeze({
    logo: "./assets/conferences/pods-2027.png",
    color: "#0a509a",
    source: "https://2027.sigmod.org/",
  }),
  "VLDB:2027": Object.freeze({
    logo: "./assets/conferences/vldb-2027.webp",
    color: "#dbb98b",
    source: "https://www.vldb.org/2027/",
  }),
  "SIGOPS ATC:2027": Object.freeze({
    logo: "./assets/conferences/sigops-atc-2027.svg",
    color: "#ee7855",
    source: "https://atc.sigops.org/2027/",
  }),
  "HPDC:2027": Object.freeze({
    logo: "./assets/conferences/hpdc-2027.png",
    color: "#ff0f10",
    source: "https://hpdc.sci.utah.edu/2027/",
  }),
  "ICS:2027": Object.freeze({
    logo: "./assets/conferences/ics-2027.png",
    color: "#707070",
    source: "https://klab-ai3.github.io/ics2027/",
    background: "#24364f",
  }),
  "ISCA:2027": Object.freeze({
    logo: "./assets/conferences/isca-2027.svg",
    color: "#b39051",
    source: "https://iscaconf.org/isca2027/",
  }),
  "MOBILEHCI:2027": Object.freeze({
    logo: "./assets/conferences/mobilehci-2027.png",
    color: "#54bec3",
    source: "https://mobilehci.acm.org/2027/",
  }),
  "UIST:2027": Object.freeze({
    logo: "./assets/conferences/uist-2027.svg",
    color: "#476a40",
    source: "https://uist.acm.org/2027/",
  }),
  "ISMB:2027": Object.freeze({
    logo: "./assets/conferences/ismb-2027.png",
    color: "#354b66",
    source: "https://www.iscb.org/ismbeccb2027/",
  }),
  "MOBISYS:2027": Object.freeze({
    logo: "./assets/conferences/mobisys-2027.svg",
    color: "#707070",
    source: "https://www.sigmobile.org/mobisys/2027/",
  }),
  "SIGCOMM:2027": Object.freeze({
    logo: "./assets/conferences/sigcomm-2027.svg",
    color: "#1537b3",
    source: "https://conferences.sigcomm.org/sigcomm/2027/",
  }),
  "DSN:2027": Object.freeze({
    logo: "./assets/conferences/dsn-2027.png",
    color: "#143f92",
    source: "https://dsn2027-berlin.github.io/",
  }),
  "ID:IACR-FSE27": Object.freeze({
    logo: "./assets/conferences/fse-2027.png",
    color: "#001b54",
    source: "https://fse.iacr.org/2027/",
  }),
  "USENIX SECURITY:2027": Object.freeze({
    logo: "./assets/conferences/usenix-security-2027.png",
    color: "#ffcd1a",
    source: "https://www.usenix.org/conference/usenixsecurity27",
    background: "#24364f",
  }),
  "OSDI:2027": Object.freeze({
    logo: "./assets/conferences/osdi-2027.png",
    color: "#707070",
    source: "https://www.usenix.org/conference/osdi27",
    background: "#24364f",
  }),
  "SIGMOD:2027": Object.freeze({
    logo: "./assets/conferences/pods-2027.png",
    color: "#0a509a",
    source: "https://2027.sigmod.org/",
  }),
  "ACM MM:2027": Object.freeze({
    logo: "./assets/conferences/acm-mm-2027.svg",
    color: "#e22a72",
    source: "https://2027.acmmm.org/",
  }),
  "ICDE:2027": Object.freeze({
    logo: "./assets/conferences/icde-2027.svg",
    color: "#df273a",
    source: "https://icde2027.github.io/",
  }),
  "PAKDD:2027": Object.freeze({
    logo: "./assets/conferences/pakdd-2027.svg",
    color: "#9b86ff",
    source: "https://www.pakdd2027.org/",
  }),
  "ASPLOS:2027": Object.freeze({
    logo: "./assets/conferences/asplos-2027.png",
    color: "#25f7da",
    source: "https://www.asplos-conference.org/asplos2027/cfp/",
    background: "#24364f",
  }),
  "FAST:2028": Object.freeze({
    logo: "./assets/conferences/fast-2028.png",
    color: "#fdb720",
    source: "https://www.usenix.org/conference/fast28",
    background: "#24364f",
  }),
  "CHI:2027": Object.freeze({
    logo: "./assets/conferences/chi-2027.png",
    color: "#274370",
    source: "https://chi2027.acm.org/",
  }),
  "WWW:2027": Object.freeze({
    logo: "./assets/conferences/www-2027.png",
    color: "#17a638",
    source: "https://www2027.thewebconf.org/",
  }),
  "NDSS": Object.freeze({
    logo: "./assets/conferences/ndss.png",
    color: "#22a8d7",
    source: "https://www.ndss-symposium.org/ndss2027/",
  }),
  "FAST:2027": Object.freeze({
    logo: "./assets/conferences/fast-2027.png",
    color: "#707070",
    source: "https://www.usenix.org/conference/fast27",
    background: "#24364f",
  }),
  "NSDI:2027": Object.freeze({
    logo: "./assets/conferences/nsdi-2027.png",
    color: "#707070",
    source: "https://www.usenix.org/conference/nsdi27",
    background: "#24364f",
  }),
});
