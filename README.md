# Strike Point Risk

Lightning protection risk assessment to **BS EN 62305-2:2012 (Edition 2)** with the **UK National Annex**, by Strike Point Lightning Protection Ltd.

Live app: https://splp-2023.github.io/SPLPLPRA/

## What it does

- Eight steps: Project, Environment, Structure, Lines, Zones, Protection, Results, Report.
- Risks R1 (human life), R2 (public service) and R3 (cultural heritage). R4 is planned.
- Live results on every step, with notes for any default, override or rule applied.
- Collection area by formula A.2 for rectangles and the standard's graphical method for pitched roofs and protrusions.
- 3D view of the structure with an indicative LPS layout, collection area and rolling sphere.
- Branded PDF reports (full and summary) with a plain-English protection summary, 3D layout page and signed declaration.
- Works offline once installed (Android, iOS and desktop). Assessments are saved in the browser and as files you can move between devices. Nothing is sent to a server.

## Accuracy

Every formula and table value is listed in the project's verified values document. The engine is checked against three StrikeRisk v6.0 reports on every push (see `tests/`):

```
node tests/run-tests.js
```

Known, deliberate differences from StrikeRisk:

- Pitched roofs use the standard's graphical method; StrikeRisk uses the eaves height only.
- Coordinated SPDs do not reduce P_C without an LPS, and touch/step measures do not reduce P_A without an LPS (UK annex NB.1 and NB.3, note 1).

## Structure

```
index.html            app shell
css/app.css           styles
js/tables.js          values from BS EN 62305-1/2/3 and the UK annex
js/geometry.js        collection areas and down conductor layout
js/engine.js          risk calculation (pure functions, also runs in Node)
js/view3d.js          3D view (three.js)
js/report.js          PDF reports (jsPDF)
js/app.js             screens, saving and live results
vendor/               bundled libraries (MIT licences included)
sw.js                 offline cache; bump VERSION when files change
tests/                StrikeRisk reference cases
```

No build step. Edit the files and push; GitHub Pages serves the main branch.
