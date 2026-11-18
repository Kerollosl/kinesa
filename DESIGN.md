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
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  hair: "3px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  card: "16px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "34px"
components:
  button-go:
    backgroundColor: "{colors.dye-weld-300}"
    textColor: "{colors.dye-purple-900}"
    rounded: "{rounded.card}"
    height: "54px"
    padding: "0 22px"
  button-soft:
    backgroundColor: "{colors.linen-50}"
    textColor: "{colors.dye-purple-700}"
    rounded: "{rounded.card}"
    height: "54px"
  answer-option:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.lg}"
    height: "60px"
  answer-option-correct:
    backgroundColor: "{colors.dye-green-600}"
    textColor: "#ffffff"
  answer-option-incorrect:
    backgroundColor: "{colors.dye-madder-600}"
    textColor: "#ffffff"
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

**Creative North Star: "The Woven Tunic, played like a casual game."**

Kinesa plays like a category-wheel trivia game and is dressed like a Coptic tunic from Akhmim. The whole app sits on a purple-dyed woven field; every question floods the screen with its category's dye; reading happens on white and linen cards. Buttons are chunky and pressable, the wheel is the centre of play, and the six categories are six dyes.

Energy comes from the loop, not from noise: spin, a big question card, four fat answers, a burst of colour on a right answer, a "Did you know?" note with its source, and the next step always in the same place at the bottom. Coptic forms are drawn from exact geometry: the twelve-point cross (three points on each arm) and the interlace ring. The Gospel companions are flat 2D cartoon characters (see Companions below) used as avatars and in reveal moments.

What this system rejects: liquid glass and backdrop blur, gold leaf and ornate frames, cream-parchment "church app" styling, neon quiz-show darkness, and walls of text.

**Key characteristics:**

- Purple woven field behind everything; the question screen is the category's dye, full-bleed.
- White question card, four white answer slabs, one weld-yellow action per screen.
- Chunky buttons: a solid darker lower edge that sinks on press (4px).
- A seven-panel roundel wheel: six category dyes plus an undyed-linen panel with the purple cross ("your pick").
- Alexandria throughout, heavy (800–900) for game text.

## Colors

