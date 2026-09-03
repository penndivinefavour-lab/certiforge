import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

// ── Design schema (what the AI returns) ───────────────────────────────────────
export const designSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  orientation: z.enum(["portrait", "landscape"]),
  paper: z.object({
    width: z.number().min(100).max(2000),
    height: z.number().min(100).max(2000),
    unit: z.enum(["mm", "px"]).default("mm"),
  }),
  background: z.object({
    type: z.enum(["color", "gradient", "image"]),
    color: z.string().optional(),
    gradient: z
      .object({
        type: z.enum(["linear"]),
        angle: z.number().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .optional(),
  }).optional(),
  elements: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("text"),
          text: z.string().min(1),
          x: z.number(),
          y: z.number(),
          width: z.number().optional(),
          height: z.number().optional(),
          style: z.object({
            fontFamily: z.string().optional(),
            fontSize: z.number(),
            fontWeight: z.number().optional(),
            color: z.string().optional(),
            textAlign: z.enum(["left", "center", "right"]).optional(),
            opacity: z.number().min(0).max(1).optional(),
            fontStyle: z.enum(["normal", "italic"]).optional(),
            lineHeight: z.number().min(0.5).max(3).optional(),
          }),
          dynamic: z
            .object({
              field: z.string(),
              fallback: z.string().optional(),
            })
            .optional(),
        }),
        z.object({
          type: z.literal("image"),
          imageUrl: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          opacity: z.number().min(0).max(1).optional(),
          rotation: z.number().optional(),
        }),
        z.object({
          type: z.literal("shape"),
          shapeType: z.enum(["rect", "circle", "line"]),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          style: z
            .object({
              fill: z.string().optional(),
              stroke: z.string().optional(),
              strokeWidth: z.number().optional(),
              opacity: z.number().min(0).max(1).optional(),
              cornerRadius: z.number().optional(),
            })
            .optional(),
        }),
        z.object({
          type: z.literal("qr_code"),
          x: z.number(),
          y: z.number(),
          size: z.number(),
          verificationUrl: z.string(),
        }),
        z.object({
          type: z.literal("signature"),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          signerName: z.string(),
          signerTitle: z.string().optional(),
          date: z.string().optional(),
        }),
      ])
    )
    .optional(),
});

export type CertificateDesign = z.infer<typeof designSchema>;

