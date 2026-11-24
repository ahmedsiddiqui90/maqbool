---
name: Maqbool
description: A dealer's sales chat and staff dashboard painted in showroom signwriter's enamel.
colors:
  bottle-green: "#0f3d2e"
  bottle-green-deep: "#0b2e22"
  bottle-green-lit: "#17543f"
  green-wash: "#e3eee8"
  green-mist: "#f0f6f2"
  signal-yellow: "#f6c625"
  yellow-shade: "#c79a0a"
  yellow-cream: "#fff6d6"
  vermilion: "#c62f25"
  vermilion-wash: "#fdecea"
  vermilion-ink: "#7d1d17"
  amber-ink: "#7a4f00"
  warm-ground: "#fbf8f1"
  paper: "#ffffff"
  counter-cream: "#f4f0e5"
  track-sand: "#efe9db"
  ink: "#1a1a17"
  ink-2: "#4c5049"
  ink-3: "#5f645b"
  rule: "#e4dfd2"
  rule-strong: "#cdc6b4"
  on-green: "#e8f1ec"
  on-green-2: "#b9d3c5"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0.02em"
  title:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
  price:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0.01em"
  stamp:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  body:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-chat:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  stamp: "3px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  bubble: "14px"
  pill: "99px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-go:
    backgroundColor: "{colors.bottle-green}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-go-hover:
    backgroundColor: "{colors.bottle-green-lit}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.bottle-green}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.green-mist}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "34px"
  button-quiet-armed:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.paper}"
  button-send:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.bottle-green-deep}"
    rounded: "{rounded.md}"
    size: "46px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  shell-nav-active:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.bottle-green-deep}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  price-board:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.price}"
    rounded: "{rounded.sm}"
    padding: "3px 10px 2px"
  stamp-go:
    backgroundColor: "{colors.green-mist}"
    textColor: "{colors.bottle-green}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    padding: "4px 7px 3px"
  stamp-warn:
    backgroundColor: "{colors.yellow-cream}"
    textColor: "{colors.amber-ink}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    padding: "4px 7px 3px"
  stamp-stop:
    backgroundColor: "{colors.vermilion-wash}"
    textColor: "{colors.vermilion}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    padding: "4px 7px 3px"
  card-listing:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
  bubble-customer:
    backgroundColor: "{colors.bottle-green}"
    textColor: "{colors.paper}"
    rounded: "{rounded.bubble}"
    padding: "10px 14px"
  bubble-bot:
    backgroundColor: "{colors.counter-cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble}"
    padding: "12px 14px"
---

# Design System: Maqbool

## Overview

**Creative North Star: "The Showroom Signboard"**

Maqbool is a working tool dressed in the enamel of a Pakistani dealer's signwriter: a bottle-green shell with a signal-yellow rule along its foot, a warm white ground, condensed capital lettering for anything that names a place, and yellow windscreen price boards hung slightly crooked on every listing. The paint is confined to a few pieces that carry meaning (the brand board, the price boards, the stamped status labels, the vermilion confirm ring). Everything else is a quiet, dense, hairline-ruled working surface.

Two densities share one world. The customer chat is phone-first and conversational: rounded bubbles, roomy padding, suggestion rows. The staff dashboard is desktop-dense: 14px tables with 9px by 12px cells, sticky uppercase column labels, and hairline rules in place of boxes. Both read from the same tokens. Neither borrows the blue-bubble SaaS chat widget or the grey stat-card admin. The brief rejects both outright.

Motion is utilitarian, with one authored moment. State changes are short colour fades (150ms); messages and transcript steps settle in (220-240ms); the staff side panel slides in (280ms, ease-out). The authored moment is the hung sign: when the bot names a listing, its price boards swing into place in the chat, and on the lot the same card is brought into view with a yellow ring that settles while its board swings again. A status stamp that just changed lands like a rubber stamp. Reduced-motion collapses all of it.

