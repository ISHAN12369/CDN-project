import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  Cell,
  Legend
} from 'recharts';
import './index.css';

// -------------------------------------------------------------
// Interactive 3D Riangle Prism Canvas
// Replicates Riangle's signature geometric faceted red sculpture
// -------------------------------------------------------------
const RianglePrism = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - rect.width / 2;
      const clientY = e.clientY - rect.top - rect.height / 2;
      mouseRef.current.targetX = clientX * 0.002;
      mouseRef.current.targetY = clientY * 0.002;
    };

    window.addEventListener('mousemove', handleMouseMove);

    let angle = 0.2;

    const render = () => {
      // DPR scaling for razor sharp rendering
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      angle += 0.004;

      const cx = width * 0.5;
      const cy = height * 0.52;
      const size = Math.min(width, height) * 0.42;

      // 3D Rotation matrices
      const rotY = angle * 0.5 + mouseRef.current.x;
      const rotX = -0.25 + mouseRef.current.y;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const project = (x, y, z) => {
        // Rotate around Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // Rotate around X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const fov = 650;
        const p = fov / (fov + z2);
        return {
          x: cx + x1 * p,
          y: cy + y2 * p,
          z: z2
        };
      };

      // Riangle Geometric Prism: 3 thick interlocking beams
      const h = size * Math.sqrt(3) / 2;
      const beamThick = size * 0.22;
      const depth = size * 0.25;

      // Outer vertices
      const vTop = { x: 0, y: -h * 0.65 };
      const vRight = { x: size * 0.62, y: h * 0.48 };
      const vLeft = { x: -size * 0.62, y: h * 0.48 };

      // Inner triangular void
      const inTop = { x: 0, y: -h * 0.15 };
      const inRight = { x: size * 0.25, y: h * 0.28 };
      const inLeft = { x: -size * 0.25, y: h * 0.28 };

      // Draw faceted polygons with Riangle red gradients
      const drawFacet = (pts, fill, stroke = 'rgba(255,255,255,0.22)') => {
        ctx.beginPath();
        const p0 = project(pts[0].x, pts[0].y, pts[0].z);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < pts.length; i++) {
          const p = project(pts[i].x, pts[i].y, pts[i].z);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      // 1. Left outer beam (Front & Side facets)
      drawFacet([
        { ...vTop, z: depth },
        { ...vLeft, z: depth },
        { ...inLeft, z: depth },
        { ...inTop, z: depth }
      ], 'linear-gradient(135deg, #f43333, #c21a1a)');

      drawFacet([
        { ...vTop, z: depth },
        { ...vLeft, z: depth },
        { ...vLeft, z: -depth },
        { ...vTop, z: -depth }
      ], '#8c1010');

      // 2. Right outer beam
      drawFacet([
        { ...vTop, z: depth },
        { ...vRight, z: depth },
        { ...inRight, z: depth },
        { ...inTop, z: depth }
      ], '#ff4747');

      drawFacet([
        { ...vTop, z: depth },
        { ...vRight, z: depth },
        { ...vRight, z: -depth },
        { ...vTop, z: -depth }
      ], '#6b0707');

      // 3. Bottom beam
      drawFacet([
        { ...vLeft, z: depth },
        { ...vRight, z: depth },
        { ...inRight, z: depth },
        { ...inLeft, z: depth }
      ], '#9e1010');

      drawFacet([
        { ...vLeft, z: depth },
        { ...vRight, z: depth },
        { ...vRight, z: -depth },
        { ...vLeft, z: -depth }
      ], '#450404');

      // Inner beveled facets (creates the iconic Riangle interior depth)
      drawFacet([
        { ...inTop, z: depth },
        { ...inRight, z: depth },
        { ...inRight, z: -depth },
        { ...inTop, z: -depth }
      ], '#b51616');

      drawFacet([
        { ...inLeft, z: depth },
        { ...inRight, z: depth },
        { ...inRight, z: -depth },
        { ...inLeft, z: -depth }
      ], '#ef3535');

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="prism-canvas-container">
      <canvas ref={canvasRef} />
    </div>
  );
};

