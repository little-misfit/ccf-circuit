'use strict';
(() => {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const autoCardFor = point => point.next || point.undated;
  const cardFor = point => point.next || point.undated || point.primary;
  const brandFor = point => {
    const card = cardFor(point);
    if (!card) return null;
    const title = card.title.toUpperCase();
    return window.CCF_BRANDS?.[`ID:${card.id.toUpperCase()}`] || window.CCF_BRANDS?.[`${title}:${card.year}`] || window.CCF_BRANDS?.[title] || null;
  };
  const rgb = color => color.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16));
  const mix = (color, target, amount) => {
    const from = rgb(color), to = rgb(target);
    return '#' + from.map((value, i) => Math.round(value + (to[i] - value) * amount).toString(16).padStart(2, '0')).join('');
  };
  const accentFor = point => brandFor(point)?.color || '#526d90';
  const markerSizeFor = point => point.hot ? .035 : .028;
  const formatCountdown = at => {
    const seconds = Math.max(0, Math.floor((at - Date.now()) / 1000));
    const days = Math.floor(seconds / 86400);
    return `${days}d ${[Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':')}`;
  };
  const monogramFor = title => {
    if (!title) return 'CITY';
    const clean = title.trim();
    if (clean.length <= 5) return clean;
    const parts = clean.split(/[\s-]+/).filter(Boolean);
    if (parts.length > 1) return parts.map(p => p[0]).join('').slice(0, 4).toUpperCase();
    return clean.slice(0, 4).toUpperCase();
  };

  let instanceCount = 0;
  const radians = degrees => degrees * Math.PI / 180;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const angleDelta = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

  class CCFGlobe {
    constructor(element, options) {
      this.element = element;
      this.stage = element.parentElement;
      this.options = options;
      this.locations = [];
      this.markers = [];
      this.labels = new Map();
      this.available = false;
      this.playing = !motionPreference.matches;
      this.hovered = false;
      this.focused = false;
      this.visible = true;
      this.highlight = null;
      this.hoverKey = null;
      this.hoveredCardKey = null;
      this.externalHoverKey = null;
      this.promotedKey = null;
      this.pointers = new Map();
      this.prefix = `ccf-${++instanceCount}-`;
      this.layer = document.getElementById('globe-labels');
      this.connectors = this.stage.querySelector('.globe-connectors');
      this.anchorLayer = document.createElement('div');
      this.anchorLayer.className = 'globe-anchors';
      this.anchorLayer.setAttribute('aria-hidden', 'true');
      this.stage.insertBefore(this.anchorLayer, this.connectors);
      this.nativeAnchors = CSS.supports('position-anchor: --cobe-probe') && CSS.supports('left: anchor(center)');
      this.width = this.stage.clientWidth;
      this.height = this.stage.clientHeight;
      this.view = { phi: -radians(100) - Math.PI / 2, theta: radians(25), scale: this.homeScale() };
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      element.append(this.canvas);
      try {
        if (typeof window.createCobe !== 'function') throw new Error('COBE unavailable');
        this.globe = window.createCobe(this.canvas, {
          width: this.width, height: this.height,
          devicePixelRatio: Math.min(devicePixelRatio || 1, 2),
          ...this.view, offset: this.offset, dark: 1, diffuse: 1.35,
          mapSamples: 22000, mapBrightness: 6.2, mapBaseBrightness: .06,
          baseColor: [.52, .50, .47], markerColor: [.92, .90, .86],
          glowColor: [.13, .14, .17], markerElevation: .01,
          opacity: 1, markers: [],
          context: { alpha: true, antialias: true, powerPreference: 'low-power' }
        });
        this.context = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        if (!this.context || this.context.isContextLost()) throw new Error('WebGL unavailable');
        const program = this.context.getParameter(this.context.CURRENT_PROGRAM);
        if (!program || !this.context.getProgramParameter(program, this.context.LINK_STATUS)) throw new Error('Globe shaders unavailable');
        if (!this.context.drawArraysInstanced && !this.context.getExtension('ANGLE_instanced_arrays')) throw new Error('Geographic markers unavailable');
        this.canvas.parentElement.append(this.anchorLayer);
        this.available = true;
        this.warmupUntil = performance.now() + 1500;
        this.stage.dataset.renderer = 'cobe';
        document.getElementById('globe-status').hidden = true;
        this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.fallback(); });
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.stage);
        this.intersectionObserver = new IntersectionObserver(entries => {
          this.visible = entries[0].isIntersecting;
          this.syncMotion();
        });
        this.intersectionObserver.observe(this.stage);
        this.stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { this.hovered = true; this.syncMotion(); } });
        this.stage.addEventListener('pointerleave', () => { this.hovered = false; this.hoverKey = null; this.hoveredCardKey = null; this.promotedKey = null; this.syncMotion(); });
        this.stage.addEventListener('focusin', e => { this.focused = e.target.matches(':focus-visible'); this.syncMotion(); });
        this.stage.addEventListener('focusout', e => { this.focused = this.stage.contains(e.relatedTarget) && e.relatedTarget.matches(':focus-visible'); this.syncMotion(); });
        document.addEventListener('visibilitychange', () => this.syncMotion());
        motionPreference.addEventListener('change', () => {
          if (motionPreference.matches) {
            this.playing = false;
            if (this.transition) { this.view = this.transition.to; this.transition = null; }
          }
          this.syncMotion(); this.draw();
        });
        element.addEventListener('keydown', event => this.keydown(event));
        this.bindPointerControls();
        this.syncMotion();
        this.draw();
      } catch (error) {
        this.fallback();
      }
    }

    homeScale() { return Math.min(.98, this.width / this.height * 1.1); }
    get offset() { return [0, this.width < 600 ? 90 : 0]; }
    get globeRadius() { return this.height * .4 * this.view.scale; }
    get rippleRadius() { return clamp(this.globeRadius * .17, 24, 54); }
    get activeHoverKey() { return this.hoveredCardKey || this.hoverKey || this.externalHoverKey; }

    resize() {
      if (!this.available) return;
      const ratio = this.view.scale / this.homeScale();
      this.width = this.stage.clientWidth;
      this.height = this.stage.clientHeight;
      this.transition = null;
      this.view.scale = this.homeScale() * ratio;
      // COBE 2.0.1 multiplies CSS dimensions by DPR internally; send both on resize.
      this.globe.update({ width: this.width, height: this.height, ...this.view, offset: this.offset });
      this.layoutLabels(); this.updateZoomButtons();
    }

    fallback() {
      this.available = false;
      cancelAnimationFrame(this.frame);
      this.resizeObserver?.disconnect(); this.intersectionObserver?.disconnect();
      this.globe?.destroy();
      this.element.hidden = true;
      this.layer.hidden = true;
      this.anchorLayer.hidden = true;
      this.connectors.setAttribute('hidden', '');
      this.stage.dataset.renderer = 'map';
      document.getElementById('map').removeAttribute('hidden');
      const status = document.getElementById('globe-status');
      status.textContent = 'Map view on this device'; status.hidden = false;
      document.getElementById('globe-hint').textContent = 'Zoom in to pan the map';
      document.getElementById('globe-motion').hidden = true;
      this.options.onUnavailable?.();
    }

    syncMotion() {
      if (!this.available) return;
      const active = this.visible && !document.hidden;
      this.stage.classList.toggle('motion-paused', !active);
      const button = document.getElementById('globe-motion');
      button.textContent = this.playing ? 'Ⅱ' : '▷';
      button.setAttribute('aria-pressed', String(this.playing));
      button.setAttribute('aria-label', this.playing ? 'Pause rotation' : 'Start rotation');
      button.title = button.getAttribute('aria-label');
      cancelAnimationFrame(this.frame);
      this.lastFrame = performance.now();
      if (active) {
        this.draw();
        this.frame = requestAnimationFrame(now => this.animate(now));
      }
    }

    animate(now) {
      if (!this.available || !this.visible || document.hidden) return;
      const seconds = Math.min((now - this.lastFrame) / 1000, .05);
      this.lastFrame = now;
      if (this.transition) {
        const t = clamp((now - this.transition.start) / this.transition.duration, 0, 1);
        const eased = t * t * (3 - 2 * t);
        for (const key of ['phi', 'theta', 'scale']) this.view[key] = this.transition.from[key] + (this.transition.to[key] - this.transition.from[key]) * eased;
        if (t === 1) this.transition = null;
        this.draw();
      } else if (this.playing && !this.hovered && !this.focused && !this.pointers.size) {
        this.view.phi += seconds * .08;
        this.draw();
      } else if (now < this.warmupUntil) {
        // The bundled map decodes asynchronously without a readiness callback.
        // Initial still frames let it appear with reduced motion or paused rotation.
        this.draw();
      }
      if (this.transition || now < this.warmupUntil || (this.playing && !this.hovered && !this.focused)) this.frame = requestAnimationFrame(time => this.animate(time));
    }

    draw() {
      if (!this.available) return;
      this.globe.update({ ...this.view, offset: this.offset });
      this.layoutLabels(); this.updateZoomButtons();
    }

    setView(partial, animate = false) {
      if (!this.available) return;
      const to = { ...this.view, ...partial };
      to.phi = this.view.phi + angleDelta(to.phi - this.view.phi);
      to.theta = clamp(to.theta, -Math.PI / 2 + .02, Math.PI / 2 - .02);
      to.scale = clamp(to.scale, this.homeScale() * .65, this.homeScale() * 2.8);
      if (animate && !motionPreference.matches) {
        this.transition = { from: { ...this.view }, to, start: performance.now(), duration: typeof animate === 'number' ? animate : 750 };
        this.syncMotion();
      } else {
        this.transition = null; this.view = to; this.draw();
      }
    }

    stopRotation() { this.playing = false; this.syncMotion(); }
    toggleRotation() { this.playing = !this.playing; this.syncMotion(); }

    syncHoverStyles() {
      const key = this.activeHoverKey;
      for (const [k, entry] of this.labels) {
        const hovered = k === key;
        entry.pin.classList.toggle('hovered', hovered);
        entry.line.classList.toggle('hovered', hovered);
      }
    }

    updateHoverState(prop, nextKey) {
      const normalized = nextKey || null;
      if (this[prop] === normalized) return;
      this[prop] = normalized;
      const active = this.activeHoverKey;
      let needsLayout = false;
      if (normalized && prop !== 'hoveredCardKey' && this.labels.get(normalized)?.button.hidden) {
        this.promotedKey = normalized;
        needsLayout = true;
      } else if (this.promotedKey && active !== this.promotedKey) {
        this.promotedKey = null;
        needsLayout = true;
      }
      if (needsLayout) this.layoutLabels();
      else this.syncHoverStyles();
    }

    highlightCity(key) {
      if (!this.available) return;
      this.updateHoverState('externalHoverKey', key);
    }

    focusCity(key) {
      if (!this.available) return;
      const point = this.locations.find(p => p.key === key);
      if (!point) return;
      this.stopRotation();
      this.focusLocation(point, true);
    }

    bindPointerControls() {
      this.canvas.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        this.stopRotation(); this.transition = null;
        this.element.focus({ preventScroll: true });
        this.canvas.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.pointerStart = { x: event.clientX, y: event.clientY };
        this.dragged = this.pointers.size > 1;
        this.canvas.classList.add('dragging');
      });
      this.canvas.addEventListener('pointermove', event => {
        const previous = this.pointers.get(event.pointerId);
        if (!previous) {
          const point = this.nearbyLocation(event);
          this.canvas.style.cursor = point ? 'pointer' : 'grab';
          this.updateHoverState('hoverKey', point?.key || null);
          return;
        }
        const current = { x: event.clientX, y: event.clientY };
        if (this.pointers.size > 1) {
          const other = [...this.pointers].find(([id]) => id !== event.pointerId)[1];
          const before = Math.hypot(previous.x - other.x, previous.y - other.y);
          const after = Math.hypot(current.x - other.x, current.y - other.y);
          if (before > 2) this.setView({ scale: this.view.scale * after / before });
          this.dragged = true;
        } else {
          if (Math.hypot(current.x - this.pointerStart.x, current.y - this.pointerStart.y) > 5) this.dragged = true;
          const speed = Math.PI / (2 * this.globeRadius);
          this.setView({ phi: this.view.phi + (current.x - previous.x) * speed, theta: this.view.theta + (current.y - previous.y) * speed });
        }
        this.pointers.set(event.pointerId, current);
      });
      const end = event => {
        const tracked = this.pointers.has(event.pointerId);
        this.pointers.delete(event.pointerId);
        if (!this.pointers.size) this.canvas.classList.remove('dragging');
        if (tracked && event.type === 'pointerup' && !this.dragged) this.selectNearbyLocation(event);
      };
      this.canvas.addEventListener('pointerup', end);
      this.canvas.addEventListener('pointercancel', end);
      this.canvas.addEventListener('lostpointercapture', end);
      this.canvas.addEventListener('wheel', event => {
        event.preventDefault(); this.stopRotation();
        this.setView({ scale: this.view.scale * Math.exp(-clamp(event.deltaY, -100, 100) * .002) });
      }, { passive: false });
    }

    projectLocation(point, cachedBounds = null, cachedRootStyle = null) {
      const entry = this.labels.get(point.key);
      if (this.nativeAnchors && entry) {
        const bounds = cachedBounds || this.stage.getBoundingClientRect();
        const at = entry.anchor.getBoundingClientRect();
        const rootStyle = cachedRootStyle || getComputedStyle(document.documentElement);
        const visible = rootStyle.getPropertyValue(`--cobe-visible-${point.markerId}`).trim();
        return { x: at.left - bounds.left, y: at.top - bounds.top, visible: Boolean(visible && visible !== '0') };
      }
      // Progressive fallback for browsers without CSS anchors. These equations
      // match the pinned COBE 2.0.1 projection; rendering still belongs to COBE.
      const lat = radians(point.lat), lon = radians(point.lng) - Math.PI, r = .81;
      const x = -Math.cos(lat) * Math.cos(lon) * r, y = Math.sin(lat) * r, z = Math.cos(lat) * Math.sin(lon) * r;
      const { phi, theta, scale } = this.view;
      const rx = Math.cos(phi) * x + Math.sin(phi) * z;
      const ry = Math.sin(phi) * Math.sin(theta) * x + Math.cos(theta) * y - Math.cos(phi) * Math.sin(theta) * z;
      const rz = -Math.sin(phi) * Math.cos(theta) * x + Math.sin(theta) * y + Math.cos(phi) * Math.cos(theta) * z;
      return { x: this.width / 2 + rx * this.height * scale / 2, y: this.height / 2 - ry * this.height * scale / 2 + this.offset[1] * scale / 2, visible: rz >= 0 || rx * rx + ry * ry >= .64 };
    }

    setLocations(locations, opts = {}) {
      if (!this.available) return;
      this.mode = opts.mode || 'deadline';
      this.stage.dataset.mode = this.mode;
      this.locations = locations.map(p => ({ ...p, markerId: this.prefix + p.key.replace(/[^\w-]/g, '_') }));
      const keys = new Set(locations.map(p => p.key));
      if (this.promotedKey && !keys.has(this.promotedKey)) this.promotedKey = null;
      if (this.hoveredCardKey && !keys.has(this.hoveredCardKey)) this.hoveredCardKey = null;
      if (this.hoverKey && !keys.has(this.hoverKey)) this.hoverKey = null;
      for (const [key, entry] of this.labels) {
        if (!keys.has(key)) { entry.button.remove(); entry.line.remove(); entry.anchor.remove(); entry.ripple.remove(); entry.pin.remove(); this.labels.delete(key); }
      }
      for (const p of this.locations) {
        let entry = this.labels.get(p.key);
        if (!entry) {
          const button = document.createElement('button');
          button.className = 'globe-tag';
          button.hidden = true;
          const header = document.createElement('span'); header.className = 'globe-tag-header';
          const logoFrame = document.createElement('span'); logoFrame.className = 'globe-tag-logo-frame';
          const logo = document.createElement('img'); logo.className = 'globe-tag-logo'; logo.alt = ''; logo.hidden = true;
          logo.loading = 'lazy'; logo.decoding = 'async';
          const monogram = document.createElement('span'); monogram.className = 'globe-tag-monogram';
          logoFrame.setAttribute('aria-hidden', 'true');
          logoFrame.append(logo, monogram);
          logo.addEventListener('error', () => { logo.dataset.failed = logo.getAttribute('src'); logo.hidden = true; monogram.hidden = false; });
          const identity = document.createElement('span'); identity.className = 'globe-tag-identity';
          const heading = document.createElement('span'); heading.className = 'globe-tag-heading';
          const location = document.createElement('span'); location.className = 'globe-tag-location';
          const timer = document.createElement('span'); timer.className = 'globe-countdown';
          const kind = document.createElement('span'); kind.className = 'globe-tag-kind';
          identity.append(heading, location);
          header.append(logoFrame, identity);
          button.append(header, timer, kind);
          button.addEventListener('pointerenter', () => this.updateHoverState('hoveredCardKey', p.key));
          button.addEventListener('pointerleave', () => {
            if (this.hoveredCardKey === p.key) this.updateHoverState('hoveredCardKey', null);
          });
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const anchor = document.createElement('span'); anchor.className = 'globe-anchor';
          anchor.style.positionAnchor = `--cobe-${p.markerId}`;
          const ripple = document.createElement('span'); ripple.className = 'globe-ripple';
          ripple.dataset.city = p.key; ripple.hidden = true;
          const pin = document.createElement('span'); pin.className = 'globe-pin';
          pin.dataset.city = p.key; pin.hidden = true;
          this.anchorLayer.append(anchor, ripple, pin);
          this.layer.append(button); this.connectors.append(line);
          entry = { button, heading, location, timer, kind, line, logo, monogram, anchor, ripple, pin };
          this.labels.set(p.key, entry);
        }
        entry.point = p;
        const card = cardFor(p), brand = brandFor(p), accent = accentFor(p);
        for (const [name, value] of Object.entries({
          accent, edge: mix(accent, '#73809a', .3), ink: mix(accent, '#182338', .42), surface: mix(accent, '#ffffff', .94),
          border: mix(accent, '#ffffff', .55), light: mix(accent, '#ffffff', .67)
        })) entry.button.style.setProperty('--tag-' + name, value);
        entry.button.style.setProperty('--tag-logo-background', brand?.background || '#ffffff');
        entry.line.style.stroke = mix(accent, '#ffffff', .65);
        entry.ripple.style.color = mix(accent, '#ffffff', .55);
        entry.pin.style.backgroundColor = mix(accent, '#ffffff', p.hot ? .45 : .3);
        entry.pin.classList.toggle('hot', p.hot);
        entry.monogram.textContent = card ? monogramFor(card.title) : 'CITY';
        entry.logo.hidden = !brand?.logo || entry.logo.dataset.failed === brand.logo;
        entry.monogram.hidden = !entry.logo.hidden;
        if (brand?.logo) {
          if (entry.logo.getAttribute('src') !== brand.logo) entry.logo.src = brand.logo;
        } else entry.logo.removeAttribute('src');
        entry.button.dataset.brand = brand ? card.title.toUpperCase() : '';
        entry.button.classList.toggle('hot', p.hot);
        entry.button.classList.toggle('has-deadline', Boolean(p.next));
        entry.button.dataset.city = p.key;
        if (card) entry.button.dataset.open = card.id;
        else delete entry.button.dataset.open;
        const extra = p.events.length > 1 ? ` · +${p.events.length - 1} more` : '';
        const nextKind = p.next?.type === 'conference' ? 'Conference' : p.next?.type === 'abstract' ? 'Abstract' : 'Paper';
        entry.heading.textContent = card ? `${card.title} ${card.year}` : p.name;
        entry.location.textContent = p.next
          ? `${nextKind} · ${p.name}`
          : card
            ? `${p.name}${extra}`
            : `${p.name} · ${p.events.length} ${p.events.length === 1 ? 'conference' : 'conferences'}`;
        entry.kind.textContent = p.hot
          ? (this.mode === 'meet' ? 'Next conference' : 'Next deadline')
          : p.next
            ? (p.next.type === 'conference' ? 'Conference date' : p.next.type === 'abstract' ? 'Abstract deadline' : 'Paper deadline')
            : p.undated
              ? (p.undated.status || 'Deadline TBA')
              : p.primary?.status || 'View conferences';
        entry.button.setAttribute('aria-label', `${entry.heading.textContent}, ${p.name}, ${p.next ? (p.next.type === 'conference' ? 'conference countdown' : (p.next.type === 'abstract' ? 'abstract' : 'paper') + ' submission countdown') + '. View details' : p.undated ? `${p.undated.status || 'Deadline to be announced'}. View details` : card ? `${p.primary?.status || 'Conference'}. View details` : 'View conferences'}`);
        entry.button.title = `${entry.heading.textContent} · ${entry.location.textContent}`;
      }
      this.markers = this.locations.map(p => ({
        id: p.markerId, location: [p.lat, p.lng], size: markerSizeFor(p),
        color: rgb(mix(accentFor(p), '#ffffff', p.hot ? .45 : .3)).map(value => value / 255)
      }));
      this.globe.update({ markers: this.markers });
      // Anchor-positioned DOM must follow COBE's anchors in their containing block.
      this.canvas.parentElement.append(this.anchorLayer);
      this.updateCountdowns();
      const focus = this.locations.find(p => p.hot) || (this.locations.length === 1 ? this.locations[0] : null);
      const target = focus ? `${focus.key}:${cardFor(focus)?.id}:${focus.next?.at}` : null;
      if (target && target !== this.highlight) this.focusLocation(focus, this.highlight !== null);
      this.highlight = target;
      this.layoutLabels();
    }

    updateCountdowns() {
      for (const { point, timer } of this.labels.values()) {
        timer.textContent = point.next
          ? formatCountdown(point.next.at)
          : point.undated
            ? (point.undated.status || 'Deadline TBA')
            : point.primary?.status || (this.mode === 'meet' ? 'Ended' : 'No upcoming deadline');
      }
    }

    focusLocation(point, animate = true) {
      if (!point) return;
      this.setView({ phi: -radians(point.lng) - Math.PI / 2, theta: radians(point.lat), scale: this.homeScale() }, animate);
    }

    focusNearest() { this.stopRotation(); this.focusLocation(this.locations.find(p => p.hot)); }

    nearbyLocation(event) {
      const bounds = this.stage.getBoundingClientRect();
      const rootStyle = this.nativeAnchors ? getComputedStyle(document.documentElement) : null;
      const mouse = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      let nearest = null, distance = matchMedia('(pointer: coarse)').matches ? 28 : 18;
      for (const point of this.locations) {
        const at = this.projectLocation(point, bounds, rootStyle);
        if (!at.visible) continue;
        const delta = Math.hypot(at.x - mouse.x, at.y - mouse.y);
        if (delta < distance) { nearest = point; distance = delta; }
      }
      return nearest;
    }

    selectNearbyLocation(event) {
      const point = this.nearbyLocation(event);
      if (point) { this.stopRotation(); this.options.onSelect(point.key); }
    }

    reset() {
      this.focusLocation(this.locations.find(p => p.hot) || (this.locations.length === 1 ? this.locations[0] : { lat: 25, lng: 100 }));
    }

    zoom(factor) { this.stopRotation(); this.setView({ scale: this.view.scale * factor }, 240); }

    updateZoomButtons() {
      const ratio = this.view.scale / this.homeScale();
      document.getElementById('zoom-in').disabled = ratio > 2.79;
      document.getElementById('zoom-out').disabled = ratio < .66;
    }

    keydown(event) {
      if (!this.available || event.target !== this.element) return;
      const moves = {
        ArrowLeft: { phi: this.view.phi + radians(12) }, ArrowRight: { phi: this.view.phi - radians(12) },
        ArrowUp: { theta: this.view.theta + radians(10) }, ArrowDown: { theta: this.view.theta - radians(10) }
      };
      if (moves[event.key]) { event.preventDefault(); this.stopRotation(); this.setView(moves[event.key], 180); }
      else if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); this.zoom(event.key === '-' ? .85 : 1.18); }
    }

    layoutLabels() {
      if (!this.available || !this.locations.length) return;
      const width = this.stage.clientWidth, height = this.stage.clientHeight;
      this.stage.classList.toggle('compact-globe', width < 600);
      const maxLabels = width < 600 ? 2 : 5;
      const tagWidth = width < 600 ? 178 : 196;
      const tagHeight = width < 600 ? 84 : 100;
      const hoverKey = this.activeHoverKey;
      const overlapsMarker = (marker, x, y, boxWidth, boxHeight) => {
        const dx = marker.x - Math.max(x, Math.min(x + boxWidth, marker.x));
        const dy = marker.y - Math.max(y, Math.min(y + boxHeight, marker.y));
        return Math.hypot(dx, dy) < marker.clearance;
      };
      // Read stage geometry & CSS custom properties once per frame to avoid layout thrashing.
      const stageBounds = this.nativeAnchors ? this.stage.getBoundingClientRect() : null;
      const rootStyle = this.nativeAnchors ? getComputedStyle(document.documentElement) : null;
      const globeScreenRadius = this.globeRadius;
      const markers = this.locations.map(point => {
        const at = this.projectLocation(point, stageBounds, rootStyle), entry = this.labels.get(point.key);
        const isHovered = point.key === hoverKey;
        // Match COBE's projected marker diameter, with a legible minimum on phones.
        const pinSize = Math.max(point.hot || isHovered ? 11 : 8, this.globeRadius * markerSizeFor(point) / .8);
        entry.pin.hidden = !at.visible;
        entry.pin.classList.toggle('hovered', isHovered);
        if (at.visible) {
          entry.pin.style.width = entry.pin.style.height = pinSize + 'px';
          entry.pin.style.transform = `translate(${at.x}px,${at.y}px) translate(-50%,-50%)`;
        }
        entry.ripple.hidden = !point.hot || !at.visible;
        if (!entry.ripple.hidden) {
          entry.ripple.style.setProperty('--ripple-radius', this.rippleRadius + 'px');
          entry.ripple.style.transform = `translate(${at.x}px,${at.y}px)`;
        }
        return { ...at, key: point.key, clearance: point.hot ? this.rippleRadius + 8 : Math.max(10, pinSize / 2 + 6) };
      }).filter(point => point.visible);
      const occupied = [];
      const promoteKey = this.promotedKey;
      const candidates = [...this.locations].filter(p => autoCardFor(p) || this.locations.length === 1 || p.key === promoteKey)
        .sort((a, b) => Number(b.hot) - Number(a.hot) || Number(b.key === promoteKey) - Number(a.key === promoteKey) || (a.next?.at || Infinity) - (b.next?.at || Infinity));
      const visible = new Set();
      for (const p of candidates) {
        if (occupied.length >= maxLabels) break;
        const marker = markers.find(m => m.key === p.key);
        if (!marker) continue;
        const at = marker;
        if (at.x < 4 || at.x > width - 4 || at.y < 4 || at.y > height - 28) continue;
        const gap = (marker?.clearance || 10) + 14;
        const right = Math.max(at.x + gap, width / 2 + globeScreenRadius + 14);
        const left = Math.min(at.x - tagWidth - gap, width / 2 - globeScreenRadius - tagWidth - 14);
        const sides = at.x > width / 2 ? [right, left] : [left, right];
        const choices = sides.flatMap(x => [[x, at.y - tagHeight / 2], [x, at.y - tagHeight - gap], [x, at.y + gap]]);
        choices.push([at.x - tagWidth / 2, at.y - tagHeight - gap], [at.x - tagWidth / 2, at.y + gap]);
        const minY = p.hot && width >= 600 ? 82 : 64;
        const maxY = height - tagHeight - (width < 600 ? 86 : 65);
        if (width < 600 && (p.hot || candidates.length === 1)) choices.unshift([at.x - tagWidth / 2, minY]);
        // Dense views may only have space at the top or bottom of the stage.
        for (const x of [...sides, at.x - tagWidth / 2]) choices.push([x, minY], [x, maxY]);
        let box;
        for (const [x, y] of choices) {
          const test = { x: Math.max(12, Math.min(width - tagWidth - 12, x)), y: Math.max(minY, Math.min(maxY, y)) };
          const top = test.y - (p.hot ? 20 : 0);
          const coversMarker = markers.some(m => overlapsMarker(m, test.x, test.y, tagWidth, tagHeight)
            || (p.hot && overlapsMarker(m, test.x, top, this.mode === 'meet' ? 124 : 112, 14)));
          if (!coversMarker && !occupied.some(b => test.x < b.x + tagWidth + 10 && test.x + tagWidth + 10 > b.x && top < b.y + b.height + 10 && test.y + tagHeight + 10 > b.y)) { box = test; break; }
        }
        if (!box) continue;
        const entry = this.labels.get(p.key);
        entry.button.hidden = false;
        entry.button.style.transform = `translate(${box.x.toFixed(1)}px,${box.y.toFixed(1)}px)`;
        entry.line.style.display = '';
        entry.line.classList.toggle('hot', p.hot);
        entry.line.classList.toggle('hovered', p.key === hoverKey);
        const endX = Math.max(box.x, Math.min(box.x + tagWidth, at.x));
        const endY = Math.max(box.y, Math.min(box.y + tagHeight, at.y));
        const dx = endX - at.x, dy = endY - at.y;
        if (Math.abs(dx) > 24 && Math.abs(dy) > 14) {
          const bendX = endX - Math.sign(dx) * Math.min(18, Math.abs(dx) * 0.35);
          entry.line.setAttribute('d', `M${at.x.toFixed(1)},${at.y.toFixed(1)} L${bendX.toFixed(1)},${endY.toFixed(1)} L${endX.toFixed(1)},${endY.toFixed(1)}`);
        } else {
          entry.line.setAttribute('d', `M${at.x.toFixed(1)},${at.y.toFixed(1)} L${endX.toFixed(1)},${endY.toFixed(1)}`);
        }
        occupied.push({ x: box.x, y: box.y - (p.hot ? 20 : 0), height: tagHeight + (p.hot ? 20 : 0) }); visible.add(p.key);
      }
      for (const [key, entry] of this.labels) {
        if (!visible.has(key)) { entry.button.hidden = true; entry.line.style.display = 'none'; }
      }
    }
  }
  window.CCFGlobe = CCFGlobe;
})();
