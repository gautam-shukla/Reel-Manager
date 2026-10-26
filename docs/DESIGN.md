---
name: Reel Manager Vercel Theme
colors:
  background: '#000000'
  surface: '#0A0A0A'
  surface-elevated: '#111111'
  surface-card: '#141414'
  border-default: '#2A2A2A'
  border-subtle: '#1C1C1C'
  text-primary: '#EDEDED'
  text-secondary: '#888888'
  text-muted: '#555555'
  accent: '#FFFFFF'
  accent-hover: '#E0E0E0'
  destructive: '#FF4444'
  destructive-hover: '#FF6666'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 1.1
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 1.3
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 1.6
  label-md:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 1.5
    letterSpacing: 0.04em
rounded:
  sm: 8px
  DEFAULT: 12px
  md: 12px
  lg: 16px
  full: 999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md-sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px
---

# Reel Manager Design System

## Visual Language (Vercel-inspired Monochromatic Luxury)

This design system is inspired by Vercel's clean, minimalist, developer-grade aesthetic. It features a high-contrast dark theme with sharp borders and clean typography.

### Colors
- **Background Base (`#000000`):** Full black backdrop.
- **Surface (`#0A0A0A`):** Collapsible side pane, layout containers.
- **Elevated (`#111111`):** Inputs, active list items, search bar.
- **Card (`#141414`):** Reel cards, Folder cards, Dialogs.
- **Borders:** `#2A2A2A` (default) and `#1C1C1C` (subtle).
- **Accent:** White (`#FFFFFF`) with hover state `#E0E0E0`.
- **Destructive:** `#FF4444` for deletion and warnings.

### Typography
Uses "Geist" as the primary font family, loaded from Vercel's CDN (fallback to "Inter").
- **Display / H1:** 32px, weight 700, letter-spacing -0.03em. Used for primary branding ("Your Reels. Organized.").
- **H2:** 24px, weight 600, letter-spacing -0.02em. Used for page titles.
- **H3 / Card Title:** 18px, weight 600, letter-spacing -0.01em.
- **Body:** 14px, weight 400.
- **Mono:** "Geist Mono" for metadata, labels, and small upper-case texts.

### Component Visual Style
- **Cards:** Border radius 12px, border 1px solid var(--border-default), bg var(--bg-card), subtle box-shadow.
- **Buttons:**
  - Primary CTA: Pill-shaped (999px), bg var(--accent), text var(--bg-base), weight 600.
  - Secondary/Ghost: Rounded 8px, border 1px solid var(--border-default), bg transparent.
  - Destructive: Rounded 8px, border 1px solid var(--destructive), text var(--destructive).
  - Icon Button: 40px x 40px, rounded 8px, bg var(--bg-elevated), hover bg var(--border-default).
- **Dialogs/Modals:** Rounded 16px, bg var(--bg-card), border 1px solid var(--border-default), backdrop blur 8px.
- **Side Pane:** Width 260px, bg var(--bg-surface), border-right 1px solid var(--border-default), collapsible.
- **Inputs:** Rounded 8px, bg var(--bg-elevated), border 1px solid var(--border-default), outline none, focus border var(--accent).