// -------------------------------------------------------------
// Main Application Component
// -------------------------------------------------------------
const App = () => {
  // Theme state: dark (default Riangle) or light
  const [isDark, setIsDark] = useState(true);

  // Active comparison metric: 'latency' | 'throughput' | 'shielding'
  const [activeMetric, setActiveMetric] = useState('latency');

  // Active capability accordion row index (Screenshot 2 exact style)
  const [activeCapIdx, setActiveCapIdx] = useState(2); // default: 03 (like Riangle screenshot)

  // Interactive request simulation state
  const [simState, setSimState] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Stats ref for animated counters
  const statsRef = useRef({ hitRatio: 0, latencyReduction: 0, throughputBoost: 0 });

  useEffect(() => {
    // Initial Stagger animation
    anime({
      targets: '.anim-reveal',
      translateY: [35, 0],
      opacity: [0, 1],
      easing: 'cubicBezier(0.16, 1, 0.30, 1)',
      duration: 1200,
      delay: anime.stagger(140, { start: 150 })
    });

    // Number counters
    anime({
      targets: statsRef.current,
      hitRatio: 87.2,
      latencyReduction: 87.2,
      throughputBoost: 706,
      easing: 'easeOutExpo',
      duration: 2500,
      update: function () {
        const hitEl = document.getElementById('cnt-hit-ratio');
        const latEl = document.getElementById('cnt-latency-red');
        const tpEl = document.getElementById('cnt-throughput-boost');
        if (hitEl) hitEl.innerText = statsRef.current.hitRatio.toFixed(1) + '%';
        if (latEl) latEl.innerText = statsRef.current.latencyReduction.toFixed(1) + '%';
        if (tpEl) tpEl.innerText = '+' + Math.round(statsRef.current.throughputBoost) + '%';
      }
    });
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
    }
  };

  // Riangle Capabilities Data (matching Screenshot 2 structure)
  const capabilities = [
    {
      idx: '01',
      title: 'Consistent Hashing',
      desc: 'Virtual node tokens distribute keys across nodes uniformly, preventing hotspot skew and thundering herds.'
    },
    {
      idx: '02',
      title: 'O(1) LRU Eviction',
      desc: 'Doubly-linked hash lists preserve hot asset caches in nanosecond edge RAM while gracefully discarding cold tails.'
    },
    {
      idx: '03',
      title: 'Origin Shielding',
      desc: 'Absorbs 87.3% of backend requests, eliminating database queueing latency and protecting critical origin assets.'
    },
    {
      idx: '04',
      title: 'Multi-Threaded Concurrency',
      desc: 'Independent mutex-partitioned node shards scaling up to 893+ requests/sec across multi-core server nodes.'
    }
  ];

  // Benchmark Datasets from C++ simulation
  const latencyData = [
    {
      name: 'Without CDN (Origin)',
      latency: 63.21,
      fill: '#F43333',
      display: '63.21 ms',
      detail: 'Origin DB delay + queue penalty'
    },
    {
      name: 'With CDN (Perceived Avg)',
      latency: 8.08,
      fill: '#3FD97A',
      display: '8.08 ms',
      detail: '7.8x overall response speedup'
    },
    {
      name: 'With CDN (Edge RAM Hit)',
      latency: 0.001,
      fill: '#3FE0D0',
      display: '0.001 ms',
      detail: 'Nanosecond memory lookup'
    }
  ];

  const throughputData = [
    {
      name: 'Without CDN (Origin Bottleneck)',
      rps: 126.5,
      fill: '#F43333',
      display: '126.5 req/s'
    },
    {
      name: 'With CDN (Edge Distributed Cluster)',
      rps: 893.2,
      fill: '#3FD97A',
      display: '893.2 req/s'
    }
  ];

  const shieldingData = [
    {
      name: 'Without CDN',
      originFetches: 20000,
      shieldedByEdge: 0,
      fill: '#F43333'
    },
    {
      name: 'With CDN',
      originFetches: 2554,
      shieldedByEdge: 17446,
      fill: '#3FD97A'
    }
  ];

  // Radial Dial Data
  const dialData = [
    { name: 'Misses', value: 2554, fill: '#F43333' },
    { name: 'Hits', value: 17446, fill: '#3FD97A' }
  ];

  // Scaling Redistribution Data
  const scalingData = [
    { name: 'Consistent Hashing Ring', moved: 19.4, kept: 80.6 },
    { name: 'Naive Hash % N', moved: 79.2, kept: 20.8 }
  ];

  // Node traffic breakdown
  const nodes = [
    { name: 'Node 0', reqs: 4556, hits: 4023, misses: 533, pct: 22.8 },
    { name: 'Node 1', reqs: 4315, hits: 3545, misses: 770, pct: 21.6 },
    { name: 'Node 2', reqs: 5889, hits: 5146, misses: 743, pct: 29.4 },
    { name: 'Node 3', reqs: 5240, hits: 4732, misses: 508, pct: 26.2 }
  ];

  const handleRunSim = (key, isHit) => {
    setIsSimulating(true);
    setSimState(null);

    setTimeout(() => {
      if (isHit) {
        setSimState({
          key,
          type: 'EDGE_CACHE_HIT',
          latency: '0.001 ms',
          node: 'Node-2 (Edge RAM)',
          color: '#3FD97A',
          desc: 'Instant in-memory lookup. Zero origin database contact.'
        });
      } else {
        setSimState({
          key,
          type: 'CACHE_MISS_ORIGIN_FETCH',
          latency: '63.2 ms',
          node: 'Origin Server -> Ingested into Edge Node-1 LRU',
          color: '#F43333',
          desc: 'Cold item fetched from slow backend database, then cached into edge RAM.'
        });
      }
      setIsSimulating(false);
    }, 280);
  };

  return (
    <div className="site-wrapper">
      {/* Architectural Background Grid */}
      <div className="riangle-grid-canvas" />

      <div className="site-content">
        {/* TOP HEADER */}
        <header className="site-header">
          <div className="header-bar">
            {/* Logo */}
            <a href="#hero" className="brand-anchor">
              <svg className="brand-glyph" viewBox="0 0 24 20" fill="none">
                <path d="M12 0L23.547 20H0.453L12 0Z" fill="#F43333" />
                <path d="M12 7L18 17.5H6L12 7Z" fill={isDark ? '#07080B' : '#F6F7F9'} />
              </svg>
              <span className="brand-text">CDN CORE</span>
              <span className="brand-sub">// DISTRIBUTED SIMULATOR</span>
            </a>

            {/* Riangle Nav Links with Roll Hover Animation */}
            <nav className="header-nav">
              <a href="#capabilities" className="nav-link-item">
                <span className="nav-idx">01</span>
                <span className="nav-roll">
                  <span>CAPABILITIES</span>
                  <span>CAPABILITIES</span>
                </span>
              </a>
              <a href="#comparison" className="nav-link-item">
                <span className="nav-idx">02</span>
                <span className="nav-roll">
                  <span>COMPARISON</span>
                  <span>COMPARISON</span>
                </span>
              </a>
              <a href="#telemetry" className="nav-link-item">
                <span className="nav-idx">03</span>
                <span className="nav-roll">
                  <span>TELEMETRY</span>
                  <span>TELEMETRY</span>
                </span>
              </a>
              <a href="#cluster" className="nav-link-item">
                <span className="nav-idx">04</span>
                <span className="nav-roll">
                  <span>TOPOLOGY</span>
                  <span>TOPOLOGY</span>
                </span>
              </a>
            </nav>

            {/* Riangle Theme Toggle Capsule */}
            <div className="header-controls">
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title="Toggle Dark / Light Mode"
              >
                {/* Sun */}
                <svg className="toggle-icon" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                {/* Moon */}
                <svg className="toggle-icon" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* HERO SECTION (EXACT SCREENSHOT 1 RIANGLE STYLE) */}
        <section id="hero" className="hero-section">
          <div className="hero-grid">
            <div className="hero-text-col anim-reveal">
              <h1 className="hero-headline">
                We accelerate<br />
                and distribute digital<br />
                and high-throughput<br />
                <em>experiences.</em>
              </h1>

              <div className="hero-meta-strip">
                <span className="hero-meta-item">CDN CORE</span>
                <span className="hero-meta-sep">·</span>
                <span className="hero-meta-item">EST. 2026</span>
                <span className="hero-meta-sep">·</span>
                <span className="hero-meta-item">C++17 ↔ LRU ↔ CONSISTENT HASHING</span>
              </div>
            </div>

            {/* Right 3D Riangle Prism Sculpture */}
            <div className="hero-visual-col anim-reveal">
              <RianglePrism />
            </div>
          </div>

          {/* Traveling Scroll Cue */}
          <div className="hero-scroll-cue">
            <div className="cue-track">
              <div className="cue-segment" />
            </div>
          </div>
        </section>

        {/* Spectrum Rainbow Rule */}
        <div className="spectrum-rule" />

        {/* SECTION 1: CAPABILITIES ACCORDION LIST (EXACT SCREENSHOT 2 RIANGLE STYLE) */}
        <section id="capabilities" className="section-wrapper">
          <div className="section-inner">
            <div className="mono-eyebrow">CAPABILITIES</div>

            <div className="capabilities-list">
              {capabilities.map((cap, i) => (
                <div
                  key={cap.idx}
                  className={`capability-row ${activeCapIdx === i ? 'active' : ''}`}
                  onClick={() => setActiveCapIdx(i)}
                >
                  <span className="capability-idx">{cap.idx}</span>
                  <h2 className="capability-title">{cap.title}</h2>
                  <p className="capability-desc">{cap.desc}</p>
                  <span className="capability-arrow">→</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Spectrum Rainbow Rule */}
        <div className="spectrum-rule" />

        {/* SECTION 2: INTUITIVE COMPARISON (WITHOUT CDN VS WITH CDN) */}
        <section id="comparison" className="section-wrapper">
          <div className="section-inner">
            <div className="mono-eyebrow">BENCHMARK COMPARISON</div>

            <div className="comp-header-flex">
              <div>
                <h2 className="comp-heading-title">
                  Without CDN vs. Distributed CDN
                </h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '1rem' }}>
                  Empirical 20,000-request benchmark under heavy 8-thread concurrent load.
                </p>
              </div>

              {/* Riangle Monospace Metric Tabs */}
              <div className="comp-tabs-row">
                <button
                  className={`comp-tab-btn ${activeMetric === 'latency' ? 'active' : ''}`}
                  onClick={() => setActiveMetric('latency')}
                >
                  01 LATENCY
                </button>
                <button
                  className={`comp-tab-btn ${activeMetric === 'throughput' ? 'active' : ''}`}
                  onClick={() => setActiveMetric('throughput')}
                >
                  02 THROUGHPUT
                </button>
                <button
                  className={`comp-tab-btn ${activeMetric === 'shielding' ? 'active' : ''}`}
                  onClick={() => setActiveMetric('shielding')}
                >
                  03 SHIELDING
                </button>
              </div>
            </div>

            {/* Two High-Contrast Architectural Comparison Cards (NO OVERLAP) */}
            <div className="comparison-cards-grid">
              {/* Card A: Without CDN */}
              <div className="arch-card origin">
                <div className="arch-card-header">
                  <div>
                    <span className="arch-tag red">Direct Architecture</span>
                    <h3 className="arch-title">Without CDN (Origin Only)</h3>
                  </div>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Average Response Latency</span>
                  <span className="arch-stat-number num-red">63.21 ms</span>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Throughput Capacity</span>
                  <span className="arch-stat-number num-red">126.5 req/s</span>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Backend Database Strain</span>
                  <span className="arch-stat-number num-red">20,000 Hits (100%)</span>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Edge Cache Hit Ratio</span>
                  <span className="arch-stat-number num-red">0.0% (All Misses)</span>
                </div>

                {/* Wireframe Flow */}
                <div className="arch-flow-diagram">
                  <div className="flow-line">
                    <span className="flow-node-badge badge-client">Client</span>
                    <span style={{ color: 'var(--text-dim)' }}>──( 63.2ms wire + origin queue delay )──▶</span>
                    <span className="flow-node-badge badge-origin">Origin DB 🐢</span>
                  </div>
                  <div style={{ color: 'var(--text-dim)', marginTop: '6px', fontSize: '0.7rem' }}>
                    Critical bottleneck: every user thread queues waiting on the origin database.
                  </div>
                </div>
              </div>

              {/* Card B: With CDN */}
              <div className="arch-card cdn">
                <div className="arch-card-header">
                  <div>
                    <span className="arch-tag green">Edge Architecture</span>
                    <h3 className="arch-title">With Distributed CDN</h3>
                  </div>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Average Response Latency</span>
                  <span className="arch-stat-number num-green">
                    8.08 ms <span style={{ fontSize: '0.8rem' }}>(7.8x faster)</span>
                  </span>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Throughput Capacity</span>
                  <span className="arch-stat-number num-green">
                    893.2 req/s <span style={{ fontSize: '0.8rem' }}>(+706%)</span>
                  </span>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Origin Database Shielding</span>
                  <span className="arch-stat-number num-green">
                    87.3% Offloaded <span style={{ fontSize: '0.8rem' }}>(only 2,554 fetches)</span>
                  </span>
                </div>

                <div className="arch-stat-row">
                  <span className="arch-stat-label">Edge In-Memory Hit Latency</span>
                  <span className="arch-stat-number num-green">0.001 ms (Instant)</span>
                </div>

                {/* Wireframe Flow */}
                <div className="arch-flow-diagram">
                  <div className="flow-line">
                    <span className="flow-node-badge badge-client">Client</span>
                    <span style={{ color: 'var(--text-dim)' }}>──( 0.001ms RAM )──▶</span>
                    <span className="flow-node-badge badge-edge">Edge Hash Ring ⚡ (87.2% Hit)</span>
                  </div>
                  <div className="flow-line" style={{ paddingLeft: '20px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>└──( only 12.8% miss )──▶</span>
                    <span className="flow-node-badge badge-origin">Origin DB (Protected)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Riangle Blueprint Interactive Comparison Graph */}
            <div className="comp-graph-stage">
              <div className="graph-top-bar">
                <div>
                  <h3 className="graph-title">
                    {activeMetric === 'latency' && 'Response Latency (ms) — Lower is Better'}
                    {activeMetric === 'throughput' && 'Cluster Throughput (req/sec) — Higher is Better'}
                    {activeMetric === 'shielding' && 'Origin Requests Offloaded vs. Hit'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                    {activeMetric === 'latency' && 'Edge cache drops latency by 87.2%, serving hot keys in 0.001ms RAM time.'}
                    {activeMetric === 'throughput' && 'Throughput jumps from 126.5 to 893.2 req/sec across 8 concurrent client threads.'}
                    {activeMetric === 'shielding' && '17,446 requests are absorbed directly at the edge, shielding the backend server.'}
                  </p>
                </div>
                <div className="graph-badge-highlight">
                  {activeMetric === 'latency' && '⚡ 87.2% LATENCY REDUCTION'}
                  {activeMetric === 'throughput' && '🚀 +706% THROUGHPUT BOOST'}
                  {activeMetric === 'shielding' && '🛡️ 87.3% BACKEND PROTECTION'}
                </div>
              </div>

              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {activeMetric === 'latency' ? (
                    <BarChart data={latencyData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-rule)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-main)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                      <YAxis stroke="var(--text-muted)" unit=" ms" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-ground-elevated)', borderColor: 'var(--border-rule-strong)', borderRadius: 2 }}
                        formatter={(val) => [`${val} ms`, 'Response Time']}
                      />
                      <Bar dataKey="latency" radius={[2, 2, 0, 0]} barSize={50}>
                        {latencyData.map((entry, idx) => (
                          <Cell key={`lat-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : activeMetric === 'throughput' ? (
                    <BarChart data={throughputData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-rule)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-main)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                      <YAxis stroke="var(--text-muted)" unit=" rps" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-ground-elevated)', borderColor: 'var(--border-rule-strong)', borderRadius: 2 }}
                        formatter={(val) => [`${val} req/sec`, 'Throughput']}
                      />
                      <Bar dataKey="rps" radius={[2, 2, 0, 0]} barSize={60}>
                        {throughputData.map((entry, idx) => (
                          <Cell key={`tp-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart data={shieldingData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-rule)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-main)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-ground-elevated)', borderColor: 'var(--border-rule-strong)', borderRadius: 2 }}
                      />
                      <Bar dataKey="originFetches" name="Hits reaching Origin" fill="#F43333" barSize={50} />
                      <Bar dataKey="shieldedByEdge" name="Shielded by Edge RAM" fill="#3FD97A" barSize={50} />
                      <Legend wrapperStyle={{ paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11 }} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Spectrum Rainbow Rule */}
        <div className="spectrum-rule" />

        {/* SECTION 3: TELEMETRY & LIVE SIMULATOR (ZERO OVERLAP) */}
        <section id="telemetry" className="section-wrapper">
          <div className="section-inner">
            <div className="mono-eyebrow">TELEMETRY & HIT RATIO</div>

            <div className="telemetry-split-grid">
              {/* Radial Hit Ratio Gauge */}
              <div className="radial-card-box">
                <div style={{ width: 260, height: 260, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="75%"
                      outerRadius="100%"
                      barSize={16}
                      data={dialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar
                        minAngle={15}
                        background={{ fill: isDark ? '#141822' : '#E2E5EA' }}
                        clockWise
                        dataKey="value"
                        cornerRadius={4}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>

                  <div className="radial-center-text">
                    <div className="radial-big-number" id="cnt-hit-ratio">87.2%</div>
                    <div className="radial-sub-label">Hit Ratio</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', marginTop: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <span style={{ color: '#3FD97A' }}>● 17,446 Hits</span>
                  <span style={{ color: '#F43333' }}>● 2,554 Misses</span>
                </div>
              </div>

              {/* Telemetry Stream & Interactive Playground */}
              <div className="terminal-card-box">
                <div className="terminal-header">
                  <span className="terminal-title">ENGINE TELEMETRY STREAM</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>C++17 // LRU ACTIVE</span>
                </div>

                <div className="term-line">
                  <span className="term-key">cache.lookup</span>(<span className="term-str">"hot_video_42"</span>)
                </div>
                <div className="term-line" style={{ paddingLeft: '16px' }}>
                  <span className="term-comment">// Query mapped to virtual ring position</span>
                </div>
                <div className="term-line" style={{ paddingLeft: '16px' }}>
                  target_node: <span className="term-val">"node-2"</span>,
                </div>
                <div className="term-line" style={{ paddingLeft: '16px' }}>
                  lookup_time: <span className="term-val">0.001 ms</span>,
                </div>
                <div className="term-line" style={{ paddingLeft: '16px' }}>
                  status: <span className="term-val">"EDGE_HIT_RAM"</span>
                </div>

                {/* Interactive Simulator Bar */}
                <div className="interactive-bench-bar">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      INTERACTIVE REQUEST BENCHMARK
                    </span>
                    {isSimulating && <span style={{ color: 'var(--refract)', fontSize: '0.7rem' }}>Running lookup...</span>}
                  </div>

                  <div className="bench-btn-group">
                    <button
                      className="bench-action-btn hot"
                      onClick={() => handleRunSim('video_trending_42', true)}
                    >
                      ▶ Request Hot Key (video_42)
                    </button>
                    <button
                      className="bench-action-btn hot"
                      onClick={() => handleRunSim('asset_music_1', true)}
                    >
                      ▶ Request Hot Key (music_1)
                    </button>
                    <button
                      className="bench-action-btn"
                      onClick={() => handleRunSim('archive_cold_499', false)}
                    >
                      ▶ Request Cold Key (archive_499)
                    </button>
                  </div>

                  {simState && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg-ground-elevated)', borderLeft: `3px solid ${simState.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.8rem' }}>
                        <span style={{ color: simState.color }}>{simState.type}</span>
                        <span style={{ color: 'var(--text-main)' }}>Latency: {simState.latency}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                        {simState.desc}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Spectrum Rainbow Rule */}
        <div className="spectrum-rule" />

        {/* SECTION 4: CLUSTER TOPOLOGY & CONSISTENT HASHING */}
        <section id="cluster" className="section-wrapper">
          <div className="section-inner">
            <div className="mono-eyebrow">CLUSTER TOPOLOGY & SCALING</div>

            <div className="cluster-cards-grid">
              {/* Scaling Comparison */}
              <div className="cluster-card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                  Scaling Redistribution (4 ➔ 5 Nodes)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Naive <code style={{ color: '#F43333' }}>hash % N</code> invalidates 79.2% of caches. Consistent hashing only moves 19.4% (1/N), keeping 80.6% preserved.
                </p>

                <div style={{ width: '100%', height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scalingData} layout="vertical" margin={{ top: 10, right: 30, left: 140, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-rule)" />
                      <XAxis type="number" unit="%" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-main)" tick={{ fill: 'var(--text-main)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-ground-elevated)', borderColor: 'var(--border-rule-strong)', borderRadius: 2 }}
                        formatter={(val) => [`${val}%`, '']}
                      />
                      <Bar dataKey="moved" name="% Keys Moved (Misses)" stackId="a" fill="#F43333" barSize={26} />
                      <Bar dataKey="kept" name="% Keys Kept Stable" stackId="a" fill="#6E8CFF" barSize={26} />
                      <Legend wrapperStyle={{ paddingTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Per-Node Load Distribution */}
              <div className="cluster-card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                  Per-Node Traffic Spread (20,000 Requests)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Evenly distributed across 4 nodes without hotspots:
                </p>

                {nodes.map((n) => (
                  <div key={n.name} className="node-row-item">
                    <div className="node-row-header">
                      <span>{n.name}</span>
                      <span style={{ color: '#3FD97A' }}>
                        {n.reqs.toLocaleString()} reqs ({n.pct}%)
                      </span>
                    </div>
                    <div className="node-track">
                      <div className="node-bar-fill" style={{ width: `${(n.reqs / 6000) * 100}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      <span>Hits: {n.hits.toLocaleString()}</span>
                      <span>Misses: {n.misses.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIANGLE FOOTER */}
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-meta">
              CDN CORE // HIGH-PERFORMANCE ENGINE · C++17 DISTRIBUTED CACHE
            </div>
            <div className="footer-meta">
              87.2% HIT RATIO · 893.2 RPS THROUGHPUT · 0.001MS RAM HIT
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
