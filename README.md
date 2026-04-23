# Root Cause Analysis Tool (TE-frontend)

A professional tool for performing Root Cause Analysis (RCA) using Ishikawa (Fishbone) diagrams and 5-Why analysis. This project features an AI-powered workflow that helps turn a problem statement into actionable insights and visual diagrams.

## Features

- **Problem Analysis**: Input a problem statement to generate potential causes.
- **Ishikawa (Fishbone) Diagram**: Interactive table-based view of causes across canonical categories (Technology, Process, People, etc.).
- **Visual Diagram Rendering**: A local Node.js server that generates PNG images of your Ishikawa diagrams.
- **5-Why Analysis**: Deep-dive into specific causes to find the ultimate root cause.
- **8D Management**: Manage 8D reports and documentation.
- **AI Chatbot**: Get assistance and guidance throughout the RCA process.

## Getting Started

### 1. Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

Start the Next.js frontend:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 4. Run the Visual Diagram Server

To enable PNG image generation for Ishikawa diagrams, you must run the local image server:

```bash
node server.mjs
```

This server runs on [http://localhost:4000](http://localhost:4000) and handles the conversion of SVG data to PNG using the `sharp` library.

## Project Structure

- `/app`: Next.js App Router pages and layouts.
- `/components`: Reusable UI components including the Ishikawa and 5-Why tools.
- `/lib`: Utility functions and API clients.
- `server.mjs`: Local Express server for image generation.

## Visual Diagram API

The image server provides a single endpoint:

- **POST `/generate`**:
  - **Payload**:
    ```json
    {
      "problem": "Problem Description",
      "categories": {
        "Category Name": ["Cause 1", "Cause 2"]
      }
    }
    ```
  - **Response**: A raw PNG image buffer.

## License

Private / Internal Use.
