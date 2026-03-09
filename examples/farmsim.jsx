import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS & DATA ───────────────────────────────────────────────────────
const COLORS = {
    bg: "#0a0e17",
    bgCard: "#111827",
    bgCardHover: "#1a2332",
    water: "#2563eb",
    waterLight: "#60a5fa",
    warmWater: "#ef4444",
    coolWater: "#06b6d4",
    plant: "#22c55e",
    plantDark: "#15803d",
    shrimp: "#f97316",
    fish: "#8b5cf6",
    salmon: "#ec4899",
    nitrogen: "#eab308",
    phosphorus: "#f59e0b",
    oxygen: "#38bdf8",
    co2: "#94a3b8",
    ammonia: "#dc2626",
    nitrite: "#ea580c",
    nitrate: "#65a30d",
    protein: "#a78bfa",
    accent: "#10b981",
    text: "#e2e8f0",
    textDim: "#94a3b8",
    border: "#1e293b",
    microgreen: "#4ade80",
    duckweed: "#86efac",
    bsf: "#d97706",
    drum: "#6366f1",
    biofilter: "#14b8a6",
    mineral: "#f59e0b",
};

const SPINE_SETPOINTS = {
    tempC: 30, tempF: 86, salinityPpt: 2.0, pH: 7.0, DO: 6.0,
    TAN: "~0", nitrite: "~0", nitrate: "fuel",
};

const MOLECULAR_PROCESSES = [
    {
        id: "photosynthesis", title: "Photosynthesis",
        equation: "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂",
        desc: "Chloroplasts capture photons (400–700nm PAR). Light reactions split H₂O at PSII, releasing O₂ and generating ATP + NADPH. Calvin cycle fixes CO₂ via RuBisCO into G3P, building glucose for structural cellulose, starch storage, and sucrose transport.",
        color: COLORS.plant, icon: "🌿",
        substeps: ["Light absorption by chlorophyll a/b", "Water photolysis → O₂ + H⁺ + e⁻", "Electron transport chain → ATP + NADPH", "Calvin cycle: CO₂ fixation via RuBisCO", "G3P → glucose → sucrose/starch/cellulose"]
    },
    {
        id: "nitrification", title: "Nitrification (Biofilter)",
        equation: "NH₃ → NO₂⁻ → NO₃⁻",
        desc: "Two-step aerobic oxidation by autotrophic bacteria. Nitrosomonas oxidizes ammonia to nitrite (NH₃ + 1.5O₂ → NO₂⁻ + H₂O + H⁺). Nitrobacter oxidizes nitrite to nitrate (NO₂⁻ + 0.5O₂ → NO₃⁻). Consumes O₂ and alkalinity, producing H⁺ (drives pH down).",
        color: COLORS.nitrogen, icon: "🦠",
        substeps: ["Ammonia-oxidizing bacteria (AOB): NH₃ + O₂ → NO₂⁻", "Alkalinity consumed: 7.14mg CaCO₃/mg NH₃-N", "Nitrite-oxidizing bacteria (NOB): NO₂⁻ + O₂ → NO₃⁻", "Net: pH drops, DO consumed heavily", "Biofilm on media provides surface area"]
    },
    {
        id: "plant_n_assimilation", title: "Plant Nitrogen Assimilation",
        equation: "NO₃⁻ → NO₂⁻ → NH₄⁺ → amino acids",
        desc: "Roots absorb NO₃⁻ via NRT transporters. Nitrate reductase (cytoplasm) reduces NO₃⁻ to NO₂⁻ using NADH. Nitrite reductase (plastid) reduces NO₂⁻ to NH₄⁺ using ferredoxin. GS/GOGAT pathway incorporates NH₄⁺ into glutamine then glutamate, the precursor for all amino acids.",
        color: COLORS.nitrate, icon: "🌱",
        substeps: ["NO₃⁻ uptake via NRT1/NRT2 transporters", "Nitrate reductase: NO₃⁻ + NADH → NO₂⁻", "Nitrite reductase: NO₂⁻ + 6Fd(red) → NH₄⁺", "GS: NH₄⁺ + glutamate → glutamine (ATP)", "GOGAT: glutamine + α-KG → 2 glutamate"]
    },
    {
        id: "fish_metabolism", title: "Fish/Shrimp Protein Metabolism",
        equation: "Feed protein → amino acids → muscle + NH₃",
        desc: "Digestive proteases hydrolyze feed protein into amino acids. Absorbed AAs are assembled into somatic protein (muscle growth). Excess or imbalanced AAs undergo deamination: amino group stripped as NH₃/NH₄⁺ and excreted via gills. Carbon skeleton enters energy metabolism (TCA cycle).",
        color: COLORS.fish, icon: "🐟",
        substeps: ["Pepsin/trypsin hydrolyze protein → peptides → AAs", "AA absorption in intestinal epithelium", "Anabolic: tRNA + ribosomes → muscle protein", "Catabolic: deamination strips -NH₂ → NH₃", "NH₃ excreted via gill diffusion into water"]
    },
    {
        id: "phosphorus_cycle", title: "Phosphorus Mineralization",
        equation: "Solid P (feces/feed) → H₂PO₄⁻ / HPO₄²⁻",
        desc: "60–90% of P is trapped in solids. In the mineralization barrel, heterotrophic bacteria decompose organic matter under aerobic/anaerobic conditions. Phosphatases cleave phosphate esters. Released orthophosphate (H₂PO₄⁻ at pH 7) dissolves into spine water for plant uptake via PHT transporters.",
        color: COLORS.phosphorus, icon: "💛",
        substeps: ["Solids collected by drum filter", "Heterotrophic bacteria decompose organic P", "Phosphatases cleave C-O-P ester bonds", "H₂PO₄⁻ released into solution at pH ~7", "Metered back to spine as fertility concentrate"]
    },
    {
        id: "ph_buffering", title: "pH Buffering & Alkalinity",
        equation: "CaCO₃ + 2H⁺ → Ca²⁺ + H₂O + CO₂",
        desc: "Nitrification generates H⁺ and consumes alkalinity at ~7.14mg CaCO₃ per mg NH₃-N oxidized. Slow-dissolving carbonate media (crushed limestone/oyster shell) in high-flow zones neutralizes acid, maintaining pH 6.8–7.2. Ca²⁺ release also supplies calcium for plant cell walls and shrimp exoskeletons.",
        color: COLORS.coolWater, icon: "⚖️",
        substeps: ["Nitrification produces H⁺ (acidification)", "CaCO₃ dissolution neutralizes H⁺", "Ca²⁺ available for plant/shrimp uptake", "CO₂ produced feeds back to photosynthesis", "Periodic media top-up replaces consumed buffer"]
    },
    {
        id: "germination", title: "Seed Germination",
        equation: "Seed + H₂O + O₂ + warmth → seedling",
        desc: "Imbibition: seed coat absorbs water, activating gibberellic acid (GA₃) signaling. GA₃ triggers aleurone layer to produce α-amylase, hydrolyzing starch reserves to glucose. Radicle emerges first (gravitropism via statoliths), then hypocotyl/epicotyl. Photomorphogenesis begins upon light exposure.",
        color: COLORS.microgreen, icon: "🌾",
        substeps: ["Imbibition: water uptake swells seed coat", "GA₃ signal → α-amylase production", "Starch → maltose → glucose (energy)", "Radicle emergence (root-first)", "Cotyledon expansion + chloroplast development"]
    },
    {
        id: "duckweed", title: "Duckweed Replication",
        equation: "1 frond → 2 fronds (doubling ~2–3 days)",
        desc: "Lemnaceae reproduce primarily via vegetative budding from meristematic pockets. Daughter fronds form in lateral pouches, separate at maturity. Doubling time 1.5–3 days under optimal conditions (25–30°C, high N/P). Protein content 25–45% DW, making it viable fish feed. Absorbs N/P from water, acting as biofilter.",
        color: COLORS.duckweed, icon: "🟢",
        substeps: ["Meristematic pocket initiates daughter frond", "Vegetative budding (no sexual reproduction needed)", "Frond separation at maturity", "N/P uptake from water → biofilter role", "Harvest: 25–45% crude protein → fish feed"]
    },
    {
        id: "bsf_lifecycle", title: "Black Soldier Fly Larvae (BSFL) Growth",
        equation: "Organic waste + BSFL → protein + frass",
        desc: "Hermetia illucens larvae consume decomposing organic matter at 25–35°C. Gut microbiome (Bacillus, Enterococcus) produces proteases, lipases, cellulases. Larvae accumulate ~42% protein, ~35% fat (DW). Frass (excrement) is nutrient-rich compost. Prepupae self-harvest by crawling upward. 6 larval instars over ~14 days.",
        color: COLORS.bsf, icon: "🪰",
        substeps: ["Eggs hatch on organic waste substrate", "6 larval instars over ~14 days", "Gut microbiome digests cellulose/protein/fat", "Larval body: ~42% protein, ~35% fat DW", "Prepupal self-harvest + frass as fertilizer"]
    },
    {
        id: "shrimp_molt", title: "Shrimp Molting Cycle",
        equation: "Old exoskeleton → ecdysis → new shell + growth",
        desc: "Ecdysone hormone triggers premolt: calcium reabsorbed from old exoskeleton, new cuticle synthesized beneath. At ecdysis, shrimp absorbs water to crack old shell, expands 15–40%. New chitin-protein matrix mineralizes with CaCO₃ over hours. Critical vulnerability: soft-shell period = cannibalism + disease risk. Solids removal of old shells prevents water fouling.",
        color: COLORS.shrimp, icon: "🦐",
        substeps: ["Premolt: Ca²⁺ reabsorbed, new cuticle forming", "Ecdysis: water absorption cracks old shell", "Expansion: 15–40% size increase", "Postmolt: CaCO₃ mineralization of new shell", "Old exoskeleton removal critical (rot → death)"]
    },
    {
        id: "brix_finish", title: "Brix Finish Protocol (Sugar Loading)",
        equation: "Deficit stress → ABA → stomatal close → sugar concentrate",
        desc: "Controlled water/nutrient deficit in final growth phase triggers abscisic acid (ABA) production. ABA closes stomata, reducing transpiration. Reduced water dilution concentrates sugars (sucrose, fructose, glucose). K⁺ drives phloem loading of sucrose into fruit. Ca²⁺ maintains cell wall integrity preventing cracking. Result: high-Brix, firm, aromatic fruit.",
        color: COLORS.warmWater, icon: "🍓",
        substeps: ["Water deficit → ABA signaling cascade", "Stomatal closure reduces water dilution", "K⁺ drives sucrose phloem loading to fruit", "Sugar concentration rises (measurable as °Brix)", "Ca²⁺ maintains cell wall firmness"]
    },
    {
        id: "k_transport", title: "Potassium & Sucrose Transport",
        equation: "K⁺ + sucrose → phloem loading → fruit",
        desc: "Potassium is the osmotic driver of phloem loading. K⁺/H⁺ antiporters energize sucrose-H⁺ symporters (SUT family) at companion cells. Pressure-flow hypothesis: high solute concentration at source creates turgor pressure, driving bulk flow to sink (fruit). K⁺ also activates >60 enzymes including pyruvate kinase and starch synthase.",
        color: COLORS.nitrogen, icon: "🔋",
        substeps: ["K⁺ uptake via root K⁺ channels", "K⁺/H⁺ antiport energizes phloem loading", "SUT symporters load sucrose into sieve tubes", "Pressure-flow drives sugar to fruit sink", "K⁺ activates enzymes: pyruvate kinase, etc."]
    },
];

