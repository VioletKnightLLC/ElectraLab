<p align="center">
  <img src="./public/electralab-logo.svg" alt="ElectraLab logo" width="520" />
</p>

<h1 align="center">Physics you can make sense of.</h1>

<p align="center">
  <strong>ElectraLab</strong> is an offline-first physics learning workspace for NCERT Class 12 — Unit 3 (Current Electricity) and Unit 14 (Semiconductor Electronics) — built for reading, reasoning, calculating, and practicing.
</p>

<p align="center">
  <code>LOCAL-FIRST</code>&nbsp;&nbsp;
  <code>OLLAMA-POWERED</code>&nbsp;&nbsp;
  <code>BUILT WITH REACT + VITE</code>
</p>

---

ElectraLab brings the parts of learning physics together in one place: textbook-style explanations, worked examples, deterministic tools, practice, a flexible calculator, and an optional private tutor that runs through Ollama on your own machine.

The interface carries an Nvidia-inspired neon-green-on-black theme — dark surfaces with a `#76B900` accent and matching glow states.

## At a glance

| Learn | Work | Review |
| --- | --- | --- |
| Read the Coursebook and explore physics vocabulary. | Use the physics solver, three calculator layouts, and a persistent Scratch Pad. | Practice, take quizzes, and review locally stored progress. |
| Move from intuition to notation with worked examples and recall checks. | Ask the local Ollama tutor for a hint or another explanation. | Inspect local AI inference metrics in the AI Performance workspace. |

## Explore the workspace

### Learn the ideas

- **Coursebook** — a reading-first path through NCERT Unit 3 (Ohm's Law, resistivity, drift velocity, Kirchhoff's laws, meter construction) and Unit 14 (energy bands, semiconductor types, the p-n junction, diode characteristics, BJT and FET operation), with objectives, worked examples, recall checks, and saved reading progress.
- **Vocabulary** — review built-in physics cards (depletion region, Hall effect, forward bias, carrier concentration, and more), or submit an unfamiliar term for an on-demand glossary lookup from your selected local Ollama model.
- **Practice and quizzes** — work through generated questions on Ohm's law, power, series/parallel networks, drift velocity, carrier concentration, the diode equation, transistor gains, and FET biasing, with immediate feedback.

### Calculate and reason

- **The Solver** — a deterministic local physics engine with worked steps for:
  - Ohm's Law (`V = IR`)
  - Power (`P = VI`, `I²R`, `V²/R`)
  - Series/parallel equivalent resistance
  - Drift velocity (`I = nAev_d`)
  - Carrier concentration (`np = n_i²`)
  - Shockley diode equation
  - BJT gains (`I_C = βI_B`, `α ↔ β`)
  - JFET/MOSFET transfer characteristics
- **The Lab** — applied scenario problems for Circuit Analysis, Semiconductor Devices, and Electronic Design.
- **Calculator** — switch between three purpose-built layouts:
  - **Basic** for arithmetic and order of operations.
  - **Scientific** for trigonometric functions, logarithms, roots, powers, factorials, and degree/radian angle modes.
  - **Graphing** to plot a function of `x` over an adjustable horizontal range.
- **Formula builder** — insert symbols and editable formula templates into the Physics Tutor prompt, including fractions, powers, roots, repeating decimals, and number-set notation.

### Keep your work close

- **Scratch Pad** — draw with a mouse, stylus, or touch; adjust pen width; type numbers and notation; and drag placed number or note boxes around the canvas.
- **Thoughts & Steps** — keep written work beside the canvas, insert notation at the text cursor, or place a copy of the notes onto the canvas.
- **Utilities** — open the Scratch Pad or Calculator from the top bar without leaving your current learning page.
- **Progress** — see practice history, accuracy, streaks, and course reading progress stored in this browser.

### Learn with local AI

- **Physics Tutor** — ask for a hint, a clearer explanation, or another way to understand a step, tuned to NCERT Units 3 and 14.
- **AI Performance** — explore a local Ollama model and inspect runtime and inference metrics, including token counts and generation speed.
- **Math rendering** — equations are rendered with locally bundled KaTeX assets, so mathematical notation does not depend on a hosted rendering service.

AI can make mistakes. Check its arithmetic, assumptions, units, signs, and reasoning against your own work.