- **Tyrian purple** (dye-purple-700/800/900): the app ground (a soft radial gradient with weave texture), the bottom tab bar, number badges and rule icons.
- **Weld yellow** (dye-weld-300, lower edge #b3861a): the one primary action ("Play", "Spin", "Spin again", "Continue"), the wheel pointer and hub cross, the pick meter, the level medal. Text on weld is deep purple. Never text on linen.
- **Category dyes**: Bible woad, Coptic History madder, Saints purple, Church Traditions green, Feasts weld, Signs & Symbols ochre. A dye always means its category: question fields, wheel panels, pick tiles, category tiles, pips and letter squares. Weld takes dark ink; the others take white.
- **Green / madder** for right / wrong answers, each with a 3px white ring so they read on any dye (including green Traditions and madder History).
- **Linen and white** for cards and anything read at length; ink-900 / ink-700 text on them.

**The Dye Means Category Rule** and **The No Gold Rule** (matte weld, no metallic gradients or glows) still hold.

## Typography

Alexandria, self-hosted. Questions 21–28px/800 on the white card; screen titles 26–54px/800–900; answers 17px/700; body 15–16px. Nothing informative below 13px; numbers use tabular figures.

## Layout

- Phones first: one centred column (560px max for play, 640px for pages). Desktop letterboxes the same column with the tabs in the header.
- **Home:** header (brand, level badge, streak, rules, settings), then the wheel, one huge **Play** button, and two tiles: **Friends** and **Today's 5**. An unfinished game appears first as a "Your game" card with everyone's category pips and **Continue**. Today's Coptic date sits at the bottom in small type.
- **Play screens** (board, pick, bot turn, pass-the-phone, results, friends setup) hide the header and tabs. One top row (back, a centre tag, rules), content, and the main action anchored at the bottom.
- **Board:** scoreboard (two players side by side with "vs"; three or four as rows), the wheel, the turn line, the pick meter, **Spin**.
- **Question:** top row (back, player chip with meter or progress and score chips, timer number), a draining timer bar, the category pill, the question card, four answers, then 50/50. After the reveal only the right answer (and a wrong pick) stay, and the reveal sheet rises at the bottom.
- Bottom tab bar on phones: **Home · Categories · Trophies**.
- Verified at 360×640 through 1024×768 with no sideways scroll and 40px+ targets (see `tests/e2e/layout.spec.js`).

## Elevation & Depth

Depth is a solid lower edge, like a pressed tile: `0 5px 0` in a darker shade of the surface (buttons, answers, tiles, cards), plus a soft drop shadow on big buttons. Pressing translates the element down and shrinks the edge. No glass, blur or glow.

## Shapes

Generous rounding: 16–18px for buttons and answers, 22–24px for cards, tiles and the question card, 28px for dialogs and sheets, full pills for chips and tags. Circles for the wheel, avatars, pips, meter and medals.

## Components

- **Buttons:** `btn-go` (weld) is the single primary; `btn-soft` (linen) is secondary; `icon-btn` for 44px icon actions. `btn-mega` is Home's Play.
- **Wheel:** seven panels in classic play (quick rounds use six), linen seams, interlace ring, weld cross at the hub, weld pointer that wobbles while spinning. On landing, the other panels dim and the category name pops in a pill of its dye.
- **Pips:** six small category medallions per player; dyed when won.
- **Pick meter:** three circles that fill weld with a tick, followed by the cross: three right answers (or the cross panel) earn a pick.
- **Answer slabs:** white, lettered A–D in a dye square. Locked (waiting for bots) turns purple. Right floods green; a wrong pick turns madder and shakes.
- **Reveal sheet:** companion, a one- or two-word verdict ("Correct!", "Not quite", "Time's up", "You won it!"), the explanation on the category's pale tint with its source, and the next step.
- **Pick screen:** six dye tiles, won ones faded with a check.
- **Bot turn:** the bot's companion, its answers as a row of category circles with right/wrong marks (picks ringed in weld), one summary line, the scoreboard, **Your turn**.
- **Pass the phone:** full-screen cover with the next player's companion in an interlace ring, their pips and meter, and "I'm {name}".
- **Results:** winner's companion, the headline, a ranked list (pips in classic play, scores in quick rounds), the level bar and up to three unlock chips.
- **Companions:** drawn in code from rounded toy shapes (`src/companions/model.js`): big round heads, dot eyes in white surrounds, short tapered arms with mitten hands, three cel bands lit from the upper left, a thin #2a2230 outline. Limbs start inside the body, so nothing can separate. Screens ask for an act (`idle`, `wave`, `cheer`, `win`, `sad`); `src/companions/motion.js` turns it into a pose for any time t, and `src/companions/canvas.js` draws it on a canvas. Avatars use a head-and-shoulders crop on the companion's pale colour.
- **Dialogs:** bottom sheets on phones, centred cards on desktop: How to play (four short rules), Settings (name, level, game length, sound), a category card, and "Start a new game?".

## Motion

Short and springy: answers rise in with a 45ms stagger, the right answer pops, a wrong one shakes, the sheet slides up, pips and meter cells pop when earned. The wheel spins 2.4s on a long ease-out with optional soft clicks per panel (sound on only). Home's wheel turns once every 90s. Under reduced motion, movement goes (the timer bar hides, spins snap) while colour and state changes stay. Vibration follows the sound toggle.

## Do's and Don'ts

### Do:

- **Do** keep one weld action per screen, in the same place (bottom) on every play screen.
- **Do** keep copy to a few words; put rules in How to play, not on screens.
- **Do** fill question screens with the category's dye, and use dyes only for their categories.
- **Do** draw Coptic forms from exact geometry and describe Coptic practice as Coptic tradition.

### Don't:

- **Don't** use glass, blur, glows, neon, gold leaf or metallic gradients.
- **Don't** fall back to cream parchment and serif "church app" styling.
- **Don't** set weld as text on linen, or text below 13px.
- **Don't** put the companions at the centre of a screen except the pass-the-phone and results moments.
