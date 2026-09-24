import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  handleAsaasWebhook,
  checkSubscriptionStatusEndpoint,
  handleCreatePixEndpoint,
  handleSimulateAsaasPaymentEndpoint,
} from "./src/server/asaasWebhook";

const currentDir = process.cwd();

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow larger image payloads (e.g. photos of receipts up to 25MB)
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Asaas Webhook: Validação de Token, escuta 'PAYMENT_RECEIVED' e ativação de assinatura
  app.post("/api/webhooks/asaas", handleAsaasWebhook);
  app.get("/api/webhooks/asaas", (req, res) => {
    res.json({
      status: "online",
      service: "Asaas Webhook Gateway",
      eventExpected: "PAYMENT_RECEIVED",
      url: "/api/webhooks/asaas",
      time: new Date().toISOString(),
    });
  });

  // Checagem de status de assinatura
  app.get("/api/subscription/status", checkSubscriptionStatusEndpoint);

  // Cobrança Pix Asaas & Simulação
  app.post("/api/asaas/create-pix", handleCreatePixEndpoint);
  app.post("/api/asaas/simulate-confirm", handleSimulateAsaasPaymentEndpoint);

  // OCR & Extraction of Receipts / Invoices / Comprovantes
  app.post("/api/extract-receipt", async (req, res) => {
    try {
      const { image, mimeType = "image/jpeg" } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Nenhuma imagem foi enviada." });
      }

      // Remove base64 data prefix if present (e.g. "data:image/jpeg;base64,")
      const base64Data = image.replace(/^data:[^;]+;base64,/, "");

      const ai = getAiClient();

      const prompt = `Você é um assistente especialista em leitura e extração de recibos, notas fiscais, cupons fiscais e comprovantes de compras de materiais ou gastos de obras e serviços.
Analise a imagem da notinha/recibo fornecida e extraia TODOS os itens discriminados.
Para cada item, identifique:
- description: Descrição clara do item/material/gasto (ex: "Tinta Látex 18L", "Caçamba de Entulho", "Rolo de Pintura", "Saco de Cimento 50kg")
- quantity: Quantidade numérica (se não estiver explícito, use 1)
- unit: Unidade de medida comum ("un", "lata", "galão", "m²", "saco", "dia", "viagem", "rolo", "cx", "kg", "litro", etc. Padrão: "un")
- unit_price: Valor unitário em Reais (número decimal, ex: 35.50)
- total_price: Valor total do item em Reais (número decimal). Se não estiver explícito, calcule quantity * unit_price.

Retorne ESTRITAMENTE um JSON válido com o seguinte formato, sem formatação markdown em volta:
{
  "store_name": "Nome da loja ou estabelecimento se visível",
  "receipt_date": "Data se visível",
  "items": [
    {
      "description": "Nome do item",
      "quantity": 1,
      "unit": "un",
      "unit_price": 0.00,
      "total_price": 0.00
    }
  ],
  "total": 0.00
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        // Fallback: extract json from codeblock if present
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error("Não foi possível processar o formato dos dados retornados.");
        }
      }

      // Normalize items
      const rawItems = Array.isArray(parsedData.items) ? parsedData.items : [];
      const formattedItems = rawItems.map((item: any) => {
        const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const unitPrice = Number(item.unit_price) >= 0 ? Number(item.unit_price) : 0;
        let totalPrice = Number(item.total_price);
        if (!totalPrice || isNaN(totalPrice)) {
          totalPrice = Math.round(qty * unitPrice * 100) / 100;
        }
        return {
          description: String(item.description || "Item da Notinha").trim(),
          quantity: qty,
          unit: String(item.unit || "un").toLowerCase().trim(),
          unit_price: unitPrice,
          total_price: Math.round(totalPrice * 100) / 100,
        };
      });

      return res.json({
        success: true,
        store_name: parsedData.store_name || "",
        receipt_date: parsedData.receipt_date || "",
        total: parsedData.total || formattedItems.reduce((acc: number, it: any) => acc + it.total_price, 0),
        items: formattedItems,
      });
    } catch (err: any) {
      console.error("Erro na extração da notinha:", err);
      return res.status(500).json({
        error: "Falha ao analisar a notinha de gasto. Verifique se a foto está nítida e tente novamente.",
        details: err?.message || String(err),
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true as const,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