## A local-first design

ElectraLab is designed to keep everyday learning on your device:

- Lessons, generated exercises, the deterministic solver, calculator, and graphing tools run locally in the browser.
- Scratch Pad drawings and notes are stored in browser `localStorage`; they are **not** sent to Ollama.
- Learning history, course progress, calculator state, and inference metrics are stored locally in this browser.
- Vocabulary lookups run only when submitted; the requested term goes to local Ollama, while the generated explanation stays in the current page session and is not added to the saved cards or review progress.
- Tutor conversations are not saved to learning history. When you use the tutor, the in-session conversation and any explicitly attached typed context are sent to the Ollama service on this device.
- The Express API accepts Ollama connections only from loopback addresses. It does not provide a hosted AI fallback.
- The production service worker caches the app shell and same-origin assets for offline use after the app has been loaded.

Ollama is optional. Without it, the reading, calculator, Scratch Pad, deterministic solver, and practice features remain available; local AI features show their connection/setup state.

## Brand system

The interface uses **Atkinson Hyperlegible Next** for accessible reading, locally bundled KaTeX fonts for physics notation, and an Nvidia-inspired neon-green accent over black surfaces.

| Color | Hex | Role |
| --- | --- | --- |
| Black | `#0A0A0A` | App background |
| Charcoal | `#121412` | Main surfaces |
| Nvidia green | `#76B900` | Brand mark, primary action, focus, and glow |
| Light green | `#8AE600` | Hover and highlight accent |
| Soft white | `#F0F0F2` | Primary text |
| Cool gray | `#C0C1C7` | Supporting text |

## Get started

### Requirements

- Node.js **20.19+** or **22.12+**
- npm
- Optional: [Ollama](https://ollama.com/) and a locally installed chat model for Tutor and AI Performance features

### Install and run

```bash
git clone https://github.com/VioletKnightLLC/ElectraLab.git
cd ElectraLab
npm install
npm run dev
```

`npm run dev` starts the Vite app and the local Express API together. The app opens in your browser; Vite serves the UI on port `5173` and proxies `/api` requests to the local API on port `3001`.

To enable local tutoring, start Ollama and install a chat model. For example:

```bash
ollama pull qwen2.5:3b
```

Ollama normally listens on `http://127.0.0.1:11434`. If you use another **local** port, set `OLLAMA_URL` before starting the development server. The API intentionally rejects non-loopback Ollama URLs.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite client and watched local API together. |
| `npm test` | Run the unit and API tests with Node's built-in test runner. |
| `npm run build` | Create the production client in `dist/`. |
| `npm start` | Build the client and start the production Express server. |
| `npm run start:server` | Start the Express server without opening a browser. |
| `npm run preview` | Preview the Vite production build. |

## Under the hood

| Area | Implementation |
| --- | --- |
| UI | React 19 and Vite 8 |
| Local API | Node.js and Express |
| Tutor and agent | Ollama over a loopback-only local API |
| Math typesetting | KaTeX with locally bundled fonts |
| Local persistence | Browser `localStorage` |
| Offline shell | Same-origin service-worker cache |
| Tests | Node.js `node:test` |

### Project map

```text
src/
  App.jsx                 Application shell, navigation, and learning flows
  CalculatorPage.jsx      Basic, scientific, and graphing calculator layouts
  calculator.js           Safe local expression parser and evaluator
  data/electra_data.json  Offline coursebook, vocabulary, quiz, and applied content
  math.js                 Physics problem generation and deterministic solver
  matrix.js               Pure matrix-operation helpers
  ScratchPad.jsx          Canvas, typed work, and local notes
server/
  index.js                Local Tutor, Agent, and Ollama API
public/
  electralab-logo.svg     README brand mark
  service-worker.js       Offline app-shell caching
test/                     Unit and API tests
```

## Contributing and checks

Before proposing a change, run:

```bash
npm test
npm run build
```

Keep the offline-first behavior intact: math content should remain locally renderable, deterministic helpers should remain independently testable, and Scratch Pad drawings should not be transmitted to the tutor.

ElectraLab is adapted from the [CalcuLust](https://github.com/Violet-Night-LLC/CalcuLust) architecture — the same offline-first learning patterns, re-skinned and re-focused on NCERT physics.
