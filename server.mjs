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

// ✅ Generate HTML UI
function generateHTML(data, problem) {
  const renderSection = (title, items) => `
    <div class="section">
      <h2>${title}</h2>
      ${items.map(item => `
        <div class="card">
          <div class="card-title">${item.title}</div>

          <div class="desc">${item.description}</div>

          <div class="meta">
            <span class="evidence">${item.evidence}</span>
            <span class="badge ${item.level.toLowerCase()}">
              ${item.level}
            </span>
          </div>

          <div class="footer">
            <span>Possible Cause</span>
            <span class="badge ${item.severity.toLowerCase()}">
              ${item.severity}
            </span>
          </div>
        </div>
      `).join("")}
    </div>
  `

  return `
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f7fa;
        padding: 20px;
      }

      h1 {
        text-align: center;
        margin-bottom: 25px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }

      .section {
        background: #fff;
        border-radius: 10px;
        padding: 15px;
        border-top: 5px solid #2b6cb0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }

      h2 {
        margin-bottom: 10px;
        color: #2b6cb0;
      }

      .card {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
        background: #fafafa;
      }

      .card-title {
        font-weight: bold;
        margin-bottom: 5px;
      }

      .desc {
        font-size: 13px;
        margin-bottom: 8px;
        color: #333;
      }

      .meta, .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        margin-top: 5px;
      }

      .badge {
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        color: white;
      }

      .high { background: #e53e3e; }
      .medium { background: #dd6b20; }
      .low { background: #38a169; }

      .evidence {
        color: #555;
        max-width: 70%;
      }
    </style>
  </head>

  <body>
    <h1>${problem || ""}</h1>

    <div class="grid">
      ${Object.keys(data).map(section =>
        renderSection(section, data[section])
      ).join("")}
    </div>
  </body>
  </html>
  `
}

// ✅ API Route
app.post("/generate", async (req, res) => {
  try {
    const rawData = req.body

    // Validate input
    if (!rawData.data || !Array.isArray(rawData.data)) {
      return res.status(400).json({ error: "Invalid input format" })
    }

    // Transform data
    const transformedData = transformData(rawData)

    // Generate HTML
    const html = generateHTML(transformedData, rawData.problem)

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