**Key Characteristics:**
- Bottle-green shell with a 4px signal-yellow bottom rule; yellow marks the active tab.
- Barlow Condensed uppercase for board lettering; Barlow for everything people read at length.
- Yellow price boards tilted -1.5deg, short local units big (lakh/crore), exact PKR beneath.
- Visit and lead states as stamped labels tilted -1deg, outlined in their own ink.
- Vermilion is kept for the one item that needs action now.
- Flat surfaces on a warm ground, separated by 1px warm rules; shadow only for lift and overlay.

## Colors

Signwriter's enamel on a warm ground: one deep green, one loud yellow, one vermilion warning, and warm neutrals that never go cool grey.

### Primary
- **Bottle Green** (#0f3d2e): the shell, primary buttons, customer chat bubbles, condensed headings, citation chips, icon tint, focus outline on light surfaces. This is the house colour.
- **Bottle Green Deep** (#0b2e22): text on yellow (active nav, send button, skip link) and the wordmark's drop shade.
- **Bottle Green Lit** (#17543f): hover for green surfaces (primary button, shell nav, shell button); typing dots.
- **Green Mist** (#f0f6f2) and **Green Wash** (#e3eee8): hover tint for outline buttons, starters and table rows; the go-stamp fill; the customer's lines in staff transcripts.

### Secondary
- **Signal Yellow** (#f6c625): the shell's bottom rule, the active shell tab, the active staff tab underline, price boards, the send button, text selection, and focus outline inside the green shell.
- **Yellow Shade** (#c79a0a): the 1px painted lip under price boards and the send button.
- **Yellow Cream** (#fff6d6): the warn-stamp fill and the selected table row.
- **Amber Ink** (#7a4f00): warn-stamp text, for AA contrast on cream.

### Tertiary
- **Vermilion** (#c62f25): the confirm-card ring, the armed state of destructive buttons, stop stamps, the "to confirm" count, the unread-action dot, field errors.
- **Vermilion Wash** (#fdecea) and **Vermilion Ink** (#7d1d17): error notes and failed chat messages (wash ground, ink text).

### Neutral
- **Warm Ground** (#fbf8f1): the page ground and starter-row fill.
- **Paper** (#ffffff): working surfaces: chat column, cards, tables, panel, inputs.
- **Counter Cream** (#f4f0e5): bot chat bubbles.
- **Track Sand** (#efe9db): the segmented-control track and the disabled send button.
- **Ink** (#1a1a17), **Ink 2** (#4c5049), **Ink 3** (#5f645b): primary, secondary and tertiary text. Ink 3 is the floor for any readable text, placeholders included.
- **Rule** (#e4dfd2) and **Rule Strong** (#cdc6b4): hairlines and dividers; Rule Strong for input borders, table-head underline and quiet-button outlines.
- **On Green** (#e8f1ec) and **On Green 2** (#b9d3c5): primary and secondary text inside the shell.

### Named Rules
**The One Red Thing Rule.** Vermilion marks only what needs a human decision now: the open booking confirm, an armed delete, a visit awaiting staff, an error. It never decorates. If two vermilion things share a screen, both must be live actions.

**The Yellow Is Paint Rule.** Signal yellow is for signboard pieces (price boards, the shell rule, the active tab, the send button). It is never a text colour on the light ground and never a large background field.

## Typography

**Display Font:** Barlow Condensed 600/700/800 (with Barlow, system-ui)
**Body Font:** Barlow 400/500/600 (with system-ui, -apple-system, Segoe UI)

**Character:** Barlow Condensed in heavy uppercase is the signwriter's brush lettering: tall, tight and readable at a distance. Barlow is the same family in its working width, so the shift from board to body sounds like one voice changing register.

### Hierarchy
- **Display** (800, 40px, 1, 0.02em, uppercase, Bottle Green): page-level board titles ("On the lot", "Staff dashboard"). Drops to 32px under 900px.
- **Headline** (800, 30 to 34px, 1 to 1.05, 0.02 to 0.03em, uppercase, Bottle Green): panel customer name, chat welcome, gate title, tally numbers (34px, tabular).
- **Title** (700, 18px, 1, 0.04 to 0.05em, uppercase): staff tabs and side-panel section heads.
- **Price** (800, 24px, 1.05): price board figures; 19px small, 30px large.
- **Stamp** (700, 12px, 0.08em, uppercase): stamped state labels and the action count.
- **Body** (400, 16px, 1.5): default text and the composer. Chat messages run at 15px/1.5; tables and secondary copy at 14px. The welcome paragraph caps at 46ch.
- **Label** (600, 12px, 0.04em, uppercase, Ink 2): table column heads. Fact and tally labels use the same 12 to 13px weight in sentence case, Ink 3.

### Named Rules
**The Board Lettering Rule.** Condensed uppercase is for names of places and things on the board (page titles, panel heads, tabs, prices, stamps). Sentences, buttons and table data stay in Barlow at sentence case.

**The Honest Number Rule.** Every figure people compare (prices, counts, tallies, IDs, exact PKR) uses tabular numerals.

## Layout

An app frame, not a page: a 64px green shell row over a full-height work area (`100dvh` grid), with each pane scrolling on its own.

- **Customer:** two columns, a 360 to 540px chat column on Paper, then a fluid listing area on Warm Ground with an auto-fill 240px-minimum card grid. Under 900px it becomes one column with a Chat / Listings pane switch at the top. The active pane gets Green Mist and a 3px yellow inset underline.
- **Staff:** a scrolling main column (tally, tabs, table) and, when a lead is open, a 380 to 460px side panel. Under 1180px the panel becomes a fixed overlay sheet (max 460px). Under 1440px with the panel open, optional columns hide.
- **Spacing rhythm:** a 4px-based scale (4, 8, 12, 16, 24, 32, 48). Pane padding is 24px vertical and 32px horizontal on desktop, 16px under 900px. Bottom padding is 48px so content clears the fold. Card internals use 16px, list rows 10px by 12px, table cells 9px by 12px (8px by 10px in the panel).
- **Shell under 900px:** 56px high. The tagline drops, the wordmark shrinks to 24px, nav labels shorten.

## Elevation & Depth

Mostly flat. Depth comes from tonal layering (Warm Ground under Paper, Counter Cream bubbles) and 1px warm rules. Shadows are few and soft, with a green-black tint rather than neutral grey. They mark lift (hovered card, pressed segment, confirm card), overlay (the panel as a sheet), or the painted lip of a signboard piece.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 1px 2px rgba(26,26,23,.06), 0 2px 6px rgba(26,26,23,.05)`): hovered listing card, selected segmented option, booking confirm card, gate card.
- **Overlay** (`box-shadow: 0 8px 28px rgba(11,46,34,.18), 0 2px 6px rgba(11,46,34,.08)`): the staff panel when it floats as a sheet under 1180px.
- **Board lip** (`box-shadow: 0 1px 0 #c79a0a, 0 3px 6px rgba(122,79,0,.18)`): price boards. The send button carries the lip alone (`0 1px 0 #c79a0a`).

### Named Rules
**The Flat Desk Rule.** Cards, tables and lists rest flat with a 1px rule. Shadow appears on hover, on a selected segment, or on something that really floats or is painted on. It never appears on a surface at rest just to separate it.

**The Wordmark Shade Exception.** The brand wordmark alone carries a signwriter's stepped drop shade (`2px 2px 0` Bottle Green Deep, `3px 3px 0` #082318). It is the enamel lettering's own device, not a shadow style, and it does not extend to headings, buttons or cards.

## Shapes

Gently rounded, never pill-soft except in tiny chips. Controls and inner containers use 8px. Outer cards, tables and the confirm card use 12px. Signboard pieces are tighter: price boards 4px, stamps 3px, so they read as cut tin, not UI chips. Chat bubbles are 14px with one 3px corner pointing at the speaker. Pills (99px) are reserved for counts and the tool trail. The signboard pieces sit slightly askew (price boards -1.5deg, stamps -1deg); nothing else rotates. Borders run 1px for rules and 1.5px for controls and stamps. The confirm card's 2px vermilion ring is the heaviest stroke in the system.

## Components

### Buttons
Painted and firm: 600 weight, 15px, 40px tall, 8px corners, 1.5px border slot on every variant so the variants line up.
- **Go (primary):** Bottle Green fill, white text; hover Bottle Green Lit. One per decision ("Yes, book it", "Confirm", "Sign in").
- **Outline:** Paper fill, 1.5px Bottle Green border and text; hover Green Mist. The default action on cards and filters.
- **Quiet:** transparent, Rule Strong border, Ink 2 text; hover Paper fill, Ink 3 border. Used for retries and deletes.
- **Armed (ConfirmButton):** a destructive Quiet button asks once in place. The first click turns it solid Vermilion with a confirm label. A second click within 5s runs it; Escape or blur disarms. No modal.
- **Link:** Bottle Green underlined text (3px offset), thicker underline on hover. Used for secondary card actions ("Book a test drive").
- **Shell:** transparent with an On Green 2 border, 36px, inside the green bar.
- **Small:** 34px, 12px horizontal padding, 14px text.
- **Focus:** a 3px Bottle Green outline at 2px offset; Signal Yellow inside the shell.

### Send Button
A 46px square of Signal Yellow with a Bottle Green Deep arrow and the yellow-shade lip. Hover brightens it to #ffd23d; press nudges it down 1px. Disabled drops to Track Sand, Ink 3 icon, no lip.

### Price Board (signature)
The windscreen price card. Short local figure (lakh/crore) in a Signal Yellow board, Barlow Condensed 800, tilted -1.5deg from the upper left, with the board lip. The exact PKR figure sits beneath in 12px tabular Ink 3. Sizes 19 / 24 / 30px. Whenever the bot names listings in chat, their boards swing in from -9deg (700ms, ease-out, 60ms stagger). Every price on every surface uses this component.

### Stamp (signature)
A stamped state label: Barlow Condensed 700, 12px, 0.08em uppercase, 1.5px border in currentColor, 3px corners, -1deg tilt. Tones: neutral (Ink 2), go (Bottle Green on Green Mist), warn (Amber Ink on Yellow Cream), stop (Vermilion on Vermilion Wash), muted (Ink 3, struck through). Used for lead status, visit status, and the "Awaiting your yes" header on the confirm card.

### Booking Confirm Card
The bot's yes/no turn: Paper, 2px Vermilion ring, 12px corners, Lift shadow, a stop stamp, the question in 600 weight, the mentioned listing, then Go "yes" and Outline "no" side by side.

### Chat Messages
- **Customer:** Bottle Green, white text, 14px corners with a 3px tail at bottom-right, right-aligned, max 88% wide (92% on phone).
- **Bot:** Counter Cream, Ink, 3px tail at bottom-left. Lists, bold and numbered citation chips (18px, Bottle Green, white 11px numerals, 4px corners).
- **Tool trail:** under bot replies, small Green Mist pills with a green-tinted border, a lucide icon and a 12px label ("Searched listings"). This is how the system shows what the bot did.
- **Typing:** three 7px Bottle Green Lit dots bobbing 3px, with a label.

### Live Transcript
While a turn runs, a dashed-outline Paper bubble lists what Maqbool is doing, from real `/chat/stream` events: "Thinking", then each tool with a plain-language detail ("Searching listings · cars under 60 lakh in Lahore"). Active steps carry a spinning ring; finished steps turn into a filled Bottle Green check disc and drop to Ink 2. Without streaming it shows only "Thinking" plus the slow-server note, never a tool it hasn't seen. After the reply lands, the same tools stay under the message as the tool trail, with their detail line.

### Listing Plate and Preview
Listing cards open with an illustrated plate (2:1, flush to the card's top edge) of the body type in the listing's colour on a Green Mist or cream ground. In chat, a named listing appears as a preview row: a 76px plate thumbnail, title, id and city, a small price board, and a quiet "Show" button that brings the card into view on the lot. Cards named in the latest reply carry an "In your chat" go-stamp and a 1px Bottle Green ring.

### Person Button
A pill with a 24px Bottle Green disc holding the initial in Signal Yellow condensed lettering, the customer id in 600 weight, and a chevron that nudges right on hover. Hover fills Green Mist with a Bottle Green border; the open customer gets a 1px Bottle Green ring.

### Cards / Containers
- **Corner Style:** 12px on listing cards, tables, confirm and gate cards; 8px on mentions, facts grids, memory and thread lists.
- **Background:** Paper on Warm Ground.
- **Shadow Strategy:** flat at rest; Lift on hover for listing cards (see Elevation & Depth).
- **Border:** 1px Rule; hover strengthens to Rule Strong. Empty tables use a 1px dashed Rule Strong border.
- **Internal Padding:** 16px on listing cards, 10px by 12px on list rows and fact cells, 32px on the gate card.

### Inputs / Fields
- **Style:** Paper, 1.5px Rule Strong border, 8px corners, 40px tall, 12px horizontal padding. Selects use a custom 12px green chevron. The composer textarea grows from 46px to 160px.
- **Hover:** border darkens to Ink 3.
- **Focus:** the global 3px Bottle Green outline at 2px offset.
- **Error:** 14px Vermilion text below the field.

### Segmented Control
A Track Sand track with 3px padding and 2px gaps, holding 34px options in 600 weight, 14px. The selected option becomes a Paper chip with Bottle Green Deep text and the Lift shadow. Counts sit inside as pills.

### Navigation
- **Shell nav:** On Green, 600 weight, 15px, 8px corners; hover Bottle Green Lit; active is a solid Signal Yellow chip with Bottle Green Deep text.
- **Staff tabs:** Barlow Condensed 700 18px uppercase in Ink 3 over a 2px Rule baseline. The active tab turns Bottle Green with a 3px Signal Yellow underline.
- **Mobile:** the shell stays one row with short labels. The customer area adds the Chat / Listings pane switch.

### Data Table
Paper inside a 1px Rule, 12px-cornered wrap. 14px text, 9px by 12px cells, 1px Rule row dividers, no zebra striping. The sticky head sits on #f7f3ea with 12px 600 uppercase Ink 2 labels and a Rule Strong underline. Row hover is Green Mist; the selected row is Yellow Cream. The customer cell is a person button (a green initial disc, the name, a chevron), never an underlined text link. A 8px vermilion dot flags rows that need action. Numeric columns are right-aligned and tabular.

## Do's and Don'ts

### Do:
- **Do** render every price with the Price Board: short local units on yellow, exact PKR (tabular) beneath.
- **Do** show record states as Stamps in one of the five tones; pick the tone by meaning, not decoration.
- **Do** reserve Vermilion (#c62f25) for the single item that needs a human decision now, and pair it with a text label.
- **Do** set page titles, panel heads and tabs in Barlow Condensed uppercase, Bottle Green, and keep sentences and buttons in Barlow.
- **Do** keep admin surfaces dense and hairline-ruled: 14px text, 9px by 12px cells, 1px Rule dividers.
- **Do** confirm destructive actions in place with the armed ConfirmButton rather than a modal.
- **Do** use lucide-react line icons at 16 to 18px, tinted Bottle Green or Ink 3.
- **Do** keep readable text at Ink 3 (#5f645b) or darker on Warm Ground and Paper.

### Don't:
- **Don't** use blue chat bubbles, cool grey neutrals or grey stat cards; the world is green, yellow and warm white.
- **Don't** use Signal Yellow as text on the light ground or as a large background field.
- **Don't** tilt anything except price boards (-1.5deg) and stamps (-1deg).
- **Don't** put shadows on cards or tables at rest, and don't use hard offset shadows on any element except the brand wordmark's drop shade.
- **Don't** fabricate listing photos. Cards carry an illustrated plate of the body type (sedan, hatchback, SUV, house, apartment, plot) painted in the listing's colour; it is a drawing, never presented as the actual car or property.
- **Don't** add a second authored animation; the price-board swing (and the lot spotlight that repeats it) is the one moment. Everything else is feedback.
- **Don't** use underlined text links as controls inside the app; actions are buttons.
