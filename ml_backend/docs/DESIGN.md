# 🎨 PeloNaRoupa / PeloNaRoupa — Design System Guidelines (DESIGN.md)

> **Goal**: Anti-generic, premium, hardware-accelerated UI/UX system that eliminates "AI slop" and delivers a state-of-the-art visual experience for pet health & breed identification.

---

## 🎨 1. Calibrated Color System (Dark & Light Mode Tokens)

### Dark Theme Palette (Default — Obsidian / Emerald / Amber)
* **Background Primary**: `hsl(222, 47%, 7%)` (`#090d16`)
* **Background Secondary (Card Glass)**: `hsla(217, 33%, 12%, 0.75)` with `backdrop-filter: blur(12px)`
* **Primary Accent (Emerald Vibrant)**: `hsl(158, 64%, 52%)` (`#26d07c`)
* **Secondary Accent (Amber Warmth)**: `hsl(38, 92%, 56%)` (`#f5a623`)
* **Text High Contrast**: `hsl(210, 40%, 98%)`
* **Text Muted**: `hsl(215, 16%, 65%)`
* **Border Glass**: `hsla(217, 33%, 25%, 0.4)`

### Light Theme Palette
* **Background Primary**: `hsl(210, 20%, 98%)`
* **Card Surface**: `hsl(0, 0%, 100%)`
* **Primary Accent**: `hsl(158, 64%, 40%)`
* **Text Primary**: `hsl(222, 47%, 11%)`

---

## 🔤 2. Typography Hierarchy

* **Heading Font**: `Outfit`, `Plus Jakarta Sans`, sans-serif (Weights: 600, 700, 800)
* **Body Font**: `Inter`, system-ui, sans-serif (Weights: 400, 500, 600)
* **Monospace Data Font**: `JetBrains Mono`, monospace (for processing times, probabilities, hashes)

```css
h1 { font-family: 'Outfit', sans-serif; font-weight: 700; letter-spacing: -0.025em; }
body { font-family: 'Inter', sans-serif; line-height: 1.6; }
.code-val { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; }
```

---

## ⚡ 3. Micro-Motion & Perpetual Dynamics

1. **Card Hover Lift**: `transform: translateY(-2px) scale(1.005); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)`
2. **Top-3 Probability Progress Bar**: Smooth fill animation (`transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)`)
3. **Pulsing Audio Visualizer**: Oscillating frequency waves during pet audio recording.
4. **Touch Target Standard**: All interactive buttons, cards, and inputs must have a minimum touch boundary of **$44\text{px} \times 44\text{px}$** on mobile viewports.

---

## 🧩 4. Component Tokens & Standards

* **Badges (Temperament & Health Risks)**: Rounded full pills with subtle glow: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`.
* **Modals & Dialogs**: `shadcn/ui` based overlay with smooth backdrop blur (`backdrop-blur-md`).