// ─── ANIMATED PARTICLE COMPONENT ────────────────────────────────────────────
function AnimatedParticle({ startX, startY, endX, endY, color, delay, duration, size = 4, label }) {
    return (
        <circle r={size} fill={color} opacity="0.9">
            <animate attributeName="cx" from={startX} to={endX} dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
            <animate attributeName="cy" from={startY} to={endY} dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.9;0" dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
    );
}

// ─── WATER SPINE FLOW DIAGRAM ───────────────────────────────────────────────
function WaterSpineFlow() {
    const nodes = [
        { x: 80, y: 50, label: "Protein Tanks", sub: "Shrimp + Fish + Sturgeon", color: COLORS.fish, icon: "🐟" },
        { x: 260, y: 50, label: "Drum Filter", sub: "Solids removal", color: COLORS.drum, icon: "🥁" },
        { x: 440, y: 50, label: "Mineral Barrel", sub: "P recovery", color: COLORS.mineral, icon: "⚗️" },
        { x: 620, y: 50, label: "Biofilter", sub: "NH₃→NO₃⁻", color: COLORS.biofilter, icon: "🧫" },
        { x: 530, y: 170, label: "Warm Lane", sub: "Strawberry/Tomato/Pepper", color: COLORS.warmWater, icon: "🍅" },
        { x: 710, y: 170, label: "Cool Lane", sub: "Greens/Herbs/Micro", color: COLORS.coolWater, icon: "🥬" },
        { x: 350, y: 270, label: "Return Trough", sub: "Clean water", color: COLORS.waterLight, icon: "♻️" },
        { x: 80, y: 270, label: "Protein Sump", sub: "Recirculate", color: COLORS.water, icon: "💧" },
    ];

    const paths = [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 1, to: 3 },
        { from: 3, to: 4 }, { from: 3, to: 5 },
        { from: 4, to: 6 }, { from: 5, to: 6 },
        { from: 6, to: 7 }, { from: 7, to: 0 },
    ];

    return (
        <svg viewBox="0 0 800 320" style={{ width: "100%", height: "auto" }}>
            <defs>
                <marker id="arrowBlue" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.waterLight} />
                </marker>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {paths.map((p, i) => {
                const f = nodes[p.from]; const t = nodes[p.to];
                return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={COLORS.waterLight} strokeWidth="2" opacity="0.4" markerEnd="url(#arrowBlue)" />;
            })}

            {paths.map((p, i) => {
                const f = nodes[p.from]; const t = nodes[p.to];
                return <AnimatedParticle key={`p${i}`} startX={f.x} startY={f.y} endX={t.x} endY={t.y} color={COLORS.waterLight} delay={i * 0.6} duration={3} size={3} />;
            })}

            {nodes.map((n, i) => (
                <g key={i}>
                    <rect x={n.x - 60} y={n.y - 28} width={120} height={56} rx={8} fill={n.color} opacity="0.15" stroke={n.color} strokeWidth="1.5" />
                    <text x={n.x} y={n.y - 8} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="700">{n.icon} {n.label}</text>
                    <text x={n.x} y={n.y + 10} textAnchor="middle" fill={COLORS.textDim} fontSize="8.5">{n.sub}</text>
                </g>
            ))}
        </svg>
    );
}

