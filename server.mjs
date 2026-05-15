import express from "express"
import puppeteer from "puppeteer"
import cors from "cors"

const app = express()
app.use(cors({ origin: "*" }))
app.use(express.json())

// ✅ Transform YOUR JSON → UI format
function transformData(input) {
  const output = {}

  input.data.forEach(section => {
    output[section.category] = section.result.map(item => ({
      title: item.sub_category,
      description: item.cause,
      evidence: item.evidence,
      level: item.severity,
      severity: item.severity
    }))
  })

  return output
}

// ✅ Transform 5-Why JSON → UI format
function transformDataFiveWhy(input) {
  const output = {}
  console.log(input)

  output["5-Why Analysis"] = input.analysis.map(chain => ({
    title: chain.root_cause,
    description: chain.why_chain.map(step => `Why ${step.level}: ${step.question}\nAnswer: ${step.answer}`).join('\n\n'),
    evidence: `Confidence: ${Math.round(chain.confidence * 100)}%`,
    level: chain.confidence > 0.8 ? 'high' : chain.confidence > 0.5 ? 'medium' : 'low',
    severity: chain.confidence > 0.8 ? 'high' : chain.confidence > 0.5 ? 'medium' : 'low'
  }))

  return output
}
// ✅ Generate HTML UI
function generateHTML(data, problem, mainCause = []) {
  const statusClass = (s) => {
    if (s?.toLowerCase() === "high")   return "confirmed";
    if (s?.toLowerCase() === "medium") return "possible";
    if (s?.toLowerCase() === "low")    return "excluded";
    return "excluded";
  };
  const statusLabel = (s) => {
    if (s?.toLowerCase() === "high")   return "Confirmed as Cause";
    if (s?.toLowerCase() === "medium") return "Possible Cause";
    if (s?.toLowerCase() === "low")    return "Excluded as Cause";
    return "Excluded as Cause";
  };

  const renderSection = (title, items, arrowDir) => `
    <div class="section-col">
      <div class="category-header">${title}</div>
      <div class="cards-area">
        ${items.map(item => `
          <div class="cause-card">
            <div class="card-text">${item.description || item.title || "&nbsp;"}</div>
            <div class="card-right">
              <div class="status-badge ${statusClass(item.severity)}">${statusLabel(item.severity)}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  const keys    = Object.keys(data);
  const topKeys = keys.slice(0, 3);
  const botKeys = keys.slice(3, 6);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    background: #dce3ec;
    padding: 16px;
    min-width: 900px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  .problem-title {
    text-align: center; font-size: 16px; font-weight: 800;
    color: #0d0d0d; margin-bottom: 12px;
    letter-spacing: 0.03em; text-transform: uppercase;
  }

  .legend {
    display: flex; gap: 18px; margin-bottom: 12px; align-items: center;
    border: 1.5px solid #b0bac8; border-radius: 5px;
    background: #fff; padding: 6px 12px; width: fit-content;
  }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #222; font-weight: 700; }
  .legend-dot { width: 13px; height: 13px; border-radius: 2px; flex-shrink: 0; }
  .dot-confirmed { background: #c0392b; }
  .dot-possible  { background: #b87d00; }
  .dot-excluded  { background: #1a6e3f; }
  .dot-na        { background: #666; }

  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

  .section-col { display: flex; flex-direction: column; }
  .category-header {
    background: #f80; color: black;
    font-size: 12px; font-weight: 800;
    letter-spacing: 0.1em; text-transform: uppercase;
    border-radius: 5px 5px 0 0; padding: 7px 10px; text-align: center;
    border: 2px solid #f80;
  }
  .cards-area {
    border: 2px solid #f80; border-top: none;
    border-radius: 0 0 5px 5px; overflow: hidden;
    background: #f0f3f7; flex: 1;
  }
  .cause-card {
    border-bottom: 1.5px solid #c5ccd8; padding: 7px 8px;
    background: #fff; display: flex;flex-direction:column; gap: 7px; align-items: flex-start;
  }
  .cause-card:last-child { border-bottom: none; }
  .card-text {
    font-size: 11px; color: #111; line-height: 1.5; flex: 1; min-width: 0;
    border: 1.5px solid #aab0bb; border-radius: 3px; padding: 5px 7px;
    background: #f9fafb; word-break: break-word; white-space: pre-wrap;
    min-height: 40px; font-weight: 500;
  }
  .card-right {
    display: flex; flex-direction: column; align-items: center;width:100%;
    gap: 5px; flex-shrink: 0; padding-top: 2px;
  }
  .arrow-indicator { width: 0; height: 0; flex-shrink: 0; }
  .arrow-indicator.down {
    border-left: 8px solid transparent; border-right: 8px solid transparent;
    border-top: 14px solid #e07b20;
  }
  .arrow-indicator.up {
    border-left: 8px solid transparent; border-right: 8px solid transparent;
    border-bottom: 14px solid #e07b20;
  }
  .status-badge {
    font-size: 9.5px; font-weight: 800; color: #fff;width:100%;
    border-radius: 3px; padding: 5px 6px;
    white-space: nowrap; text-align: center; letter-spacing: 0.02em;
  }
  .confirmed { background: #c0392b; }
  .possible  { background: #b87d00; }
  .excluded  { background: #1a6e3f; }
  .na        { background: #666; }

  .connector {
    display: flex; height: 22px;
    justify-content: space-around; padding: 0 10px; align-items: center;
  }
  .arrow-col { display: flex; justify-content: center; align-items: center; flex: 1; }
  .a-down {
    width: 0; height: 0;
    border-left: 11px solid transparent; border-right: 11px solid transparent;
    border-top: 17px solid #c96a10;
  }
  .a-up {
    width: 0; height: 0;
    border-left: 11px solid transparent; border-right: 11px solid transparent;
    border-bottom: 17px solid #c96a10;
  }

  .effect-row { display: flex; align-items: stretch; margin: 1px 0; gap: 0; }
  .cause-arrow-bar {
    flex: 1; min-height: 48px; background: #d96e14;
    clip-path: polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%);
    display: flex; align-items: center; justify-content: center; padding: 8px 36px 8px 16px;
  }
  .cause-label {
    font-size: 13px; font-weight: 800; color: #fff;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .main-causes-list {
    display: flex; gap: 8px; font-size: 10px; font-weight: 600; color: #fff; text-align: center; justify-content: center; flex-wrap: wrap; width: 100%;
  }
  .main-cause-item {
    background: rgba(0, 0, 0, 0.2); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.3); max-width: 30%; line-height: 1.3;
  }
  .effect-sep {
    display: flex; align-items: center; padding: 0 8px;
    gap: 3px; flex-shrink: 0;
  }
  .effect-arrow { font-size: 22px; color: #c96a10; line-height: 1; }
  .effect-word  {
    font-size: 10px; color: #555; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .effect-box {
    border: 2px solid #888; background: #fff; border-radius: 6px;
    padding: 7px 14px; width: 240px; flex-shrink: 0;
    font-size: 12px; color: #0d0d0d; line-height: 1.5; font-weight: 700;
    display: flex; align-items: center; word-break: break-word;
  }
</style>
</head>
<body>
  <div class="problem-title">${problem || ""}</div>

  <div class="legend">
    <div class="legend-item"><div class="legend-dot dot-confirmed"></div>Confirmed as Cause</div>
    <div class="legend-item"><div class="legend-dot dot-possible"></div>Possible Cause</div>
    <div class="legend-item"><div class="legend-dot dot-excluded"></div>Excluded as Cause</div>
  </div>

  <div class="grid3">
    ${topKeys.map(k => renderSection(k, data[k], "down")).join("")}
  </div>

  <div class="connector">
    ${topKeys.map(() => `<div class="arrow-col"><div class="a-down"></div></div>`).join("")}
  </div>

  <div class="effect-row">
    <div class="cause-arrow-bar">
      ${mainCause && mainCause.length > 0
        ? `<div class="main-causes-list">${mainCause.map(c => `<span class="main-cause-item">${c}</span>`).join('')}</div>`
        : `<span class="cause-label">Cause</span>`
      }
    </div>
    <div class="effect-sep">
      <span class="effect-arrow">➤</span>
      <span class="effect-word">Effect</span>
    </div>
    <div class="effect-box">${problem || ""}</div>
  </div>

  <div class="connector">
    ${botKeys.map(() => `<div class="arrow-col"><div class="a-up"></div></div>`).join("")}
  </div>

  <div class="grid3">
    ${botKeys.map(k => renderSection(k, data[k], "up")).join("")}
  </div>
</body>
</html>`;
}
function generateHTMLFiveWhy(data, problem) {
  const chains = data["5-Why Analysis"] || []

  const formatStep = (step) => {
    const match = step.match(/^(Why\s*\d+\s*:.+?)\s*(Answer:)\s*(.+)$/is);
    if (match) {
      return `
        <span class="step-why">${match[1].trim()}</span>
        <span class="step-answer-label">${match[2]}</span>
        <span class="step-answer">${match[3].trim()}</span>
      `;
    }
    return step;
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    background: #f5ede3;
    padding: 20px;
    min-width: 700px;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  h1 {
    text-align: center;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 18px;
    padding: 12px 20px;
    background: #d96e14;
    color: #fff;
    border-radius: 6px;
  }

  .chains { display: flex; flex-direction: column; gap: 14px; }

  .chain {
    background: #fff;
    border-radius: 7px;
    overflow: hidden;
    border: 2px solid #e08030;
    box-shadow: 0 2px 6px rgba(180,90,0,0.10);
  }

  .chain-header {
    background: #d96e14;
    padding: 9px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .chain h3 {
    font-size: 12px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0;
  }

  .confidence {
    font-size: 10.5px;
    font-weight: 700;
    color: #fff;
    background: rgba(0,0,0,0.18);
    border-radius: 3px;
    padding: 6px 8px;
    white-space: nowrap;
  }

  .steps {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 0;
    background: #fdf6f0;
  }

  .step-row {
    display: flex;
    align-items: stretch;
    gap: 0;
  }

  .step-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 32px;
    flex-shrink: 0;
  }

  .step-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #d96e14;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 8px;
    z-index: 1;
    border: 2px solid #fff;
    box-shadow: 0 0 0 2px #d96e14;
  }

  .step-line {
    width: 2px;
    background: #e08030;
    flex: 1;
    margin: 0 auto;
    opacity: 0.35;
  }

  .step-no-line { flex: 1; }

  .step-content {
    flex: 1;
    background: #fff;
    border: 1.5px solid #e0c8b0;
    border-radius: 5px;
    padding: 8px 12px;
    margin: 4px 0;
    word-break: break-word;
  }

  .step-why {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #d96e14;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 3px;
  }

  .step-answer-label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 5px;
    margin-bottom: 2px;
  }

  .step-answer {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #1a1a1a;
    line-height: 1.5;
  }

  .step-arrow {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 14px;
    margin-left: 32px;
  }
  .step-arrow::before {
    content: '';
    display: block;
    width: 0; height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 11px solid #d96e14;
    opacity: 0.6;
  }

  .root-cause {
    margin: 4px 14px 12px 14px;
    background: #fff4e8;
    border: 2px solid #d96e14;
    border-radius: 5px;
    padding: 9px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .root-label {
    font-size: 14px;
    font-weight: 800;
    color: #fff;
    background: #d96e14;
    border-radius: 3px;
    padding: 3px 7px;
    white-space: nowrap;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .root-text {
    font-size: 15px;
    font-weight: 700;
    color: #7a3800;
    line-height: 1.4;
  }
</style>
</head>
<body>

  <h1>${problem || "5-Why Analysis"}</h1>

  <div class="chains">
    ${chains.map((chain, index) => {
      const steps = chain.description.split('\n\n').filter(s => s.trim());
      return `
        <div class="chain">
          <div class="chain-header">
            <h3>Potential Cause ${index + 1}</h3>
            <div class="confidence">${chain.evidence}</div>
          </div>

          <div class="steps">
            ${steps.map((step, i) => `
              <div class="step-row">
                <div class="step-content">${formatStep(step)}</div>
              </div>
              ${i < steps.length - 1 ? `<div class="step-arrow"></div>` : ''}
            `).join('')}
          </div>

          <div class="root-cause">
            <span class="root-label">Root Cause</span>
            <span class="root-text">${chain.title}</span>
          </div>
        </div>
      `;
    }).join('')}
  </div>

</body>
</html>`;
}

// ✅ API Route
app.post("/generate", async (req, res) => {
  try {
    const rawData = req.body
    console.log(rawData);
    // Validate input
    if (!rawData.data || !Array.isArray(rawData.data)) {
      return res.status(400).json({ error: "Invalid input format" })
    }

    // Transform data
    const transformedData = transformData(rawData)

    // Generate HTML
    const html = generateHTML(transformedData, rawData.problem, rawData.mainCause)

    // Launch browser
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"]
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    // Screenshot
    const buffer = await page.screenshot({
      fullPage: true
    })

    await browser.close()

    res.setHeader("Content-Type", "image/png")
    res.send(buffer)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to generate image" })
  }
})

// ✅ API Route for 5-Why
app.post("/generate-five-why", async (req, res) => {
  try {
    const rawData = req.body

    // Validate input
    if (!rawData.analysis || !Array.isArray(rawData.analysis)) {
      return res.status(400).json({ error: "Invalid input format" })
    }

    // Transform data
    const transformedData = transformDataFiveWhy(rawData)

    // Generate HTML
    const html = generateHTMLFiveWhy(transformedData, rawData.problem)

    // Launch browser
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"]
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    // Screenshot
    const buffer = await page.screenshot({
      fullPage: true
    })

    await browser.close()

    res.setHeader("Content-Type", "image/png")
    res.send(buffer)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to generate image" })
  }
})

// ✅ Start server
app.listen(4000, () => {
  console.log("Server running at http://localhost:4000")
})