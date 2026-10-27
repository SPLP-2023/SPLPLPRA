/*
 * 3D view of the structure with an indicative LPS layout (three.js r128).
 * Indicative only — positions are typical, not a design drawing.
 */
(function (root) {
  const G = root.SPGeometry, T = root.SPTables;
  const LIGHT = {
    scene: '#FFFFFF', ground: '#D5DDD7', wall: '#DDE2E7', roof: '#A9B3BD', edge: '#5F6B77',
    copper: '#B4602A', earth: '#2F7D57', collect: '#0767AD', sphere: '#7A4FB0', fg: '#15202B'
  };

  function cssColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n, d) => (cs.getPropertyValue(n).trim() || d);
    return {
      scene: g('--scene-bg', LIGHT.scene), ground: g('--ground', LIGHT.ground), wall: g('--wall', LIGHT.wall), roof: g('--roof', LIGHT.roof),
      edge: g('--edge', LIGHT.edge), copper: g('--copper', LIGHT.copper), earth: g('--earth', LIGHT.earth), collect: g('--collect', LIGHT.collect),
      sphere: g('--sphere', LIGHT.sphere), fg: g('--fg', LIGHT.fg)
    };
  }

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function seg(p1, p2, r, mat) {
    const d = new THREE.Vector3().subVectors(p2, p1), len = d.length();
    if (len < 1e-6) return new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8, 1), mat);
    m.position.copy(p1).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function poly(points, r, mat, closed) {
    const g = new THREE.Group();
    for (let i = 0; i < points.length - (closed ? 0 : 1); i++) g.add(seg(points[i], points[(i + 1) % points.length], r, mat));
    return g;
  }

  // Structure description from the assessment state
  function describe(state, result) {
    const s = state.structure || {};
    const num = (v, d) => (v === '' || v == null || isNaN(+v) || +v <= 0) ? d : +v;
    const H = num(s.H, 6);
    const sd = { shape: s.shape || 'rect', L: num(s.L, 20), W: num(s.W, 10), H, Hr: Math.max(num(s.Hr, H), H), ridgeDir: s.ridgeDir || 'L', Hp: Math.max(num(s.Hp, H), H), Pw: num(s.Pw, 3) };
    const d = result && result.design;
    return {
      sd, cls: d && d.cls ? T.CLASS[d.cls] : null, N: d ? d.N : 0, earthing: (state.protection && state.protection.earthing) || 'A',
      adjacent: (state.lines || []).filter(l => l.adjacentId).map(l => (state.adjacent || []).find(a => a.id === l.adjacentId)).filter(Boolean)
    };
  }

  function buildModel(desc, ly, C) {
    const sd = desc.sd, f = G.frame(sd), a = f.a, b = f.b, H = sd.H, size = Math.max(a, b);
    const model = new THREE.Group();
    const local = new THREE.Group(); if (f.rot) local.rotation.y = Math.PI / 2; model.add(local);
    const cr = Math.max(0.06, size / 500);
    const mWall = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.wall), roughness: 0.9 });
    const mRoof = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.roof), roughness: 0.85, side: THREE.DoubleSide });
    const mCu = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.copper), roughness: 0.45, metalness: 0.35 });
    const mEarth = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.earth), roughness: 0.6 });
    const mEdge = new THREE.LineBasicMaterial({ color: new THREE.Color(C.edge) });

    const collect = G.collection(sd);
    const reach = Math.max.apply(null, collect.pts.map(p => Math.hypot(p[0], p[1])));
    const ground = new THREE.Mesh(new THREE.CircleGeometry(reach * 1.6 + 20, 64),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(C.ground), roughness: 1, transparent: true, opacity: 0.82, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2; model.add(ground);

    const walls = new THREE.Mesh(new THREE.BoxGeometry(a, H, b), mWall); walls.position.y = H / 2; local.add(walls);
    const we = new THREE.LineSegments(new THREE.EdgesGeometry(walls.geometry), mEdge); we.position.copy(walls.position); local.add(we);
    let topH = H;
    if (sd.shape === 'pitched') {
      const He = H, Hr = sd.Hr, x0 = -a / 2, x1 = a / 2;
      const t = [x0, He, -b / 2, x1, He, -b / 2, x1, Hr, 0, x0, He, -b / 2, x1, Hr, 0, x0, Hr, 0,
        x0, Hr, 0, x1, Hr, 0, x1, He, b / 2, x0, Hr, 0, x1, He, b / 2, x0, He, b / 2,
        x0, He, -b / 2, x0, Hr, 0, x0, He, b / 2, x1, He, -b / 2, x1, Hr, 0, x1, He, b / 2];
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(t, 3)); g.computeVertexNormals();
      local.add(new THREE.Mesh(g, mRoof)); local.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 1), mEdge));
      topH = Hr;
    } else {
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(a, b), mRoof); roof.rotation.x = -Math.PI / 2; roof.position.y = H + 0.02; local.add(roof);
    }
    if (sd.shape === 'protrusion') {
      const ph = sd.Hp - H, pw = f.Pw;
      if (ph > 0) {
        const tw = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pw), mWall); tw.position.set(0, H + ph / 2, 0); local.add(tw);
        const te = new THREE.LineSegments(new THREE.EdgesGeometry(tw.geometry), mEdge); te.position.copy(tw.position); local.add(te);
      }
      topH = sd.Hp;
    }

    const spec = desc.cls;
    if (spec) {
      const m = spec.mesh, lift = cr, N = Math.max(2, desc.N || 2);
      if (ly.mesh) {
        if (sd.shape === 'pitched') {
          const He = H, Hr = sd.Hr, nx = Math.max(1, Math.ceil(a / m - 1e-9));
          local.add(seg(V(-a / 2, He + lift, -b / 2), V(a / 2, He + lift, -b / 2), cr, mCu));
          local.add(seg(V(-a / 2, He + lift, b / 2), V(a / 2, He + lift, b / 2), cr, mCu));
          local.add(seg(V(-a / 2, Hr + lift, 0), V(a / 2, Hr + lift, 0), cr, mCu));
          for (let i = 0; i <= nx; i++) { const x = -a / 2 + a * i / nx; local.add(poly([V(x, He + lift, -b / 2), V(x, Hr + lift, 0), V(x, He + lift, b / 2)], cr, mCu, false)); }
          const sl = Math.hypot(b / 2, Hr - He), ns = Math.max(1, Math.ceil(sl / m - 1e-9));
          for (let j = 1; j < ns; j++) {
            const fr = j / ns, y = He + (Hr - He) * fr + lift, z = b / 2 * (1 - fr);
            local.add(seg(V(-a / 2, y, -z), V(a / 2, y, -z), cr, mCu)); local.add(seg(V(-a / 2, y, z), V(a / 2, y, z), cr, mCu));
          }
        } else {
          const y = H + lift, nx = Math.max(1, Math.ceil(a / m - 1e-9)), nz = Math.max(1, Math.ceil(b / m - 1e-9));
          local.add(poly([V(-a / 2, y, -b / 2), V(a / 2, y, -b / 2), V(a / 2, y, b / 2), V(-a / 2, y, b / 2)], cr, mCu, true));
          for (let i = 1; i < nx; i++) { const x = -a / 2 + a * i / nx; local.add(seg(V(x, y, -b / 2), V(x, y, b / 2), cr, mCu)); }
          for (let j = 1; j < nz; j++) { const z = -b / 2 + b * j / nz; local.add(seg(V(-a / 2, y, z), V(a / 2, y, z), cr, mCu)); }
          if (sd.shape === 'protrusion' && sd.Hp > H) {
            const pw = f.Pw, yt = sd.Hp + lift;
            local.add(poly([V(-pw / 2, yt, -pw / 2), V(pw / 2, yt, -pw / 2), V(pw / 2, yt, pw / 2), V(-pw / 2, yt, pw / 2)], cr, mCu, true));
            local.add(seg(V(0, yt, 0), V(0, yt + Math.max(1, pw * 0.4), 0), cr * 1.2, mCu));
            local.add(seg(V(-pw / 2, yt, -pw / 2), V(-pw / 2, y, -pw / 2), cr, mCu));
            local.add(seg(V(pw / 2, yt, pw / 2), V(pw / 2, y, pw / 2), cr, mCu));
          }
        }
      }
      const pos = G.dcPositions(a, b, N);
      if (ly.dc) pos.forEach(([x, z]) => local.add(seg(V(x, H + lift, z), V(x, 0, z), cr, mCu)));
      if (ly.earth) {
        if (desc.earthing === 'A') {
          const off = Math.min(1.2, size / 80);
          pos.forEach(([x, z]) => {
            const ox = x + Math.sign(x) * off, oz = z + Math.sign(z) * off;
            local.add(seg(V(x, 0, z), V(ox, -0.4, oz), cr, mEarth));
            local.add(seg(V(ox, -0.4, oz), V(ox, -3, oz), cr * 1.3, mEarth));
            const pit = new THREE.Mesh(new THREE.BoxGeometry(cr * 8, 0.15, cr * 8), mEarth); pit.position.set(ox, 0.05, oz); local.add(pit);
          });
        } else {
          const o = Math.max(1, size / 120), y = -0.6;
          local.add(poly([V(-a / 2 - o, y, -b / 2 - o), V(a / 2 + o, y, -b / 2 - o), V(a / 2 + o, y, b / 2 + o), V(-a / 2 - o, y, b / 2 + o)], cr, mEarth, true));
          if (desc.earthing === 'Bmesh') {
            const nm = Math.max(1, Math.ceil(a / 10)), nn = Math.max(1, Math.ceil(b / 10));
            for (let i = 1; i < nm; i++) { const x = -a / 2 - o + (a + 2 * o) * i / nm; local.add(seg(V(x, y, -b / 2 - o), V(x, y, b / 2 + o), cr * 0.7, mEarth)); }
            for (let j = 1; j < nn; j++) { const z = -b / 2 - o + (b + 2 * o) * j / nn; local.add(seg(V(-a / 2 - o, y, z), V(a / 2 + o, y, z), cr * 0.7, mEarth)); }
          }
          pos.forEach(([x, z]) => local.add(seg(V(x, 0, z), V(x + Math.sign(x) * o, y, z + Math.sign(z) * o), cr, mEarth)));
        }
      }
      if (ly.sphere) {
        const r = spec.sphere, he = H, d = he < r ? Math.sqrt(r * r - (r - he) * (r - he)) : r;
        const sph = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24), new THREE.MeshStandardMaterial({ color: new THREE.Color(C.sphere), transparent: true, opacity: 0.14, depthWrite: false }));
        sph.position.set(0, r, b / 2 + d); local.add(sph);
        const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(r, 20, 12), 1), new THREE.LineBasicMaterial({ color: new THREE.Color(C.sphere), transparent: true, opacity: 0.45 }));
        wire.position.copy(sph.position); local.add(wire);
      }
    }

    if (ly.collect) {
      const shp = new THREE.Shape(collect.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const cm = new THREE.Mesh(new THREE.ShapeGeometry(shp), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.collect), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
      cm.rotation.x = -Math.PI / 2; cm.position.y = 0.04; local.add(cm);
      const lp = collect.pts.map(([x, z]) => V(x, 0.08, z)); lp.push(lp[0].clone());
      local.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: new THREE.Color(C.collect) })));
    }

    if (ly.adj && desc.adjacent.length) {
      const seen = {};
      desc.adjacent.forEach((aj, i) => {
        if (seen[aj.id]) return; seen[aj.id] = true;
        const n = Object.keys(seen).length - 1;
        const L = +aj.L || 5, W = +aj.W || 5, Hh = +aj.H || 3;
        const gap = Math.max(25, size * 0.35), ang = -0.5 + n * 0.9;
        const dist = Math.hypot(sd.L / 2, sd.W / 2) + gap;
        const sx = Math.cos(ang) * dist, sz = Math.sin(ang) * dist + sd.W / 2;
        const sub = new THREE.Mesh(new THREE.BoxGeometry(L, Hh, W), mWall); sub.position.set(sx, Hh / 2, sz); model.add(sub);
        const se = new THREE.LineSegments(new THREE.EdgesGeometry(sub.geometry), mEdge); se.position.copy(sub.position); model.add(se);
        const start = V(Math.sign(sx) * sd.L / 2 * 0.8, 0.15, sd.W / 2);
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, V(sx, 0.15, sz)]), new THREE.LineDashedMaterial({ color: new THREE.Color(C.fg), dashSize: 2, gapSize: 1.5 }));
        ln.computeLineDistances(); model.add(ln);
      });
    }
    return { model, topH, reach, sd };
  }

  function addLights(scene) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(1, 2, 1.4); scene.add(sun);
  }

  function placeCamera(camera, target, kind, info, withCollect, zoom) {
    const reach = withCollect ? info.reach : Math.hypot(info.sd.L / 2, info.sd.W / 2, info.topH);
    const R = (Math.max(reach, info.topH) * 1.15 + 5) * (zoom || 1);
    const dist = R / Math.sin(camera.fov * Math.PI / 360) * (camera.aspect < 1 ? 1.35 : 1);
    const ty = info.topH * 0.35;
    target.set(0, ty, 0);
    if (kind === 'plan') camera.position.set(0.001, dist, 0.001);
    else if (kind === 'side') camera.position.set(0, ty + dist * 0.08, dist);
    else { const d = dist * 0.62; camera.position.set(d * 1.05, d * 0.75, d * 0.95); }
    camera.near = Math.max(0.1, dist / 2000); camera.far = dist * 8; camera.updateProjectionMatrix();
    camera.lookAt(target);
  }

  function disposeTree(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }

  function createViewer() {
    const el = document.createElement('div');
    el.className = 'viewer';
    el.innerHTML = '<div class="views" role="group" aria-label="Camera views">' +
      '<button type="button" class="btn" data-v="iso">Isometric</button><button type="button" class="btn" data-v="plan">Plan</button><button type="button" class="btn" data-v="side">Side</button></div>' +
      '<div class="stamp">Indicative layout, not a design drawing</div>';
    let renderer = null, scene, camera, controls, current = null, view = 'iso', lastKey = '', running = false, ly = null, desc = null;

    function init() {
      if (renderer) return true;
      try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { el.insertAdjacentHTML('beforeend', '<p class="stamp" style="top:8px;bottom:auto">3D view needs WebGL, which this device has turned off.</p>'); return false; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.setAttribute('aria-label', '3D model of the structure with its lightning protection');
      el.prepend(renderer.domElement);
      scene = new THREE.Scene(); addLights(scene);
      camera = new THREE.PerspectiveCamera(40, 1, 0.5, 20000);
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495;
      new ResizeObserver(resize).observe(el);
      el.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { view = b.dataset.v; fit(); }));
      return true;
    }
    function resize() {
      if (!renderer) return;
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function fit() {
      if (!current) return;
      placeCamera(camera, controls.target, view, current, ly.collect); controls.update();
      el.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === view)));
    }
    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      if (!el.isConnected) { running = false; return; }
      controls.update(); renderer.render(scene, camera);
    }
    return {
      el,
      update(state, result, layers) {
        if (!init()) return;
        ly = layers; desc = describe(state, result);
        const C = cssColors();
        scene.background = new THREE.Color(C.scene);
        if (current) { scene.remove(current.model); disposeTree(current.model); }
        current = buildModel(desc, ly, C);
        scene.add(current.model);
        const key = JSON.stringify([desc.sd, ly.collect]);
        resize();
        if (key !== lastKey) { lastKey = key; fit(); }
        if (!running) { running = true; loop(); }
      }
    };
  }

  // Off-screen render for the PDF, always in the light print palette
  function snapshot(state, result, kind, w, h, layers, fitCollect) {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(LIGHT.scene); addLights(scene);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 20000);
    const info = buildModel(describe(state, result), layers, LIGHT);
    scene.add(info.model);
    placeCamera(camera, new THREE.Vector3(), kind, info, fitCollect === undefined ? layers.collect : fitCollect, 0.8);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
    disposeTree(info.model); renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) { }
    return url;
  }

  root.SPView3D = { createViewer, snapshot };
})(self);