// ─── POD LAYOUT VISUAL ──────────────────────────────────────────────────────
function PodLayout() {
    return (
        <svg viewBox="0 0 800 600" style={{ width: "100%", height: "auto" }}>
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke={COLORS.border} strokeWidth="0.3" />
                </pattern>
                <filter id="shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                </filter>
            </defs>

            <rect width="800" height="600" fill="url(#grid)" />
            <text x="400" y="24" textAnchor="middle" fill={COLORS.text} fontSize="14" fontWeight="800" letterSpacing="2">POD-12W LAYOUT — 40ft × 80ft</text>
            <text x="400" y="42" textAnchor="middle" fill={COLORS.textDim} fontSize="9">All components on single water spine</text>

            {/* Water spine trench */}
            <rect x={20} y={54} width={760} height={12} rx={3} fill={COLORS.water} opacity="0.3" stroke={COLORS.waterLight} strokeWidth="1" strokeDasharray="4 2" />
            <text x={400} y={63} textAnchor="middle" fill={COLORS.waterLight} fontSize="7" fontWeight="600">═══ WATER SPINE TRENCH (PVC Header + Return) ═══</text>

            {/* Shrimp Raceways */}
            {[0, 1].map(i => (
                <g key={`sr${i}`}>
                    <rect x={30 + i * 175} y={78} width={160} height={80} rx={40} fill={COLORS.shrimp} opacity="0.12" stroke={COLORS.shrimp} strokeWidth="1.5" filter="url(#shadow)" />
                    <ellipse cx={110 + i * 175} cy={118} rx={60} ry={25} fill="none" stroke={COLORS.shrimp} strokeWidth="0.8" strokeDasharray="3 2" opacity="0.5" />
                    <text x={110 + i * 175} y={100} textAnchor="middle" fill={COLORS.shrimp} fontSize="9" fontWeight="700">🦐 Shrimp Raceway {i + 1}</text>
                    <text x={110 + i * 175} y={115} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Oval racetrack, circular current</text>
                    <text x={110 + i * 175} y={128} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">Bottom drain → solids capture</text>
                    <text x={110 + i * 175} y={148} textAnchor="middle" fill={COLORS.shrimp} fontSize="6" opacity="0.7">Auto-feeder + DO monitor</text>
                </g>
            ))}

            {/* 12 Fish Tanks - 3 rows of 4 */}
            {Array.from({ length: 12 }).map((_, i) => {
                const row = Math.floor(i / 4); const col = i % 4;
                const x = 400 + col * 98; const y = 78 + row * 62;
                const isSturg = i >= 8;
                return (
                    <g key={`ft${i}`}>
                        <rect x={x} y={y} width={90} height={54} rx={6} fill={isSturg ? COLORS.salmon : COLORS.fish} opacity="0.1" stroke={isSturg ? COLORS.salmon : COLORS.fish} strokeWidth="1" />
                        <text x={x + 45} y={y + 18} textAnchor="middle" fill={isSturg ? COLORS.salmon : COLORS.fish} fontSize="8" fontWeight="600">{isSturg ? "🐋" : "🐟"} Tank {i + 1}</text>
                        <text x={x + 45} y={y + 30} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">{isSturg ? "Sturgeon" : "Barramundi"}</text>
                        <text x={x + 45} y={y + 42} textAnchor="middle" fill={COLORS.textDim} fontSize="5.5">Cohort {(i % 12) + 1}/12</text>
                    </g>
                );
            })}

            {/* Cold Annex */}
            <rect x={30} y={170} width={160} height={55} rx={6} fill={COLORS.coolWater} opacity="0.1" stroke={COLORS.coolWater} strokeWidth="1.5" strokeDasharray="4 2" />
            <text x={110} y={192} textAnchor="middle" fill={COLORS.coolWater} fontSize="9" fontWeight="700">🥶 Cold Annex</text>
            <text x={110} y={205} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Steelhead/Salmonid — heat exchanger lung</text>
            <text x={110} y={216} textAnchor="middle" fill={COLORS.textDim} fontSize="6">Same chemistry, colder temp</text>

            {/* Filtration Core */}
            <rect x={215} y={170} width={165} height={55} rx={6} fill={COLORS.drum} opacity="0.1" stroke={COLORS.drum} strokeWidth="1.5" />
            <text x={240} y={190} fill={COLORS.drum} fontSize="8.5" fontWeight="700">🥁 Drum Filter</text>
            <text x={240} y={202} fill={COLORS.textDim} fontSize="6.5">Solids: feed, feces, molts</text>

            <rect x={215} y={230} width={78} height={42} rx={4} fill={COLORS.mineral} opacity="0.12" stroke={COLORS.mineral} strokeWidth="1" />
            <text x={254} y={248} textAnchor="middle" fill={COLORS.mineral} fontSize="7" fontWeight="600">⚗️ Mineral</text>
            <text x={254} y={260} textAnchor="middle" fill={COLORS.textDim} fontSize="5.5">P recovery</text>

            <rect x={302} y={230} width={78} height={42} rx={4} fill={COLORS.biofilter} opacity="0.12" stroke={COLORS.biofilter} strokeWidth="1" />
            <text x={341} y={248} textAnchor="middle" fill={COLORS.biofilter} fontSize="7" fontWeight="600">🧫 Biofilter</text>
            <text x={341} y={260} textAnchor="middle" fill={COLORS.textDim} fontSize="5.5">NH₃→NO₃⁻</text>

            {/* Ferris Wheels - 12 wheels in 2 rows of 6 */}
            {Array.from({ length: 12 }).map((_, i) => {
                const row = Math.floor(i / 6); const col = i % 6;
                const cx = 80 + col * 122; const cy = 328 + row * 100;
                return (
                    <g key={`fw${i}`}>
                        <circle cx={cx} cy={cy} r={38} fill={COLORS.plant} opacity="0.06" stroke={COLORS.plant} strokeWidth="1" />
                        {/* Spokes */}
                        {Array.from({ length: 8 }).map((_, s) => {
                            const angle = (s * Math.PI * 2) / 8;
                            return <line key={s} x1={cx} y1={cy} x2={cx + Math.cos(angle) * 32} y2={cy + Math.sin(angle) * 32} stroke={COLORS.plant} strokeWidth="0.5" opacity="0.4" />;
                        })}
                        {/* Net cup dots */}
                        {Array.from({ length: 8 }).map((_, s) => {
                            const angle = (s * Math.PI * 2) / 8;
                            return <circle key={`nc${s}`} cx={cx + Math.cos(angle) * 30} cy={cy + Math.sin(angle) * 30} r={3} fill={COLORS.plant} opacity="0.5" />;
                        })}
                        <circle cx={cx} cy={cy} r={4} fill={COLORS.plantDark} />
                        <text x={cx} y={cy - 2} textAnchor="middle" fill={COLORS.text} fontSize="5.5" fontWeight="600">FW</text>
                        <text x={cx} y={cy + 5} textAnchor="middle" fill={COLORS.text} fontSize="5">{i + 1}</text>
                        <text x={cx} y={cy + 46} textAnchor="middle" fill={COLORS.textDim} fontSize="5.5">48 sites</text>
                    </g>
                );
            })}
            <text x={400} y={294} textAnchor="middle" fill={COLORS.plant} fontSize="10" fontWeight="700">🎡 FERRIS WHEEL BANK — 12 × FW-48 = 576 sites</text>

            {/* DWC Raft Lane */}
            <rect x={30} y={465} width={300} height={48} rx={6} fill={COLORS.coolWater} opacity="0.1" stroke={COLORS.coolWater} strokeWidth="1.5" />
            {Array.from({ length: 8 }).map((_, i) => (
                <rect key={i} x={42 + i * 35} y={475} width={28} height={28} rx={3} fill={COLORS.coolWater} opacity="0.15" stroke={COLORS.coolWater} strokeWidth="0.5" />
            ))}
            <text x={180} y={479} textAnchor="middle" fill={COLORS.coolWater} fontSize="9" fontWeight="700">🥬 DWC Raft Lane — Leafy Greens</text>
            <text x={180} y={505} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">Romaine • Baby Gem • Baby Greens | Batch: seed/raft/harvest</text>

            {/* Microgreens Rack */}
            <rect x={345} y={465} width={140} height={48} rx={6} fill={COLORS.microgreen} opacity="0.1" stroke={COLORS.microgreen} strokeWidth="1.5" />
            {Array.from({ length: 4 }).map((_, i) => (
                <rect key={i} x={355} y={472 + i * 9} width={120} height={7} rx={2} fill={COLORS.microgreen} opacity="0.12" />
            ))}
            <text x={415} y={482} textAnchor="middle" fill={COLORS.microgreen} fontSize="8" fontWeight="700">🌱 Microgreens</text>
            <text x={415} y={505} textAnchor="middle" fill={COLORS.textDim} fontSize="6">7–14 day cycles | Recirc mist</text>

            {/* Trellis Gutter */}
            <rect x={500} y={465} width={140} height={48} rx={6} fill={COLORS.warmWater} opacity="0.1" stroke={COLORS.warmWater} strokeWidth="1.5" />
            <text x={570} y={484} textAnchor="middle" fill={COLORS.warmWater} fontSize="8" fontWeight="700">🍅 Trellis Gutter</text>
            <text x={570} y={497} textAnchor="middle" fill={COLORS.textDim} fontSize="6">Tomato • Pepper • Vine</text>
            <text x={570} y={507} textAnchor="middle" fill={COLORS.textDim} fontSize="5.5">Drip-to-gutter + Brix finish</text>

            {/* Nursery + Packout */}
            <rect x={655} y={465} width={65} height={48} rx={6} fill={COLORS.accent} opacity="0.1" stroke={COLORS.accent} strokeWidth="1" />
            <text x={687} y={485} textAnchor="middle" fill={COLORS.accent} fontSize="7" fontWeight="600">🌾 Nursery</text>
            <text x={687} y={498} textAnchor="middle" fill={COLORS.textDim} fontSize="5.5">Plugs/Grafts</text>

            <rect x={725} y={465} width={65} height={48} rx={6} fill={COLORS.text} opacity="0.08" stroke={COLORS.text} strokeWidth="0.5" />
            <text x={757} y={485} textAnchor="middle" fill={COLORS.text} fontSize="7" fontWeight="600">📦 Packout</text>
            <text x={757} y={498} textAnchor="middle" fill={COLORS.textDim} fontSize="5.5">Grade/Brix</text>

            {/* Automation badges */}
            <rect x={30} y={530} width={760} height={58} rx={8} fill={COLORS.bgCard} stroke={COLORS.border} strokeWidth="1" />
            <text x={400} y={548} textAnchor="middle" fill={COLORS.accent} fontSize="10" fontWeight="800" letterSpacing="1">⚡ AUTOMATION LAYER</text>
            {["Auto-Feeders (multi-week)", "Redundant Blowers ×2", "DO + Level Alarms", "Battery Backup", "Camera (shrimp)", "Float Valve (makeup H₂O)", "Drum Filter (continuous)"].map((t, i) => (
                <text key={i} x={30 + (i % 4) * 192 + 96} y={565 + Math.floor(i / 4) * 14} textAnchor="middle" fill={COLORS.textDim} fontSize="7">✓ {t}</text>
            ))}
        </svg>
    );
}

