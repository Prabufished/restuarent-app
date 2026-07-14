import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // API Route for Menu OCR
  app.post("/api/ocr-menu", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Clean up base64 string if it contains prefix like "data:image/jpeg;base64,"
      let base64Data = image;
      let actualMimeType = mimeType || "image/jpeg";
      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          actualMimeType = match[1];
          base64Data = match[2];
        }
      }

      const prompt = `Analyze this physical restaurant menu photo. Read the text and identify all dish items, their descriptions, prices, categories (such as Starter, Main Course, Beverage, Dessert, etc.), and tags.
You MUST output the result as a JSON object containing an "items" array with this schema:
{
  "items": [
    {
      "name": "string (dish name)",
      "description": "string (brief description of dish, if available)",
      "price": number (price as a plain number, ignore currency symbols but extract the numeric value, e.g. 250 for 250 INR)",
      "category": "string (Starter, Main Course, Beverage, Dessert, Bread, etc.)",
      "isVeg": boolean (true if dish is vegetarian based on name/description or Indian context, false otherwise)",
      "spiceLevel": "string (e.g., 'Mild', 'Medium', 'Hot', or 'None')"
    }
  ]
}
Be precise. Extract as many clear, distinct menu items as you can see. Convert prices correctly.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: actualMimeType
            }
          },
          prompt
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    description: { type: "STRING" },
                    price: { type: "NUMBER" },
                    category: { type: "STRING" },
                    isVeg: { type: "BOOLEAN" },
                    spiceLevel: { type: "STRING" }
                  },
                  required: ["name", "price", "category"]
                }
              }
            },
            required: ["items"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (error: any) {
      console.error("Gemini OCR error:", error);
      return res.status(500).json({ error: error.message || "Failed to process menu image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
