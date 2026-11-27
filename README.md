<p align="center">
  <img src="./public/calculust-logo.svg" alt="Calculus(t) logo" width="520" />
</p>

<h1 align="center">Mathematics you can make sense of.</h1>

<p align="center">
  <strong>CalcuLust</strong> is an offline-first mathematics learning workspace for reading, reasoning, calculating, and practicing—from foundational algebra to applied calculus.
</p>

<p align="center">
  <code>LOCAL-FIRST</code>&nbsp;&nbsp;
  <code>OLLAMA-POWERED</code>&nbsp;&nbsp;
  <code>BUILT WITH REACT + VITE</code>
</p>

---

CalcuLust brings the parts of learning mathematics together in one place: textbook-style explanations, worked examples, deterministic tools, practice, a flexible calculator, and an optional private tutor that runs through Ollama on your own machine.

The interface is branded **calculus(t)**. Its name is a reminder that mathematics is not only about answers—it is also about relationships, change, and the steps that get us there.

## At a glance

| Learn | Work | Review |
| --- | --- | --- |
| Read the Coursebook and explore mathematical vocabulary. | Use the solver, three calculator layouts, and a persistent Scratch Pad. | Practice, take quizzes, and review locally stored progress. |
| Move from intuition to notation with worked examples and recall checks. | Ask the local Ollama tutor for a hint or another explanation. | Inspect local AI inference metrics in the AI Performance workspace. |

## Explore the workspace

### Learn the ideas

- **Coursebook** — a reading-first path with chapters, objectives, worked examples, recall checks, and saved reading progress.
- **Vocabulary** — review built-in mathematical and calculus cards, or submit an unfamiliar scientific, mathematical, or engineering term for an on-demand glossary lookup from your selected local Ollama model.
- **Practice and quizzes** — work through generated algebra, derivatives, integrals, statistics, and applied-calculus questions with immediate feedback.
- **Applied calculus** — connect derivatives and models to engineering optimization, RC circuits, and gradient descent.

### Calculate and reason

- **Problem solver** — use a deterministic local math engine for supported algebra, calculus, statistics, and matrix operations, with worked steps.
- **Calculator** — switch between three purpose-built layouts:
  - **Basic** for arithmetic and order of operations.
  - **Scientific** for trigonometric functions, logarithms, roots, powers, factorials, and degree/radian angle modes.
  - **Graphing** to plot a function of `x` over an adjustable horizontal range.
- **Formula builder** — insert symbols and editable formula templates into the Ollama Tutor prompt, including fractions, powers, roots, repeating decimals, and number-set notation.

### Keep your work close

- **Scratch Pad** — draw with a mouse, stylus, or touch; adjust pen width; type numbers and notation; and drag placed number or note boxes around the canvas.
- **Thoughts & Steps** — keep written work beside the canvas, insert notation at the text cursor, or place a copy of the notes onto the canvas.
- **Utilities** — open the Scratch Pad or Calculator from the top bar without leaving your current learning page.
- **Progress** — see practice history, accuracy, streaks, and course reading progress stored in this browser.

### Learn with local AI

- **Ollama Tutor** — ask for a hint, a clearer explanation, or another way to understand a step.
- **AI Performance** — explore a local Ollama model and inspect runtime and inference metrics, including token counts and generation speed.
- **Math rendering** — equations are rendered with locally bundled KaTeX assets, so mathematical notation does not depend on a hosted rendering service.

AI can make mistakes. Check its arithmetic, assumptions, units, signs, and reasoning against your own work.

## A local-first design

CalcuLust is designed to keep everyday learning on your device:

- Lessons, generated exercises, the deterministic solver, calculator, and graphing tools run locally in the browser.
- Scratch Pad drawings and notes are stored in browser `localStorage`; they are **not** sent to Ollama.
- Learning history, course progress, calculator state, and inference metrics are stored locally in this browser.
- Vocabulary lookups run only when submitted; the requested term goes to local Ollama, while the generated explanation stays in the current page session and is not added to the saved cards or review progress.
- Tutor conversations are not saved to learning history. When you use the tutor, the in-session conversation and any explicitly attached typed context are sent to the Ollama service on this device.
- The Express API accepts Ollama connections only from loopback addresses. It does not provide a hosted AI fallback.
- The production service worker caches the app shell and same-origin assets for offline use after the app has been loaded.

Ollama is optional. Without it, the reading, calculator, Scratch Pad, deterministic solver, and practice features remain available; local AI features show their connection/setup state.

## Brand system

The README logo follows the in-app `c.` mark and `calculus(t)` wordmark. The interface uses **Atkinson Hyperlegible Next** for accessible reading and locally bundled KaTeX fonts for mathematics.

| Color | Hex | Role |
| --- | --- | --- |
| Charcoal | `#1C1D21` | App background |
| Graphite | `#24252A` | Main surfaces |
| Burgundy | `#7C2852` | Brand mark and selected states |
| Cyan | `#0FB7E0` | Primary action, focus, and notation accent |
| Green | `#09E82E` | Positive and progress accents |
| Purple | `#3912A3` | Secondary highlight |
| Soft white | `#F0F0F2` | Primary text |
| Cool gray | `#C0C1C7` | Supporting text |

## Get started

### Requirements

- Node.js **20.19+** or **22.12+**
- npm
- Optional: [Ollama](https://ollama.com/) and a locally installed chat model for Tutor and AI Performance features

### Install and run

```bash
git clone https://github.com/Violet-Night-LLC/CalcuLust.git
cd CalcuLust
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
| `npm test` | Run the unit and API tests with Node’s built-in test runner. |
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
  courseContent.js        Offline Coursebook chapters and content
  math.js                 Problem generation and deterministic solver
  matrix.js               Pure matrix-operation helpers
  ScratchPad.jsx          Canvas, typed work, and local notes
  vocabulary.js           Symbol and mathematics vocabulary
server/
  index.js                Local Tutor, Agent, and Ollama API
public/
  calculust-logo.svg      README brand mark
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
