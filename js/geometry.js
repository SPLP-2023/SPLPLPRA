/*
 * Collection area A_D (BS EN 62305-2 Annex A) and down conductor layout.
 * Local frame: the structure is centred on the origin, length a along x
 * (the ridge for pitched roofs), span b along z.
 */
(function (root) {
  const G = {};

  // Formula A.2 — rectangular structure
  G.adRect = function (L, W, H) {
    return L * W + 2 * (3 * H) * (L + W) + Math.PI * Math.pow(3 * H, 2);
  };

  // Formula A.7 — area for flashes near the structure
  G.am = function (L, W) {
    return 2 * 500 * (L + W) + Math.PI * 500 * 500;
  };

  function distRect(x, z, hx, hz) {
    const dx = Math.max(Math.abs(x) - hx, 0), dz = Math.max(Math.abs(z) - hz, 0);
    return Math.hypot(dx, dz);
  }

  // Local frame dimensions for a structure description
  G.frame = function (s) {
    const rot = s.shape === 'pitched' && s.ridgeDir === 'W';
    const a = rot ? s.W : s.L, b = rot ? s.L : s.W;
    return { a, b, rot, Pw: Math.min(s.Pw || 0, a, b) };
  };

  // Is a ground point inside the collection area? (graphical method A.2.1.2:
  // within a horizontal distance of 3 × height of any point on the structure)
  function makeInside(s, f) {
    const a = f.a, b = f.b, H = s.H;
    if (s.shape === 'pitched') {
      const Hr = Math.max(s.Hr || H, H), N = 61, xs = [];
      for (let i = 0; i < N; i++) {
        const zs = -b / 2 + b * i / (N - 1);
        xs.push([zs, 3 * (H + (Hr - H) * (1 - Math.abs(zs) / (b / 2)))]);
      }
      return function (x, z) {
        const dx = Math.max(Math.abs(x) - a / 2, 0);
        for (let i = 0; i < xs.length; i++) {
          const dz = z - xs[i][0], r = xs[i][1];
          if (dx * dx + dz * dz <= r * r) return true;
        }
        return false;
      };
    }
    if (s.shape === 'protrusion') {
      const Hp = Math.max(s.Hp || H, H), pw = f.Pw;
      return (x, z) => distRect(x, z, a / 2, b / 2) <= 3 * H || distRect(x, z, pw / 2, pw / 2) <= 3 * Hp;
    }
    return (x, z) => distRect(x, z, a / 2, b / 2) <= 3 * H;
  }

  // Boundary polygon (local frame) and its area
  G.collection = function (s) {
    const f = G.frame(s), inside = makeInside(s, f);
    const maxH = Math.max(s.H, s.Hr || 0, s.Hp || 0);
    const Rmax = Math.hypot(f.a / 2, f.b / 2) + 3 * maxH + 2, n = 720, pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      let lo = 0, hi = Rmax;
      for (let k = 0; k < 34; k++) { const m = (lo + hi) / 2; if (inside(m * c, m * sn)) lo = m; else hi = m; }
      pts.push([lo * c, lo * sn]);
    }
    let A = 0;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; }
    return { pts, area: Math.abs(A) / 2, frame: f };
  };

  // A_D: exact formula for rectangles, graphical method for other shapes
  G.ad = function (s) {
    if (s.shape === 'rect') return { value: G.adRect(s.L, s.W, s.H), method: 'Formula A.2' };
    return { value: G.collection(s).area, method: 'Graphical method (A.2.1.2)' };
  };

  // Down conductor positions on a rectangle a × b: corners first, then spread by side length
  G.dcPositions = function (a, b, N) {
    const c = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
    if (N <= 2) return [c[0], c[2]];
    if (N === 3) return [c[0], c[1], c[2]];
    const sides = [a, b, a, b], P = 2 * (a + b), extra = N - 4;
    const raw = sides.map(l => l / P * extra), k = raw.map(Math.floor);
    const rem = extra - k.reduce((p, q) => p + q, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((p, q) => q[0] - p[0]).slice(0, rem).forEach(([, i]) => k[i]++);
    const out = [];
    for (let s = 0; s < 4; s++) {
      const p0 = c[s], p1 = c[(s + 1) % 4];
      out.push(p0);
      for (let j = 1; j <= k[s]; j++) { const f = j / (k[s] + 1); out.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]); }
    }
    return out;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = G;
  else root.SPGeometry = G;
})(typeof self !== 'undefined' ? self : this);
