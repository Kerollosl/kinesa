---
name: Kinesa
description: A Coptic and Bible trivia game woven from Akhmim tapestry.
colors:
  dye-purple-900: "#24132c"
  dye-purple-800: "#2f1939"
  dye-purple-700: "#3d1f4a"
  dye-purple-600: "#4f2a60"
  dye-purple-500: "#643878"
  dye-purple-200: "#ddd0e3"
  dye-madder-700: "#86231f"
  dye-madder-600: "#a3302b"
  dye-madder-200: "#f2d6d0"
  dye-weld-500: "#d9a21f"
  dye-weld-300: "#ecc965"
  dye-weld-200: "#f3d77f"
  dye-weld-100: "#f8ecc9"
  weld-ink: "#6b4a06"
  mastery-bronze: "#ecd0b5"
  mastery-silver: "#dde1e6"
  companion-lion: "#ffe1a3"
  companion-ox: "#f3cdb8"
  companion-eagle: "#e9d8c2"
  companion-human: "#ddd1f2"
  dye-green-600: "#2c6a4d"
  dye-green-100: "#dcebe2"
  category-woad: "#27467f"
  category-madder: "#a3302b"
  category-purple: "#5e3473"
  category-green: "#2c6a4d"
  category-weld: "#d9a21f"
  category-ochre: "#b85c25"
  linen-50: "#fbf9f4"
  linen-100: "#e4ddcf"
  linen-200: "#d3c8b4"
  linen-300: "#cdbfa6"
  thread: "#ece2cc"
  ink-900: "#22162a"
  ink-700: "#4b3e52"
  ink-600: "#5f5266"
typography:
  display:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "clamp(36px, 5vw, 56px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "clamp(24px, 3vw, 32px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline-sm:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.25
  body-lg:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
  caption:
    fontFamily: "Alexandria, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  hair: "3px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "34px"
components:
  button-primary:
    backgroundColor: "{colors.dye-madder-600}"
    textColor: "{colors.linen-50}"
    rounded: "{rounded.md}"
    height: "52px"
    padding: "0 22px"
  button-primary-hover:
    backgroundColor: "{colors.dye-madder-700}"
  button-primary-on-purple:
    backgroundColor: "{colors.linen-50}"
    textColor: "{colors.dye-purple-700}"
    rounded: "{rounded.md}"
    height: "52px"
  button-daily:
    backgroundColor: "{colors.dye-weld-300}"
    textColor: "{colors.dye-purple-900}"
    rounded: "{rounded.md}"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.linen-50}"
    textColor: "{colors.dye-purple-700}"
    rounded: "{rounded.md}"
    height: "52px"
  answer-option:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.md}"
    height: "60px"
  answer-option-correct:
    backgroundColor: "{colors.dye-green-600}"
    textColor: "#ffffff"
  answer-option-incorrect:
    backgroundColor: "{colors.dye-madder-200}"
    textColor: "{colors.ink-900}"
  reading-pane:
    backgroundColor: "{colors.linen-50}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.lg}"
  woven-field:
    backgroundColor: "{colors.dye-purple-700}"
    textColor: "{colors.linen-50}"
    rounded: "{rounded.lg}"
  chip-score:
    backgroundColor: "{colors.linen-50}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.md}"
  chip-score-you:
    backgroundColor: "{colors.dye-purple-700}"
    textColor: "{colors.linen-50}"
---

# Design System: Kinesa

## Overview

**Creative North Star: "The Woven Tunic"**

Kinesa is dressed like a Coptic tunic from Akhmim. Purple-dyed wool carries the structure of every screen: the header band, the progress clavus, the handoff cover, the results hero and the daily card. Fine linen "flying thread" runs across that purple as interlace, lozenges and seams: an interlace ring frames the results emblem and the companion on the pass-the-phone cover, and interlace bands cross the results hero and that cover. Where people read, the cloth turns to undyed linen. The six categories are six dyes, so a question's category sets the color of its band, its letter tabs, its "Did you know?" pane and its timer ring.

The world is warm and energetic without being churchy. Daylight linen grounds keep it from going somber, and saturated dyes (madder red, woad blue, weld yellow, green, ochre, purple) keep the game loud enough for teens. Coptic forms are drawn from exact geometry: the twelve-point cross (three points on each arm) and the interlace ring of the roundel wheel. They are never clip-art. The painted Gospel companions stay as avatars and reveal moments, not as the centerpiece.

What this system rejects: liquid glass and backdrop blur, gold leaf and ornate frames, cream-parchment "church app" styling, and neon quiz-show darkness.

