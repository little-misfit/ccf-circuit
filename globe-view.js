'use strict';
(() => {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const formatCountdown = at => {
    const seconds = Math.max(0, Math.floor((at - Date.now()) / 1000));
    const days = Math.floor(seconds / 86400);
    return `${days}天 ${[Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':')}`;
  };

  class CCFGlobe {
    constructor(element, options) {
      this.element = element;
      this.stage = element.parentElement;
      this.options = options;
      this.locations = [];
      this.labels = new Map();
      this.available = false;
      this.playing = !motionPreference.matches;
      this.hovered = false;
      this.focused = false;
      this.visible = true;
      this.lastFrame = 0;
      this.highlight = null;
      this.hoverKey = null;
      this.layer = document.getElementById('globe-labels');
      this.connectors = this.stage.querySelector('.globe-connectors');
      try {
        if (typeof window.Globe !== 'function') throw new Error('Globe library unavailable');
        this.globe = new Globe(element, {
          animateIn: false,
          waitForGlobeReady: false,
          rendererConfig: { antialias: true, alpha: true, powerPreference: 'low-power' }
        });
        this.globe
          .width(this.stage.clientWidth).height(this.stage.clientHeight)
          .backgroundColor('rgba(0,0,0,0)')
          .globeImageUrl('./assets/earth-blue-marble.jpg')
          .atmosphereColor('#609ea8').atmosphereAltitude(.13)
          .pointLat('lat').pointLng('lng')
          .pointAltitude(p => p.hot ? .035 : .009)
          .pointRadius(p => p.hot ? .6 : .3)
          .pointColor(p => p.hot ? '#d0ff82' : p.next ? '#87e0ce' : '#76989e')
          .pointsMerge(false).pointResolution(10).pointsTransitionDuration(0)
          .pointLabel(() => '')
          .onPointClick(p => { this.stopRotation(); options.onSelect(p.key); })
          .onGlobeClick((_, event) => this.selectNearbyLocation(event))
          .onPointHover(p => { this.hoverKey = p?.key || null; this.layoutLabels(); })
          .ringLat('lat').ringLng('lng')
          .ringColor(() => t => `rgba(193,245,107,${(1 - t) * .8})`)
          .ringMaxRadius(3.4).ringPropagationSpeed(1.5).ringRepeatPeriod(1700)
          .onZoom(() => { this.layoutLabels(); this.updateZoomButtons(); });
        const material = this.globe.globeMaterial();
        material.color.set('#9ab4bd');
        material.shininess = 6;
        this.globe.renderer().setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
        const controls = this.globe.controls();
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = .08;
        controls.minDistance = 150;
        controls.maxDistance = 540;
        controls.autoRotateSpeed = .35;
        controls.rotateSpeed = .65;
        controls.zoomSpeed = .7;
        controls.addEventListener('start', () => this.stopRotation());
        this.globe.pointOfView({ lat: 25, lng: 100, altitude: this.homeAltitude() }, 0);
        this.available = true;
        this.stage.dataset.renderer = 'webgl';
        document.getElementById('globe-status').hidden = true;
        this.globe.renderer().domElement.addEventListener('webglcontextlost', event => {
          event.preventDefault();
          this.fallback();
        });
        new ResizeObserver(() => {
          if (!this.available) return;
          this.globe.width(this.stage.clientWidth).height(this.stage.clientHeight);
          this.layoutLabels();
        }).observe(this.stage);
        new IntersectionObserver(entries => {
          this.visible = entries[0].isIntersecting;
          this.syncMotion();
        }).observe(this.stage);
        this.stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { this.hovered = true; this.syncMotion(); } });
        this.stage.addEventListener('pointerleave', () => { this.hovered = false; this.syncMotion(); });
        this.stage.addEventListener('focusin', e => { this.focused = e.target.matches(':focus-visible'); this.syncMotion(); });
        this.stage.addEventListener('focusout', e => { this.focused = this.stage.contains(e.relatedTarget) && e.relatedTarget.matches(':focus-visible'); this.syncMotion(); });
        document.addEventListener('visibilitychange', () => this.syncMotion());
        motionPreference.addEventListener('change', () => {
          if (motionPreference.matches) this.playing = false;
          this.setRings();
          this.syncMotion();
        });
        element.addEventListener('keydown', event => this.keydown(event));
        this.syncMotion();
        const frame = now => {
          if (!this.available) return;
          if (this.visible && !document.hidden && now - this.lastFrame > 32) {
            this.lastFrame = now;
            this.layoutLabels();
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      } catch (error) {
        this.fallback();
      }
    }

    homeAltitude() {
      const width = this.stage.clientWidth, height = this.stage.clientHeight;
      const base = width < 600 ? 2.35 : 2.05;
      const halfFov = (this.globe.camera().fov / 2) * Math.PI / 180;
      const angle = Math.atan(Math.tan(halfFov) * Math.min(1, width / height));
      return Math.max(base, 1.08 / Math.sin(angle) - 1);
    }

    fallback() {
      this.available = false;
      this.globe?.pauseAnimation();
      this.element.hidden = true;
      this.layer.hidden = true;
      this.connectors.setAttribute('hidden', '');
      this.stage.dataset.renderer = 'map';
      document.getElementById('map').removeAttribute('hidden');
      const status = document.getElementById('globe-status');
      status.textContent = '当前设备使用平面地图';
      status.hidden = false;
      document.getElementById('globe-hint').textContent = '放大后可拖动地图';
      document.getElementById('globe-motion').hidden = true;
      this.options.onUnavailable?.();
    }

    syncMotion() {
      if (!this.available) return;
      const active = this.visible && !document.hidden;
      if (active) this.globe.resumeAnimation();
      else this.globe.pauseAnimation();
      this.globe.controls().autoRotate = active && this.playing && !this.hovered && !this.focused;
      const button = document.getElementById('globe-motion');
      button.textContent = this.playing ? 'Ⅱ' : '▷';
      button.setAttribute('aria-pressed', String(this.playing));
      button.setAttribute('aria-label', this.playing ? '暂停自动旋转' : '开始自动旋转');
      button.title = button.getAttribute('aria-label');
    }

    stopRotation() { this.playing = false; this.syncMotion(); }
    toggleRotation() { this.playing = !this.playing; this.syncMotion(); }

    setRings() {
      if (!this.available) return;
      this.globe.ringsData(motionPreference.matches ? [] : this.locations.filter(p => p.hot));
    }

    setLocations(locations) {
      if (!this.available) return;
      this.locations = locations;
      this.globe.pointsData(locations);
      this.setRings();
      const keys = new Set(locations.map(p => p.key));
      for (const [key, entry] of this.labels) {
        if (!keys.has(key)) { entry.button.remove(); entry.line.remove(); this.labels.delete(key); }
      }
      for (const p of locations) {
        let entry = this.labels.get(p.key);
        if (!entry) {
          const button = document.createElement('button');
          button.className = 'globe-tag';
          button.hidden = true;
          const heading = document.createElement('span'); heading.className = 'globe-tag-heading';
          const location = document.createElement('span'); location.className = 'globe-tag-location';
          const timer = document.createElement('span'); timer.className = 'globe-countdown';
          const kind = document.createElement('span'); kind.className = 'globe-tag-kind';
          button.append(heading, location, timer, kind);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          this.layer.append(button); this.connectors.append(line);
          entry = { button, heading, location, timer, kind, line };
          this.labels.set(p.key, entry);
        }
        entry.point = p;
        entry.button.classList.toggle('hot', p.hot);
        entry.button.dataset.city = p.key;
        if (p.next) entry.button.dataset.open = p.next.id;
        else delete entry.button.dataset.open;
        entry.heading.textContent = p.next ? `${p.next.title} ${p.next.year}` : p.name;
        entry.location.textContent = p.next ? `${p.name} · ${p.next.type === 'abstract' ? '摘要' : '全文'}` : `${p.name} · ${p.events.length} 场`;
        entry.kind.textContent = p.hot ? '最近截稿' : p.next ? (p.next.type === 'abstract' ? '摘要截止' : '全文截止') : '查看城市会议';
        entry.button.setAttribute('aria-label', `${entry.heading.textContent}，${p.name}，${p.next ? (p.next.type === 'abstract' ? '摘要' : '全文') + '投稿倒计时，查看详情' : '查看会议'}`);
      }
      this.updateCountdowns();
      const hot = locations.find(p => p.hot);
      const target = hot ? `${hot.key}:${hot.next?.id}:${hot.next?.at}` : null;
      if (target && target !== this.highlight) this.focusLocation(hot, this.highlight !== null);
      this.highlight = target;
      this.layoutLabels();
    }

    updateCountdowns() {
      for (const { point, timer } of this.labels.values()) {
        timer.textContent = point.next ? formatCountdown(point.next.at) : '暂无待截止投稿';
      }
    }

    focusLocation(point, animate = true) {
      if (!this.available || !point) return;
      this.globe.pointOfView({ lat: point.lat, lng: point.lng, altitude: this.homeAltitude() }, animate && !motionPreference.matches ? 850 : 0);
    }

    focusNearest() {
      this.stopRotation();
      this.focusLocation(this.locations.find(p => p.hot));
    }

    selectNearbyLocation(event) {
      const bounds = this.element.getBoundingClientRect();
      const mouse = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const camera = this.globe.camera().position;
      const radius = this.globe.getGlobeRadius();
      let nearest = null;
      let distance = matchMedia('(pointer: coarse)').matches ? 28 : 18;
      for (const point of this.locations) {
        const xyz = this.globe.getCoords(point.lat, point.lng);
        if (xyz.x * camera.x + xyz.y * camera.y + xyz.z * camera.z <= radius * radius) continue;
        const screen = this.globe.getScreenCoords(point.lat, point.lng, .01);
        const delta = Math.hypot(screen.x - mouse.x, screen.y - mouse.y);
        if (delta < distance) { nearest = point; distance = delta; }
      }
      if (nearest) { this.stopRotation(); this.options.onSelect(nearest.key); }
    }

    reset() {
      const target = this.locations.find(p => p.hot) || { lat: 25, lng: 100 };
      this.focusLocation(target);
    }

    zoom(factor) {
      if (!this.available) return;
      this.stopRotation();
      const current = this.globe.pointOfView();
      this.globe.pointOfView({ altitude: Math.max(.5, Math.min(4.4, (current.altitude + 1) / factor - 1)) }, motionPreference.matches ? 0 : 260);
    }

    updateZoomButtons() {
      if (!this.available) return;
      const altitude = this.globe.pointOfView().altitude;
      document.getElementById('zoom-in').disabled = altitude < .52;
      document.getElementById('zoom-out').disabled = altitude > 4.38;
    }

    keydown(event) {
      if (!this.available || event.target !== this.element) return;
      const current = this.globe.pointOfView();
      const positions = {
        ArrowLeft: { lng: current.lng - 12 }, ArrowRight: { lng: current.lng + 12 },
        ArrowUp: { lat: Math.min(85, current.lat + 10) }, ArrowDown: { lat: Math.max(-85, current.lat - 10) }
      };
      if (positions[event.key]) {
        event.preventDefault(); this.stopRotation();
        this.globe.pointOfView(positions[event.key], motionPreference.matches ? 0 : 180);
      } else if (['+', '=', '-'].includes(event.key)) {
        event.preventDefault(); this.zoom(event.key === '-' ? .85 : 1.18);
      }
    }

    layoutLabels() {
      if (!this.available || !this.locations.length) return;
      const width = this.stage.clientWidth, height = this.stage.clientHeight;
      this.stage.classList.toggle('compact-globe', width < 600);
      const camera = this.globe.camera().position;
      const radius = this.globe.getGlobeRadius();
      const maxLabels = width < 600 ? 3 : 5;
      const tagWidth = width < 600 ? 142 : 174;
      const tagHeight = width < 600 ? 86 : 92;
      const occupied = [];
      const candidates = [...this.locations].filter(p => p.next || p.key === this.hoverKey)
        .sort((a, b) => Number(b.hot) - Number(a.hot) || Number(b.key === this.hoverKey) - Number(a.key === this.hoverKey) || (a.next?.at || Infinity) - (b.next?.at || Infinity));
      const visible = new Set();
      for (const p of candidates) {
        if (occupied.length >= maxLabels) break;
        const coords = this.globe.getCoords(p.lat, p.lng, 0);
        // Perspective horizon: a surface point faces the camera only when
        // its normal has a positive dot product with the viewing direction.
        if (coords.x * camera.x + coords.y * camera.y + coords.z * camera.z <= radius * radius * 1.08) continue;
        const at = this.globe.getScreenCoords(p.lat, p.lng, .015);
        if (at.x < 4 || at.x > width - 4 || at.y < 4 || at.y > height - 28) continue;
        const right = [at.x + 22, at.y - tagHeight / 2];
        const left = [at.x - tagWidth - 22, at.y - tagHeight / 2];
        const choices = at.x > width / 2 ? [right, left] : [left, right];
        choices.push([at.x - tagWidth / 2, at.y - tagHeight - 32], [at.x - tagWidth / 2, at.y + 30], [at.x + 38, at.y - tagHeight - 50], [at.x - tagWidth - 38, at.y + 42]);
        let box;
        for (const [x, y] of choices) {
          const test = { x: Math.max(12, Math.min(width - tagWidth - 12, x)), y: Math.max(p.hot ? 82 : 62, Math.min(height - tagHeight - 65, y)) };
          const top = test.y - (p.hot ? 20 : 0);
          if (!occupied.some(b => test.x < b.x + tagWidth + 10 && test.x + tagWidth + 10 > b.x && top < b.y + b.height + 10 && test.y + tagHeight + 10 > b.y)) { box = test; break; }
        }
        if (!box) continue;
        const entry = this.labels.get(p.key);
        entry.button.hidden = false;
        entry.button.style.transform = `translate(${box.x.toFixed(1)}px,${box.y.toFixed(1)}px)`;
        entry.line.style.display = '';
        entry.line.classList.toggle('hot', p.hot);
        const endX = Math.max(box.x, Math.min(box.x + tagWidth, at.x));
        const endY = Math.max(box.y, Math.min(box.y + tagHeight, at.y));
        entry.line.setAttribute('d', `M${at.x},${at.y} L${endX},${endY}`);
        occupied.push({ x: box.x, y: box.y - (p.hot ? 20 : 0), height: tagHeight + (p.hot ? 20 : 0) }); visible.add(p.key);
      }
      for (const [key, entry] of this.labels) {
        if (!visible.has(key)) { entry.button.hidden = true; entry.line.style.display = 'none'; }
      }
    }
  }
  window.CCFGlobe = CCFGlobe;
})();