// ── LLM adapter ───────────────────────────────────────────────────────────────
const systemPrompt = `
You are a certificate design assistant for CertiForge.

You produce structured certificate designs that the CertiForge editor can load and render.

RULES:
- Use mm units by default.
- Portrait orientation is the default for academic/corporate certificates.
- Landscape is appropriate for workshop/poster-style certificates.
- Typical paper size: A4 portrait (210mm x 297mm) or Letter (215.9mm x 279.4mm).
- Use clean, premium aesthetics: restrained color palette, strong typography, generous spacing.
- Gold (#BFA46B) or navy (#0F2C40) accents are preferred.
- Include these dynamic field tokens where appropriate:
  - {{recipient_name}} — recipient full name
  - {{course_name}} — program/course title
  - {{issue_date}} — date of issue
  - {{certificate_id}} — unique certificate number
  - {{instructor}} — instructor/trainer name
  - {{organization}} — organization name
  - {{duration}} — program duration
  - {{grade}} — grade/score
  - {{email}} — recipient email
- For tokens, set "dynamic.field" to the canonical field name WITHOUT the {{ }} braces.
- Place elements using absolute x/y coordinates from top-left of the paper.
- Keep text legible: fontSize between 10mm and 70mm in print terms (we use a scale; in practice use 14-72px in editor).
- Do not include more than ~12 elements unless the request demands more.
- Return ONLY a valid JSON object matching the design schema. No prose.

Example (course completion certificate, A4 portrait):
{
  "name": "Course Completion Certificate",
  "orientation": "portrait",
  "paper": { "width": 210, "height": 297, "unit": "mm" },
  "background": { "type": "color", "color": "#FFFFFF" },
  "elements": [
    {
      "type": "text",
      "text": "Certificate of Completion",
      "x": 105,
      "y": 70,
      "width": 190,
      "style: { "fontSize": 34, "fontWeight": 700, "color": "#0F2C40", "textAlign": "center" }
    },
    {
      "type": "text",
      "text": "This is proudly presented to",
      "x": 105,
      "y": 120,
      "width": 190,
      "style: { "fontSize": 14, "color": "#5C6670", "textAlign": "center" }
    },
    {
      "type": "text",
      "text": "{{recipient_name}}",
      "x": 105,
      "y": 140,
      "width": 190,
      "dynamic: { "field": "recipient_name", "fallback": "Recipient Name" },
      "style: { "fontSize": 28, "fontWeight": 700, "color": "#1A1F24", "textAlign": "center" }
    },
    {
      "type": "text",
      "text": "for successfully completing",
      "x": 105,
      "y": 190,
      "width": 190,
      "style: { "fontSize": 14, "color": "#5C6670", "textAlign": "center" }
    },
    {
      "type": "text",
      "text": "{{course_name}}",
      "x": 105,
      "y": 210,
      "width": 190,
      "dynamic: { "field": "course_name", "fallback": "Course Name" },
      "style: { "fontSize": 22, "fontWeight": 600, "color": "#1A1F24", "textAlign": "center" }
    },
    {
      "type": "shape",
      "shapeType": "line",
      "x": 40,
      "y": 235,
      "width": 130,
      "height": 0,
      "style: { "stroke": "#BFA46B", "strokeWidth": 2 }
    },
    {
      "type": "text",
      "text": "Issued on {{issue_date}} | Certificate ID: {{certificate_id}}",
      "x": 105,
      "y": 255,
      "width": 190,
      "dynamic: { "field": "certificate_id", "fallback": "CERT-2026-000001" },
      "style: { "fontSize": 11, "color": "#7A8490", "textAlign": "center" }
    },
    {
      "type": "qr_code",
      "x": 175,
      "y": 245,
      "size": 25,
      "verificationUrl": "https://certiforge.io/verify/"
    }
  ]
}
`;

let llm: ChatOpenAI | null = null;

function getLLM() {
  if (llm) return llm;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for AI design generation");
  llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0.7,
    apiKey,
  });
  return llm;
}

export async function generateDesign(prompt: string): Promise<CertificateDesign> {
  const l = getLLM();
  const [system, human] = [
    new SystemMessage({ content: systemPrompt }),
    new HumanMessage({ content: prompt }),
  ];

  const response = await l.invoke([system, human]);

  let json: unknown;
  try {
    json = JSON.parse(response.content as string);
  } catch {
    // Sometimes the model returns markdown-wrapped JSON
    const cleaned = (response.content as string).replace(/^```json/i, "").replace(/```$/i, "").trim();
    json = JSON.parse(cleaned);
  }

  const result = designSchema.parse(json);
  return result;
}

export async function suggestFieldMapping(
  headers: string[],
  prompt?: string
): Promise<Array<{ source: string; target: string; confidence: number }>> {
  const l = getLLM();

  const userMessage = prompt
    ? `Map these spreadsheet columns to certificate fields.\n\nSpreadsheet columns: ${headers.join(", ")}\n\n${prompt}\n\nReturn ONLY a JSON array of { source, target, confidence } objects. source must be one of the spreadsheet column names. Use lowercase_with_underscores for target field names (e.g. recipient_name, course_name, issue_date).`
    : `Suggest mappings for these spreadsheet columns to standard certificate fields.\n\nSpreadsheet columns: ${headers.join(", ")}\n\nReturn ONLY a JSON array of { source, target, confidence } objects. source must be one of the column names exactly. Use lowercase_with_underscores for target. Only include mappings you are confident about (confidence >= 0.6).`;

  const response = await l.invoke([new HumanMessage({ content: userMessage })]);

  let json: unknown;
  try {
    json = JSON.parse(response.content as string);
  } catch {
    const cleaned = (response.content as string).replace(/^```json/i, "").replace(/```$/i, "").trim();
    json = JSON.parse(cleaned);
  }

  const mappingSchema = z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      confidence: z.number().min(0).max(1),
    })
  );
  return mappingSchema.parse(json);
}