**Key Characteristics:**

- Purple woven fields for structure; linen panes for reading.
- Six dye colors, one per category, used as whole fields rather than thin accents.
- A twelve-point Coptic cross and an interlace roundel as the only ornaments.
- Alexandria throughout, bold and slightly tight.
- Press feedback (scale 0.97) on everything tappable; hover never moves a hit area.

## Colors

A committed palette: purple carries structure and the six category dyes carry meaning. Undyed linen and a purple-black ink handle everything that has to be read.

### Primary

- **Tyrian Purple Weave** (dye-purple-700): the woven field. Header band, mobile bottom bar, clavus progress band, the score chip of the player whose turn it is (or "you" in practice play), the pass-the-phone cover, the results hero, the daily card and the level medal. Deeper steps (800, 900) for wells inside the field; 600 and 500 for links, focus and selected states on linen.

### Secondary

- **Madder Red** (dye-madder-600): the single primary action on linen, such as Play now, Rematch, Next question and Quiz me. Darker madder (700) on hover. Pale madder (200) marks a wrong pick.
- **Weld Yellow** (dye-weld-300): the accent that sits on purple: the cross emblem, the filled progress cells, the streak flame, the level number and the daily button (weld-200 on hover). Never used as text on linen. On pale weld, text uses **Weld Ink** (weld-ink).

### Tertiary

- **Category dyes** (category-woad, category-madder, category-purple, category-green, category-weld, category-ochre): Bible, Coptic History, Saints & Heroes, Church Traditions, Feasts & Fasts, Signs & Symbols, in that order. Each has a pale tint for panes and letter tabs. Weld is the only dye that takes dark ink; the others take white.
- **Dye Green** (dye-green-600): correct answers, the clock switch when on, XP gained and locked-in ticks.
- **Mastery tints** (mastery-bronze, mastery-silver, with dye-weld-300 for Gold): the mastery tags on badges and the third-place podium block.

### Neutral

- **Undyed Linen** (linen-50 panes; linen-100 is the greige, undyed-flax page ground with a faint weave, deliberately not cream; linen-200 hairlines; linen-300 input and button strokes).
- **Flying Thread** (thread): linen-colored text and line work on purple.
- **Purple-Black Ink** (ink-900 headings and body, ink-700 secondary text at AA on linen, ink-600 tertiary).

### Named Rules

**The Woven Field Rule.** Purple appears as whole fields carrying weave texture (weft ribs over warp threads), never as a thin border or accent line on linen.

**The Dye Means Category Rule.** A category color always means that category. Don't reuse a dye for decoration or for unrelated states (green, which doubles as "correct", is the one shared exception).

**The No Gold Rule.** Weld yellow is a matte dye. Never use metallic gradients, gold foil or glowing edges.

## Typography

**Display Font:** Alexandria (self-hosted variable woff2, Latin subset plus the Arabic letters of كنيسة), with system-ui as the fallback.
**Body Font:** Alexandria.

**Character:** a geometric Egyptian sans named for St. Mark's see. It is set heavy (700) and slightly tight for headings, and regular for reading.

### Hierarchy

- **Display** (700, clamp 36–56px, 1.02): the Home hero and full-screen moments (the handoff name).
- **Headline** (700, clamp 24–32px, 1.25): question text, which is always the largest thing on the question screen.
- **Title** (700, 22px): section headings, feedback headings and the Today card.
- **Body** (400, 15–17px, 1.5–1.6, max 65ch): explanations, leads and "Did you know?".
- **Headline small** (700, 26px): the wordmark and big numbers (day streak).
- **Title small** (700, 18px): strip and card titles (Play with friends).
- **Body large / small** (16px / 14px): leads and short helper lines; meta and links.
- **Label / Caption** (700 13px / 600 12px): chips, tabs, tags, nav labels. Nothing informative is smaller than 12px.

### Named Rules

**The Question Leads Rule.** On the question screen, the question outranks every other element in size and weight.

**The Twelve Pixel Rule.** No informative or interactive text below 12px, including BOT tags and stat labels.

## Layout

The layout is a single centered column (max 1120px on Home; question panes up to 760px). Home stacks the hero (copy plus roundel, side by side on desktop and roundel-first on phones; Play now, Customize and the friends strip sit together in it), the Today card, a friends strip, a category grid (6 columns, then 3, then 2 at 380px) and the companions panel. Spacing steps are 8, 12, 16, 22 and 34px, with more space above a section heading than below it. Below 760px the main tabs move into a fixed bottom bar with safe-area padding, and content gets matching bottom padding. In matches and setup the bottom bar is hidden. Layouts are verified at 360px with no horizontal scroll.

