---
name: AnimalMind
colors:
  background: '#090a0f'
  foreground: '#f8fafc'
  card: '#11131c'
  card-foreground: '#f8fafc'
  primary: '#10b981'
  primary-foreground: '#090a0f'
  secondary: '#1e293b'
  secondary-foreground: '#f8fafc'
  muted: '#1e293b'
  muted-foreground: '#64748b'
  accent: '#1e293b'
  accent-foreground: '#f8fafc'
  destructive: '#ef4444'
  border: '#334155'
  input: '#334155'
  ring: '#10b981'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '850'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
rounded:
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
---

## Brand & Style

The **AnimalMind** visual identity is designed to feel high-tech, premium, and reassuring. Because the app monitors animal emotional states and well-being, the aesthetic combines a cutting-edge dark theme with comforting, soft visual elements. The atmosphere feels clean, highly structured, and alive through the use of glowing accents, smooth transitions, and gentle micro-animations.

The interface prioritizes **clarity and readability** since pet owners or veterinary professionals need to quickly scan graphs, audio waveforms, and classification history. Decorative top lights and gradients (indigo/purple to emerald) create a premium depth that frames the main content.

## Colors

The core palette is anchored by a deep dark background (**Midnight Slate/Navy**) to reduce eye strain during nighttime or low-light monitoring. This is balanced by high-contrast typography and borders.

**Emerald Green** serves as the primary brand color, representing life, health, and positive emotional states (e.g., relax, safety). **Indigo/Purple** gradients highlight key buttons, brand markers, and AI activities, giving a sense of intelligence and sophistication. **Destructive Red** is reserved for distress signals, alerts, or deleting records. 

## Typography

Typography is clean and modern, using **Inter** as the primary font family. Titles use heavy, bold weights (`extrabold` or `font-semibold`) with tight tracking (`tracking-tight`) to establish a clear reading hierarchy.

The body copy uses lighter weights with a generous line-height (`leading-relaxed`) to ensure that medical descriptions, audio classification notes, and user settings are readable.

## Layout & Spacing

AnimalMind is designed to be highly responsive, adapting smoothly from desktop dashboards to mobile recording interfaces. The spacing is built around a standard 8px grid system, ensuring consistent margins and padding.

Content is structured in a centered flex/grid layout with a maximum width of `6xl` (1152px), creating a focused, readable reading pane. Section boundaries use subtle borders (`border-slate-900` or `border-slate-800`) to organize information without adding visual clutter.

## Elevation & Depth

Visual depth is achieved through layering and transparency rather than heavy shadows:
1. **Base Layer:** A rich, dark backdrop (`bg-slate-950` or `bg-background`).
2. **Interactive Cards:** Semi-transparent surfaces (`bg-slate-900/40` or `bg-card`) with a thin 1px border.
3. **Overlays & Modals:** Glassmorphic floating surfaces with backdrop blurs and subtle glows to pop above the background.

## Shapes

Shapes are soft and approachable. Interactive cards use `rounded-2xl` (1.5rem), and buttons or inputs use `rounded-xl` or custom variables (`var(--radius) = 0.75rem`). This rounded geometric language communicates friendliness, softening the high-tech AI vibe.

## Components

### Buttons
Buttons feature rounded corners and a premium feel. The primary actions use a custom **GlowingButton** with an animated backdrop glow or high-contrast outlines (`border-indigo-500/20`).

### Spotlight Cards
Cards use a custom **SpotlightCard** component, which reacts to mouse movement with a subtle hover glow. Backgrounds are kept semi-transparent (`bg-slate-950/40` or `bg-card`) to blend into the dark atmosphere.

### Audio Recording Button
A prominent, pill-shaped or circular action button with a continuous red breathing pulse (`record-pulse`) during audio capture to indicate live recording status.

### Form Inputs
Form inputs use a clean dark background matching the card surface, with custom borders that highlight with the primary emerald ring when focused.