// ─── MOLECULAR PROCESS CARD ─────────────────────────────────────────────────
function MolecularCard({ process, isExpanded, onToggle }) {
    return (
        <div onClick={onToggle} style={{
            background: isExpanded ? `${process.color}08` : COLORS.bgCard,
            border: `1px solid ${isExpanded ? process.color : COLORS.border}`,
            borderRadius: 12, padding: "16px 20px", cursor: "pointer",
            transition: "all 0.3s ease",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{process.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ color: process.color, fontSize: 14, fontWeight: 700 }}>{process.title}</div>
                    <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{process.equation}</div>
                </div>
                <span style={{ color: COLORS.textDim, fontSize: 18 }}>{isExpanded ? "▾" : "▸"}</span>
            </div>
            {isExpanded && (
                <div style={{ marginTop: 14 }}>
                    <p style={{ color: COLORS.text, fontSize: 12, lineHeight: 1.7, margin: "0 0 12px 0" }}>{process.desc}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {process.substeps.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <span style={{
                                    minWidth: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                    background: `${process.color}20`, color: process.color, fontSize: 10, fontWeight: 700,
                                }}>{i + 1}</span>
                                <span style={{ color: COLORS.text, fontSize: 11, lineHeight: 1.5 }}>{s}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── SPINE SETPOINTS DISPLAY ────────────────────────────────────────────────
function SpineSetpoints() {
    const items = [
        { label: "Temp", value: "30°C / 86°F", color: COLORS.warmWater, icon: "🌡️" },
        { label: "Salinity", value: "2.0 ppt", color: COLORS.water, icon: "🧂" },
        { label: "pH", value: "7.0", color: COLORS.biofilter, icon: "⚖️" },
        { label: "DO", value: "≥6 mg/L", color: COLORS.oxygen, icon: "💨" },
        { label: "TAN", value: "~0", color: COLORS.ammonia, icon: "⚠️" },
        { label: "NO₂⁻", value: "~0", color: COLORS.nitrite, icon: "🔶" },
        { label: "NO₃⁻", value: "Plant fuel", color: COLORS.nitrate, icon: "🌿" },
    ];
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
            {items.map((it, i) => (
                <div key={i} style={{
                    background: `${it.color}10`, border: `1px solid ${it.color}30`, borderRadius: 8,
                    padding: "10px 8px", textAlign: "center",
                }}>
                    <div style={{ fontSize: 18 }}>{it.icon}</div>
                    <div style={{ color: it.color, fontSize: 13, fontWeight: 700, marginTop: 2 }}>{it.value}</div>
                    <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 2 }}>{it.label}</div>
                </div>
            ))}
        </div>
    );
}

// ─── COHORT CALENDAR ────────────────────────────────────────────────────────
function CohortCalendar() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const shrimpCohorts = [
        { start: 2, end: 5, label: "Cohort A", color: COLORS.shrimp },
        { start: 5, end: 8, label: "Cohort B", color: "#fb923c" },
        { start: 8, end: 11, label: "Cohort C", color: "#fdba74" },
    ];
    return (
        <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `60px repeat(12, 1fr)`, gap: 2, minWidth: 600 }}>
                <div style={{ color: COLORS.textDim, fontSize: 9, padding: 4 }}>Species</div>
                {months.map(m => <div key={m} style={{ color: COLORS.textDim, fontSize: 9, textAlign: "center", padding: 4 }}>{m}</div>)}

                {/* Shrimp row */}
                <div style={{ color: COLORS.shrimp, fontSize: 9, padding: 4, fontWeight: 600 }}>🦐 Shrimp</div>
                {months.map((_, mi) => {
                    const cohort = shrimpCohorts.find(c => mi >= c.start && mi < c.end);
                    return (
                        <div key={mi} style={{
                            background: cohort ? `${cohort.color}25` : "transparent",
                            border: cohort ? `1px solid ${cohort.color}50` : `1px solid ${COLORS.border}`,
                            borderRadius: 4, textAlign: "center", padding: 3, fontSize: 7, color: cohort ? cohort.color : COLORS.textDim,
                        }}>{cohort ? cohort.label : "—"}</div>
                    );
                })}

                {/* Fish row */}
                <div style={{ color: COLORS.fish, fontSize: 9, padding: 4, fontWeight: 600 }}>🐟 Barra</div>
                {months.map((_, mi) => (
                    <div key={mi} style={{
                        background: `${COLORS.fish}15`, border: `1px solid ${COLORS.fish}30`,
                        borderRadius: 4, textAlign: "center", padding: 3, fontSize: 7, color: COLORS.fish,
                    }}>T{mi + 1}</div>
                ))}

                {/* Sturgeon row */}
                <div style={{ color: COLORS.salmon, fontSize: 9, padding: 4, fontWeight: 600 }}>🐋 Sturg</div>
                {months.map((_, mi) => (
                    <div key={mi} style={{
                        background: `${COLORS.salmon}10`, border: `1px solid ${COLORS.salmon}20`,
                        borderRadius: 4, textAlign: "center", padding: 3, fontSize: 7, color: COLORS.salmon,
                    }}>grow</div>
                ))}

                {/* Salmonid row */}
                <div style={{ color: COLORS.coolWater, fontSize: 9, padding: 4, fontWeight: 600 }}>🥶 Salmon</div>
                {months.map((_, mi) => {
                    const cold = mi <= 3 || mi >= 10;
                    return (
                        <div key={mi} style={{
                            background: cold ? `${COLORS.coolWater}20` : "transparent",
                            border: `1px solid ${cold ? COLORS.coolWater + "40" : COLORS.border}`,
                            borderRadius: 4, textAlign: "center", padding: 3, fontSize: 7, color: cold ? COLORS.coolWater : COLORS.textDim,
                        }}>{cold ? "active" : "—"}</div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── LIVE SIMULATION TICKER ─────────────────────────────────────────────────
function LiveSimulation() {
    const [tick, setTick] = useState(0);
    const [metrics, setMetrics] = useState({
        nh3: 0.02, no2: 0.01, no3: 42, pH: 7.0, DO: 6.8, temp: 30.0,
        shrimpG: 12.4, fishG: 340, plantSites: 576,
        totalN: 100, plantUptakeN: 0, biofilterN: 0,
    });

    useEffect(() => {
        const id = setInterval(() => {
            setTick(t => t + 1);
            setMetrics(m => {
                const noise = () => (Math.random() - 0.5) * 0.01;
                const fishExcrete = 0.003 + noise();
                const biofilterConvert = 0.0028;
                const plantUptake = 0.0025;
                return {
                    nh3: Math.max(0.005, Math.min(0.08, m.nh3 + fishExcrete - biofilterConvert + noise())),
                    no2: Math.max(0.002, Math.min(0.05, m.no2 + biofilterConvert * 0.3 - biofilterConvert * 0.7 + noise())),
                    no3: Math.max(20, Math.min(80, m.no3 + biofilterConvert * 800 - plantUptake * 750 + noise() * 100)),
                    pH: Math.max(6.7, Math.min(7.3, m.pH - 0.001 + noise())),
                    DO: Math.max(5.5, Math.min(8, m.DO + noise() * 2)),
                    temp: Math.max(29, Math.min(31, m.temp + noise())),
                    shrimpG: m.shrimpG + 0.015 + noise() * 0.1,
                    fishG: m.fishG + 0.08 + noise(),
                    plantSites: 576,
                    totalN: 100,
                    plantUptakeN: ((tick * 2.3) % 100),
                    biofilterN: ((tick * 3.1 + 33) % 100),
                };
            });
        }, 1500);
        return () => clearInterval(id);
    }, [tick]);

    const gauges = [
        { label: "NH₃ (TAN)", value: metrics.nh3.toFixed(3), unit: "mg/L", color: metrics.nh3 > 0.05 ? COLORS.ammonia : COLORS.accent, max: 0.1, current: metrics.nh3 },
        { label: "NO₂⁻", value: metrics.no2.toFixed(3), unit: "mg/L", color: metrics.no2 > 0.03 ? COLORS.nitrite : COLORS.accent, max: 0.05, current: metrics.no2 },
        { label: "NO₃⁻", value: metrics.no3.toFixed(1), unit: "mg/L", color: COLORS.nitrate, max: 80, current: metrics.no3 },
        { label: "pH", value: metrics.pH.toFixed(2), unit: "", color: COLORS.biofilter, max: 8, current: metrics.pH },
        { label: "DO", value: metrics.DO.toFixed(1), unit: "mg/L", color: COLORS.oxygen, max: 10, current: metrics.DO },
        { label: "Temp", value: metrics.temp.toFixed(1), unit: "°C", color: COLORS.warmWater, max: 35, current: metrics.temp },
    ];

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 16 }}>
                {gauges.map((g, i) => (
                    <div key={i} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                        <div style={{ color: COLORS.textDim, fontSize: 9, marginBottom: 4 }}>{g.label}</div>
                        <div style={{ color: g.color, fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{g.value}</div>
                        <div style={{ color: COLORS.textDim, fontSize: 8 }}>{g.unit}</div>
                        <div style={{ width: "100%", height: 4, background: `${g.color}20`, borderRadius: 2, marginTop: 6 }}>
                            <div style={{ width: `${Math.min(100, (g.current / g.max) * 100)}%`, height: "100%", background: g.color, borderRadius: 2, transition: "width 1s ease" }} />
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ background: `${COLORS.shrimp}10`, border: `1px solid ${COLORS.shrimp}30`, borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 20 }}>🦐</div>
                    <div style={{ color: COLORS.shrimp, fontSize: 16, fontWeight: 700 }}>{metrics.shrimpG.toFixed(1)}g</div>
                    <div style={{ color: COLORS.textDim, fontSize: 8 }}>Avg shrimp weight</div>
                </div>
                <div style={{ background: `${COLORS.fish}10`, border: `1px solid ${COLORS.fish}30`, borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 20 }}>🐟</div>
                    <div style={{ color: COLORS.fish, fontSize: 16, fontWeight: 700 }}>{metrics.fishG.toFixed(0)}g</div>
                    <div style={{ color: COLORS.textDim, fontSize: 8 }}>Avg barramundi weight</div>
                </div>
                <div style={{ background: `${COLORS.plant}10`, border: `1px solid ${COLORS.plant}30`, borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 20 }}>🌿</div>
                    <div style={{ color: COLORS.plant, fontSize: 16, fontWeight: 700 }}>{metrics.plantSites}</div>
                    <div style={{ color: COLORS.textDim, fontSize: 8 }}>Active plant sites</div>
                </div>
            </div>
        </div>
    );
}

// ─── NITROGEN CYCLE VISUAL ──────────────────────────────────────────────────
function NitrogenCycleVisual() {
    return (
        <svg viewBox="0 0 600 400" style={{ width: "100%", height: "auto" }}>
            <defs>
                <marker id="arrN" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.nitrogen} />
                </marker>
            </defs>

            {/* Fish excretion */}
            <rect x={30} y={30} width={130} height={80} rx={10} fill={COLORS.fish} opacity="0.12" stroke={COLORS.fish} strokeWidth="1.5" />
            <text x={95} y={55} textAnchor="middle" fill={COLORS.fish} fontSize="11" fontWeight="700">🐟 Fish/Shrimp</text>
            <text x={95} y={72} textAnchor="middle" fill={COLORS.textDim} fontSize="8">Protein → Amino Acids</text>
            <text x={95} y={86} textAnchor="middle" fill={COLORS.ammonia} fontSize="8">Excrete NH₃/NH₄⁺</text>

            {/* Arrow fish → ammonia */}
            <line x1={160} y1={70} x2={220} y2={70} stroke={COLORS.ammonia} strokeWidth="2" markerEnd="url(#arrN)" />
            <AnimatedParticle startX={160} startY={70} endX={220} endY={70} color={COLORS.ammonia} delay={0} duration={2} size={4} />

            {/* Ammonia pool */}
            <rect x={225} y={40} width={110} height={60} rx={8} fill={COLORS.ammonia} opacity="0.12" stroke={COLORS.ammonia} strokeWidth="1.5" />
            <text x={280} y={62} textAnchor="middle" fill={COLORS.ammonia} fontSize="12" fontWeight="800">NH₃/NH₄⁺</text>
            <text x={280} y={78} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Toxic if accumulated</text>

            {/* Arrow ammonia → nitrite */}
            <line x1={280} y1={100} x2={280} y2={150} stroke={COLORS.nitrite} strokeWidth="2" markerEnd="url(#arrN)" />
            <text x={310} y={130} fill={COLORS.textDim} fontSize="7" fontStyle="italic">Nitrosomonas</text>
            <text x={310} y={142} fill={COLORS.textDim} fontSize="6">+ 1.5 O₂</text>
            <AnimatedParticle startX={280} startY={100} endX={280} endY={150} color={COLORS.nitrite} delay={0.5} duration={2} size={4} />

            {/* Nitrite pool */}
            <rect x={225} y={155} width={110} height={55} rx={8} fill={COLORS.nitrite} opacity="0.12" stroke={COLORS.nitrite} strokeWidth="1.5" />
            <text x={280} y={177} textAnchor="middle" fill={COLORS.nitrite} fontSize="12" fontWeight="800">NO₂⁻</text>
            <text x={280} y={193} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Nitrite (still toxic)</text>

            {/* Arrow nitrite → nitrate */}
            <line x1={280} y1={210} x2={280} y2={260} stroke={COLORS.nitrate} strokeWidth="2" markerEnd="url(#arrN)" />
            <text x={310} y={238} fill={COLORS.textDim} fontSize="7" fontStyle="italic">Nitrobacter</text>
            <text x={310} y={250} fill={COLORS.textDim} fontSize="6">+ 0.5 O₂</text>
            <AnimatedParticle startX={280} startY={210} endX={280} endY={260} color={COLORS.nitrate} delay={1} duration={2} size={4} />

            {/* Nitrate pool */}
            <rect x={225} y={265} width={110} height={55} rx={8} fill={COLORS.nitrate} opacity="0.15" stroke={COLORS.nitrate} strokeWidth="1.5" />
            <text x={280} y={287} textAnchor="middle" fill={COLORS.nitrate} fontSize="12" fontWeight="800">NO₃⁻</text>
            <text x={280} y={303} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Plant-usable nitrogen</text>

            {/* Arrow nitrate → plants */}
            <line x1={335} y1={292} x2={420} y2={292} stroke={COLORS.plant} strokeWidth="2" markerEnd="url(#arrN)" />
            <AnimatedParticle startX={335} startY={292} endX={420} endY={292} color={COLORS.plant} delay={1.5} duration={2} size={4} />

            {/* Plant assimilation */}
            <rect x={425} y={240} width={150} height={110} rx={10} fill={COLORS.plant} opacity="0.1" stroke={COLORS.plant} strokeWidth="1.5" />
            <text x={500} y={262} textAnchor="middle" fill={COLORS.plant} fontSize="10" fontWeight="700">🌿 Plant Uptake</text>
            <text x={500} y={280} textAnchor="middle" fill={COLORS.textDim} fontSize="7">NO₃⁻ → NO₂⁻ → NH₄⁺</text>
            <text x={500} y={294} textAnchor="middle" fill={COLORS.textDim} fontSize="7">GS/GOGAT → glutamine</text>
            <text x={500} y={308} textAnchor="middle" fill={COLORS.textDim} fontSize="7">→ amino acids → protein</text>
            <text x={500} y={325} textAnchor="middle" fill={COLORS.accent} fontSize="8" fontWeight="600">Clean water returns ♻️</text>

            {/* Return arrow */}
            <path d="M 500 350 L 500 380 L 95 380 L 95 110" fill="none" stroke={COLORS.waterLight} strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrN)" />
            <text x={300} y={375} textAnchor="middle" fill={COLORS.waterLight} fontSize="7">Cleaned water → back to protein tanks</text>

            {/* Phosphorus side path */}
            <rect x={30} y={155} width={130} height={85} rx={8} fill={COLORS.phosphorus} opacity="0.1" stroke={COLORS.phosphorus} strokeWidth="1" />
            <text x={95} y={175} textAnchor="middle" fill={COLORS.phosphorus} fontSize="9" fontWeight="700">💛 Solids / P Cycle</text>
            <text x={95} y={190} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">60–90% P in solids</text>
            <text x={95} y={203} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">Drum filter → mineral barrel</text>
            <text x={95} y={216} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">Phosphatases → H₂PO₄⁻</text>
            <text x={95} y={229} textAnchor="middle" fill={COLORS.phosphorus} fontSize="6.5">→ metered back to spine</text>

            {/* pH buffering note */}
            <rect x={425} y={40} width={150} height={75} rx={8} fill={COLORS.coolWater} opacity="0.08" stroke={COLORS.coolWater} strokeWidth="1" />
            <text x={500} y={58} textAnchor="middle" fill={COLORS.coolWater} fontSize="9" fontWeight="700">⚖️ pH Buffer</text>
            <text x={500} y={74} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">CaCO₃ + 2H⁺ →</text>
            <text x={500} y={86} textAnchor="middle" fill={COLORS.textDim} fontSize="6.5">Ca²⁺ + H₂O + CO₂</text>
            <text x={500} y={100} textAnchor="middle" fill={COLORS.textDim} fontSize="6">Oyster shell / limestone</text>
        </svg>
    );
}

// ─── FEED ECOSYSTEM VISUAL ──────────────────────────────────────────────────
function FeedEcosystem() {
    return (
        <svg viewBox="0 0 600 300" style={{ width: "100%", height: "auto" }}>
            {/* Duckweed */}
            <rect x={20} y={20} width={170} height={120} rx={10} fill={COLORS.duckweed} opacity="0.08" stroke={COLORS.duckweed} strokeWidth="1.5" />
            <text x={105} y={42} textAnchor="middle" fill={COLORS.duckweed} fontSize="11" fontWeight="700">🟢 Duckweed (Lemna)</text>
            <text x={105} y={58} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Doubling: 1.5–3 days</text>
            <text x={105} y={72} textAnchor="middle" fill={COLORS.textDim} fontSize="7">25–45% crude protein DW</text>
            <text x={105} y={86} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Vegetative budding from</text>
            <text x={105} y={98} textAnchor="middle" fill={COLORS.textDim} fontSize="7">meristematic pockets</text>
            <text x={105} y={112} textAnchor="middle" fill={COLORS.accent} fontSize="7">Absorbs N+P from water</text>
            <text x={105} y={126} textAnchor="middle" fill={COLORS.accent} fontSize="7">→ dual biofilter + feed</text>

            {/* BSF */}
            <rect x={215} y={20} width={170} height={120} rx={10} fill={COLORS.bsf} opacity="0.1" stroke={COLORS.bsf} strokeWidth="1.5" />
            <text x={300} y={42} textAnchor="middle" fill={COLORS.bsf} fontSize="11" fontWeight="700">🪰 BSF Larvae</text>
            <text x={300} y={58} textAnchor="middle" fill={COLORS.textDim} fontSize="7">6 instars over ~14 days</text>
            <text x={300} y={72} textAnchor="middle" fill={COLORS.textDim} fontSize="7">~42% protein, ~35% fat DW</text>
            <text x={300} y={86} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Gut: Bacillus, Enterococcus</text>
            <text x={300} y={100} textAnchor="middle" fill={COLORS.textDim} fontSize="7">digest cellulose/protein/fat</text>
            <text x={300} y={114} textAnchor="middle" fill={COLORS.accent} fontSize="7">Converts farm waste → feed</text>
            <text x={300} y={128} textAnchor="middle" fill={COLORS.accent} fontSize="7">Frass → back to compost</text>

            {/* Microalgae */}
            <rect x={410} y={20} width={170} height={120} rx={10} fill={COLORS.plant} opacity="0.08" stroke={COLORS.plant} strokeWidth="1.5" />
            <text x={495} y={42} textAnchor="middle" fill={COLORS.plant} fontSize="11" fontWeight="700">🦠 Microalgae</text>
            <text x={495} y={58} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Spirulina / Chlorella</text>
            <text x={495} y={72} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Photosynthetic: CO₂→O₂</text>
            <text x={495} y={86} textAnchor="middle" fill={COLORS.textDim} fontSize="7">50–70% protein DW</text>
            <text x={495} y={100} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Binary fission doubling</text>
            <text x={495} y={114} textAnchor="middle" fill={COLORS.accent} fontSize="7">Shrimp/fish larval feed</text>
            <text x={495} y={128} textAnchor="middle" fill={COLORS.accent} fontSize="7">+ natural water oxygenator</text>

            {/* Arrows to fish */}
            <rect x={200} y={180} width={200} height={70} rx={10} fill={COLORS.fish} opacity="0.1" stroke={COLORS.fish} strokeWidth="1.5" />
            <text x={300} y={202} textAnchor="middle" fill={COLORS.fish} fontSize="12" fontWeight="700">🐟🦐 Protein Tanks</text>
            <text x={300} y={218} textAnchor="middle" fill={COLORS.textDim} fontSize="8">Barramundi + Shrimp + Sturgeon</text>
            <text x={300} y={232} textAnchor="middle" fill={COLORS.textDim} fontSize="7">Commercial feed + on-farm supplements</text>

            <line x1={105} y1={140} x2={240} y2={180} stroke={COLORS.duckweed} strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1={300} y1={140} x2={300} y2={180} stroke={COLORS.bsf} strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1={495} y1={140} x2={360} y2={180} stroke={COLORS.plant} strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Waste back */}
            <text x={300} y={272} textAnchor="middle" fill={COLORS.textDim} fontSize="8">Fish waste → NH₃ + solids → nitrification + mineralization → plants + duckweed → repeat ♻️</text>
            <rect x={50} y={260} width={500} height={22} rx={6} fill={COLORS.waterLight} opacity="0.06" stroke={COLORS.waterLight} strokeWidth="0.5" />
        </svg>
    );
}

// ─── CROP ZONE DETAIL ───────────────────────────────────────────────────────
function CropZoneDetail() {
    const zones = [
        {
            name: "Cool Lane — Greens & Herbs", color: COLORS.coolWater, icon: "❄️",
            items: [
                { crop: "Romaine / Baby Gem", system: "DWC Raft", cycle: "30–45 days", notes: "Batch seed/raft/harvest" },
                { crop: "Baby Greens / Spinach", system: "DWC Raft", cycle: "21–28 days", notes: "High turnover, monitoring only" },
                { crop: "Basil / Shiso / Mint", system: "FW-48 Wheel", cycle: "Cut-and-come", notes: "Chef garnish pod" },
                { crop: "Dill / Tarragon / Chives", system: "FW-48 Wheel", cycle: "Cut-and-come", notes: "Small root volume" },
                { crop: "Microgreens (20+ vars)", system: "Rack / Mist", cycle: "7–14 days", notes: "Value density monster" },
            ]
        },
        {
            name: "Warm Lane — Fruiting & Luxury", color: COLORS.warmWater, icon: "🔥",
            items: [
                { crop: "Strawberries", system: "FW-48 Wheel", cycle: "Everbearing", notes: "Brix finish + clean fruit" },
                { crop: "Tomatoes (heirloom/cherry)", system: "Trellis Gutter", cycle: "70–90 days", notes: "Drip-to-gutter, deficit pulse" },
                { crop: "Peppers (bell/specialty)", system: "Trellis Gutter", cycle: "75–95 days", notes: "K for sugar, Ca for firmness" },
                { crop: "Cucumbers / Melons", system: "Trellis Gutter", cycle: "55–70 days", notes: "Vine trained, same spine" },
            ]
        }
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {zones.map((z, zi) => (
                <div key={zi} style={{ background: `${z.color}06`, border: `1px solid ${z.color}25`, borderRadius: 10, padding: 14 }}>
                    <div style={{ color: z.color, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{z.icon} {z.name}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.5fr", gap: 4 }}>
                        <div style={{ color: COLORS.textDim, fontSize: 8, fontWeight: 600 }}>CROP</div>
                        <div style={{ color: COLORS.textDim, fontSize: 8, fontWeight: 600 }}>SYSTEM</div>
                        <div style={{ color: COLORS.textDim, fontSize: 8, fontWeight: 600 }}>CYCLE</div>
                        <div style={{ color: COLORS.textDim, fontSize: 8, fontWeight: 600 }}>NOTES</div>
                        {z.items.map((it, ii) => (
                            <React.Fragment key={ii}>
                                <div style={{ color: COLORS.text, fontSize: 10, padding: "3px 0" }}>{it.crop}</div>
                                <div style={{ color: z.color, fontSize: 10, padding: "3px 0" }}>{it.system}</div>
                                <div style={{ color: COLORS.textDim, fontSize: 10, padding: "3px 0" }}>{it.cycle}</div>
                                <div style={{ color: COLORS.textDim, fontSize: 9, padding: "3px 0" }}>{it.notes}</div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function FarmSimulation() {
    const [activeSection, setActiveSection] = useState("overview");
    const [expandedProcesses, setExpandedProcesses] = useState(new Set(["photosynthesis"]));

    const toggleProcess = useCallback((id) => {
        setExpandedProcesses(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const sections = [
        { id: "overview", label: "🏗️ Overview" },
        { id: "pod", label: "📐 Pod Layout" },
        { id: "water", label: "💧 Water Spine" },
        { id: "nitrogen", label: "🔬 N Cycle" },
        { id: "molecular", label: "⚗️ Molecular" },
        { id: "feed", label: "🪰 Feed Eco" },
        { id: "crops", label: "🌿 Crops" },
        { id: "calendar", label: "📅 Cohorts" },
        { id: "live", label: "📊 Live Sim" },
    ];

    return (
        <div style={{
            background: COLORS.bg, color: COLORS.text, minHeight: "100vh",
            fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        }}>
            {/* Header */}
            <div style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
                padding: "28px 20px 20px", borderBottom: `1px solid ${COLORS.border}`,
            }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <h1 style={{
                        fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: 1,
                        background: "linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>POD-12W AQUAPONIC FARM SIMULATION</h1>
                    <p style={{ color: COLORS.textDim, fontSize: 11, margin: "6px 0 0", lineHeight: 1.5 }}>
                        Modular pod: Shrimp raceways × Fish tanks × Ferris wheels × DWC × Microgreens — Single water spine, full molecular lifecycle
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <div style={{
                position: "sticky", top: 0, zIndex: 50, background: `${COLORS.bg}ee`,
                backdropFilter: "blur(12px)", borderBottom: `1px solid ${COLORS.border}`,
                padding: "8px 20px", overflowX: "auto",
            }}>
                <div style={{ display: "flex", gap: 4, maxWidth: 1100, margin: "0 auto" }}>
                    {sections.map(s => (
                        <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                            background: activeSection === s.id ? `${COLORS.accent}20` : "transparent",
                            border: `1px solid ${activeSection === s.id ? COLORS.accent : "transparent"}`,
                            color: activeSection === s.id ? COLORS.accent : COLORS.textDim,
                            borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600,
                            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
                        }}>{s.label}</button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 60px" }}>

                {activeSection === "overview" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <Section title="🎯 Farm Water Spine Setpoints" sub="The single chemistry that everything rides on">
                            <SpineSetpoints />
                        </Section>
                        <Section title="🏗️ POD-12W Anatomy" sub="40ft × 80ft — every component in one modular pod">
                            <PodLayout />
                        </Section>
                        <Section title="⚡ Species Stack" sub="Warm spine backbone + cold annex">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                                {[
                                    { icon: "🦐", name: "Pacific Whiteleg Shrimp", role: "Warm spine backbone", detail: "3 cohorts/yr, raceway current, auto-feed", color: COLORS.shrimp },
                                    { icon: "🐟", name: "Barramundi (Asian Sea Bass)", role: "Luxury plate-center", detail: "12 tanks, monthly harvest cadence", color: COLORS.fish },
                                    { icon: "🐋", name: "Sturgeon", role: "Caviar + luxury protein", detail: "Slow grow, freshwater RAS-friendly", color: COLORS.salmon },
                                    { icon: "🥶", name: "Steelhead / Salmonid", role: "Cold annex (heat-exchanger lung)", detail: "Same chemistry, colder temp locally", color: COLORS.coolWater },
                                ].map((sp, i) => (
                                    <div key={i} style={{
                                        background: `${sp.color}08`, border: `1px solid ${sp.color}30`,
                                        borderRadius: 10, padding: 14,
                                    }}>
                                        <div style={{ fontSize: 28 }}>{sp.icon}</div>
                                        <div style={{ color: sp.color, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{sp.name}</div>
                                        <div style={{ color: COLORS.text, fontSize: 10, marginTop: 4 }}>{sp.role}</div>
                                        <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 4 }}>{sp.detail}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>
                )}

                {activeSection === "pod" && (
                    <Section title="📐 POD-12W Full Layout" sub="Every subsystem positioned — 40ft × 80ft compacted base">
                        <PodLayout />
                        <div style={{ marginTop: 16 }}>
                            <div style={{ color: COLORS.textDim, fontSize: 11, lineHeight: 1.8 }}>
                                <strong style={{ color: COLORS.text }}>A) Protein Core:</strong> 2 shrimp raceways (oval, bottom drain) + 12 fish tanks (8 barramundi + 4 sturgeon, rolling monthly harvest) + 1 cold annex (steelhead, heat-exchanger isolated)<br />
                                <strong style={{ color: COLORS.text }}>B) Filtration Core:</strong> 1 drum filter (solids) → 1–2 mineralization barrels (P recovery) → 1 biofilter media reactor (NH₃→NO₃⁻)<br />
                                <strong style={{ color: COLORS.text }}>C) Plant Bank:</strong> 12 × FW-48 Ferris wheels (576 net cups) + 1 DWC raft lane (greens) + 1 microgreens rack (mist) + trellis gutter line (heavy fruiting)<br />
                                <strong style={{ color: COLORS.text }}>D) Support:</strong> Nursery bay (plugs/grafts) + packout/grading table (Brix/firmness/size SKU ladder)
                            </div>
                        </div>
                    </Section>
                )}

                {activeSection === "water" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <Section title="💧 Water Spine Flow Path" sub="Single spine: Protein → Filtration → Plants → Return">
                            <WaterSpineFlow />
                        </Section>
                        <Section title="🎯 Spine Chemistry Setpoints" sub="The stable compromise that keeps everything alive">
                            <SpineSetpoints />
                        </Section>
                        <Section title="🔧 Filtration Stages" sub="Non-negotiable: solids before plants, centralized biofiltration">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                {[
                                    { icon: "🥁", name: "Drum Filter", role: "Stage 1: Physical solids removal", detail: "Feed, feces, molt shells — the shrimp death-prevention layer. Continuous operation.", color: COLORS.drum },
                                    { icon: "⚗️", name: "Mineralization Barrel", role: "Stage 2: P recovery from solids", detail: "Heterotrophic bacteria + phosphatases decompose solids. 60–90% of P recovered. Slow-leaked back as fertility concentrate.", color: COLORS.mineral },
                                    { icon: "🧫", name: "Biofilter Media Reactor", role: "Stage 3: Dissolved waste stabilization", detail: "MBBR plastic media, high surface area. Nitrosomonas: NH₃→NO₂⁻. Nitrobacter: NO₂⁻→NO₃⁻. Consumes O₂ + alkalinity.", color: COLORS.biofilter },
                                ].map((f, i) => (
                                    <div key={i} style={{ background: `${f.color}08`, border: `1px solid ${f.color}30`, borderRadius: 10, padding: 14 }}>
                                        <div style={{ fontSize: 28 }}>{f.icon}</div>
                                        <div style={{ color: f.color, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{f.name}</div>
                                        <div style={{ color: COLORS.text, fontSize: 10, marginTop: 6 }}>{f.role}</div>
                                        <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 6, lineHeight: 1.6 }}>{f.detail}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>
                )}

                {activeSection === "nitrogen" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <Section title="🔬 Complete Nitrogen Cycle" sub="Fish excretion → nitrification → plant assimilation → clean water return">
                            <NitrogenCycleVisual />
                        </Section>
                        <Section title="⚖️ pH & Alkalinity Balance" sub="Why pH wants to fall and how carbonate media prevents it">
                            <div style={{ background: `${COLORS.coolWater}06`, border: `1px solid ${COLORS.coolWater}25`, borderRadius: 10, padding: 16 }}>
                                <div style={{ color: COLORS.text, fontSize: 12, lineHeight: 1.8 }}>
                                    Nitrification generates H⁺ and consumes alkalinity at ~7.14 mg CaCO₃ per mg NH₃-N oxidized. Without buffering, pH crashes → nitrification stops → ammonia spikes → fish die. Slow-dissolving carbonate media (crushed limestone / oyster shell) in high-flow zones provides continuous buffering. Ca²⁺ released also feeds shrimp exoskeletons and plant cell walls.
                                </div>
                            </div>
                        </Section>
                    </div>
                )}

                {activeSection === "molecular" && (
                    <Section title="⚗️ Every Molecular Process" sub="From germination to Brix finish — every chemical transformation in the farm">
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {MOLECULAR_PROCESSES.map(p => (
                                <MolecularCard key={p.id} process={p} isExpanded={expandedProcesses.has(p.id)} onToggle={() => toggleProcess(p.id)} />
                            ))}
                        </div>
                    </Section>
                )}

                {activeSection === "feed" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <Section title="🪰 Feed Ecosystem" sub="On-farm feed production: duckweed, BSF larvae, microalgae">
                            <FeedEcosystem />
                        </Section>
                        <Section title="♻️ Waste-to-Feed Loop" sub="Nothing exits — everything becomes input for something else">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                                {[
                                    { from: "Fish feces + uneaten feed", to: "Drum filter solids → mineralization barrel → dissolved P for plants", icon: "💩→💛" },
                                    { from: "Plant trimmings + kitchen waste", to: "BSF larvae bin → 42% protein larvae → fish feed", icon: "🥬→🪰" },
                                    { from: "Spine water (N+P rich)", to: "Duckweed pond → 25–45% protein fronds → fish/shrimp supplement", icon: "💧→🟢" },
                                    { from: "BSF frass (excrement)", to: "Compost/vermicompost → soil amendment for outdoor crops", icon: "🪰→🌱" },
                                    { from: "CO₂ from respiration", to: "Microalgae photosynthesis → O₂ + biomass → larval feed", icon: "💨→🦠" },
                                    { from: "Shrimp molt shells", to: "Chitin source → composted or calcium supplement", icon: "🦐→⚗️" },
                                ].map((w, i) => (
                                    <div key={i} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 20, marginBottom: 4 }}>{w.icon}</div>
                                        <div style={{ color: COLORS.text, fontSize: 10, fontWeight: 600 }}>{w.from}</div>
                                        <div style={{ color: COLORS.accent, fontSize: 9, marginTop: 4 }}>→ {w.to}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>
                )}

                {activeSection === "crops" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <Section title="🌿 Crop Zone Detail" sub="Cool lane greens + warm lane fruiting — every crop mapped to its system">
                            <CropZoneDetail />
                        </Section>
                        <Section title="🍓 Brix Finish Protocol" sub="The quality physics behind gift-crop luxury">
                            <div style={{ background: `${COLORS.warmWater}06`, border: `1px solid ${COLORS.warmWater}25`, borderRadius: 10, padding: 16 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                                    {[
                                        { label: "Light Interception", value: "Maximum PAR capture", icon: "☀️" },
                                        { label: "Source-Sink Balance", value: "Leaf → fruit transport", icon: "🔄" },
                                        { label: "K⁺ Loading", value: "Phloem sucrose driver", icon: "🔋" },
                                        { label: "Ca²⁺ Integrity", value: "Cell wall firmness", icon: "🧱" },
                                        { label: "Deficit Pulse", value: "ABA → sugar concentrate", icon: "💧" },
                                        { label: "°Brix Measurement", value: "Refractometer grading", icon: "📏" },
                                    ].map((b, i) => (
                                        <div key={i} style={{ textAlign: "center", padding: 8 }}>
                                            <div style={{ fontSize: 22 }}>{b.icon}</div>
                                            <div style={{ color: COLORS.warmWater, fontSize: 11, fontWeight: 700, marginTop: 4 }}>{b.label}</div>
                                            <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 2 }}>{b.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Section>
                    </div>
                )}

                {activeSection === "calendar" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <Section title="📅 Cohort & Harvest Calendar" sub="Shrimp 3×/yr, fish monthly, salmonids seasonal">
                            <CohortCalendar />
                        </Section>
                        <Section title="📋 Day Types" sub="The entire year reduced to a few kinds of days">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                                {[
                                    { type: "R", name: "Remote Day", time: "0:20", desc: "Dashboard + alarms + camera sweep", color: COLORS.accent, pct: "86%" },
                                    { type: "B", name: "Biweekly Blitz", time: "18:00", desc: "2 weeks of work compressed into 1 day", color: COLORS.water, pct: "7%" },
                                    { type: "P", name: "Planting Blitz", time: "20:00", desc: "Field crop + greenhouse lane changeovers", color: COLORS.plant, pct: "2%" },
                                    { type: "H", name: "Harvest Blitz", time: "20:00", desc: "Root crop harvest + storage conversion", color: COLORS.warmWater, pct: "3%" },
                                    { type: "A", name: "Aqua Transition", time: "18:00", desc: "Shrimp cohort + branzino tank harvest/stock", color: COLORS.fish, pct: "2%" },
                                ].map((d, i) => (
                                    <div key={i} style={{ background: `${d.color}08`, border: `1px solid ${d.color}30`, borderRadius: 10, padding: 12 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                            <span style={{
                                                width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                                                background: `${d.color}20`, color: d.color, fontSize: 14, fontWeight: 900,
                                            }}>{d.type}</span>
                                            <span style={{ color: d.color, fontSize: 12, fontWeight: 700 }}>{d.name}</span>
                                        </div>
                                        <div style={{ color: COLORS.text, fontSize: 10 }}>{d.time} on-site</div>
                                        <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 4 }}>{d.desc}</div>
                                        <div style={{ color: d.color, fontSize: 10, fontWeight: 700, marginTop: 6 }}>{d.pct} of year</div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>
                )}

                {activeSection === "live" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <Section title="📊 Live Simulation" sub="Real-time water chemistry + growth metrics (simulated tick every 1.5s)">
                            <LiveSimulation />
                        </Section>
                        <Section title="🔬 Nitrogen Cycle Visualization" sub="Animated molecular flow">
                            <NitrogenCycleVisual />
                        </Section>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SECTION WRAPPER ────────────────────────────────────────────────────────
function Section({ title, sub, children }) {
    return (
        <div style={{
            background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 20, overflow: "hidden",
        }}>
            <h2 style={{ color: COLORS.text, fontSize: 16, fontWeight: 800, margin: "0 0 4px", letterSpacing: 0.5 }}>{title}</h2>
            {sub && <p style={{ color: COLORS.textDim, fontSize: 10, margin: "0 0 16px" }}>{sub}</p>}
            {children}
        </div>
    );
}