## Elevation & Depth

Depth comes mostly from material contrast: purple fields against linen, and linen panes on a linen ground. A single soft edge shadow (a hairline plus a long, low blur) lifts reading panes and chips off the ground; buttons and podium blocks take a slightly deeper version of it. There are no inset button lips, glass, blur or glow.

### Shadow Vocabulary

- **Edge** (`0 1px 0 rgba(34,22,42,.05), 0 10px 24px -14px rgba(34,22,42,.35)`): panes, chips, the friends strip and category tiles.
- **Tab edge** (`0 1px 0 rgba(34,22,42,.06), 0 8px 18px -12px rgba(34,22,42,.45)`): primary buttons and podium blocks.

## Shapes

Shapes are soft rectangles like folded cloth: 3px for progress cells and bars, 6px for small tags, 8px for letter tabs and nav tabs, 12px for buttons, answers, chips and inputs, and 18px for panes and the woven fields. Circles are reserved for the roundel wheel, the level medal, the cross emblem and companion portraits. Borders are 1–1.5px linen strokes; a selected state swaps to purple. The clavus band (linen lozenges on a dyed strip) is the recurring edge motif: under the header and across the top of each question pane in the category's dye.

## Components

### Buttons

- **Shape:** gently rounded tabs (12px), at least 52px tall.
- **Primary:** flat madder fill with linen text and the soft tab edge. One primary per view.
- **On purple fields:** linen fill with purple text (handoff cover); weld fill with deep purple text (the daily card).
- **Secondary:** linen fill, purple text, 1.5px linen-300 stroke that turns purple on hover.
- **Press:** scale 0.97 at 140ms with a strong ease-out. Hover changes color only.

### Answer options

Answers are white tabs with a pale category letter square. A picked answer (while waiting for the others) turns pale purple with a purple stroke. On reveal, the correct answer floods dye green with white text and a small burst; a wrong pick turns pale madder with a short shake. The rest dim to 60%. In practice play, initials of everyone who chose an option sit on it.

### Score chips

Chips are linen tabs with a portrait, name and score. The current player's chip (or yours, in practice play) becomes a purple woven field. Bots carry a small corner tab. Live states: thinking dots, a green locked-in tick, then a "+points" or "Missed" bubble on reveal. The streak count shows with a flame.

### Inputs and controls

Inputs are white with a 1.5px linen-300 stroke, 12px radius and 48px height. The Customize sheet uses radio tiles (category chips fill with their dye; difficulty and question-count tiles fill purple) and a green switch for the clock.

### Navigation

Desktop tabs sit inside the header band; the active tab is a linen tab with purple text. On phones, a fixed purple bottom bar shows icon and label tabs (54px tall).

### Roundel wheel (signature)

Six dye panels inside a purple ground, separated by linen seams, ringed by a two-thread interlace band, with the twelve-point Coptic cross in weld yellow at the hub. On Home it turns slowly (90s a revolution; still under reduced motion) while the icons and cross stay upright.

### Category icons

Lucide line icons for five categories; Church Traditions uses the twelve-point Coptic cross itself, never a generic plus.

### Ledger strip

Collection figures (games, correct answers, badges, day streak) read inline with their labels in one linen strip divided by 1px hairlines (four across; two by two on phones), not as separate icon cards or big-number tiles. The level and XP bar follow on their own labelled row.

### Clavus progress

Match progress is a purple band holding one linen cell per question (per round in pass-and-play); answered cells fill weld yellow.

## Do's and Don'ts

### Do:

- **Do** put structure on purple woven fields and reading text on linen panes.
- **Do** color a question's band, letter tabs, "Did you know?" pane and timer with its category dye.
- **Do** draw Coptic forms from exact geometry, and describe Coptic practice as Coptic tradition.
- **Do** keep one madder primary action per view, with press feedback at scale 0.97.
- **Do** keep secondary text at ink-700 or darker on linen, and nothing below 12px.

### Don't:

- **Don't** use glass, backdrop blur, glows or neon.
- **Don't** use gold leaf, metallic gradients or ornate icon-style frames.
- **Don't** fall back to cream parchment and serif "church app" styling.
- **Don't** set weld yellow as text on linen, or use a category dye for anything but its category.
- **Don't** lift or translate a button on hover; it must not move out from under the pointer.
- **Don't** put the companions at the center of a screen; they are avatars and moments.
