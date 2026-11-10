
import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
            timeout: 60000,
            retryOptions: {
                attempts: 1,
            },
        },
    })
    : null;

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const orinInstructions = `
You are ORIN, the friendly AI assistant of Credence.

Credence is a service marketplace that helps customers find and
book trusted local professionals across Kerala.

Your responsibilities:
- Help customers find service professionals.
- Explain how to book services.
- Answer questions about Credence.
- Explain available service categories.
- Be friendly, helpful and professional.
- Keep answers short and easy to understand.
- Never invent provider details, prices or availability.
`;

export const chatWithOrin = async (
    req: Request,
    res: Response
) => {
    try {
        if (!ai) {
            return res.status(500).json({
                message: "Gemini API key is missing.",
            });
        }

        const { messages, message } = req.body;

        const incoming = Array.isArray(messages)
            ? messages
            : typeof message === "string"
                ? [{ role: "user", content: message }]
                : [];

        const safeMessages = incoming
            .filter(
                (item: any) =>
                    ["user", "assistant"].includes(item?.role) &&
                    typeof item?.content === "string" &&
                    item.content.trim().length > 0
            )
            .slice(-8);

        if (!safeMessages.length) {
            return res.status(400).json({
                message: "Please send a message.",
            });
        }

        const contents = safeMessages.map((item: any) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content.trim() }],
        }));

        console.log(`ORIN request started | Model: ${MODEL}`);

        const response = await ai.models.generateContent({
            model: MODEL,
            contents,
            config: {
                systemInstruction: orinInstructions,
                temperature: 0.4,
                maxOutputTokens: 200,
                automaticContinuation: false,
            },
        });
        const reply = response.text?.trim();

        if (!reply) {
            return res.status(502).json({
                message: "Gemini returned an empty response.",
            });
        }

        console.log("ORIN response completed successfully.");

        return res.status(200).json({ reply });

    } catch (error: any) {
        console.error("ORIN GEMINI ERROR:", {
            message: error?.message,
            status: error?.status,
            code: error?.code,
        });

        const status = Number(error?.status || error?.code);

        if (status === 503 || status === 429) {
            return res.status(503).json({
                message: "ORIN is busy right now. Please try again shortly.",
            });
        }

        if (status === 504 || error?.name === "AbortError") {
            return res.status(504).json({
                message: "ORIN took too long to respond. Please try again.",
            });
        }

        return res.status(500).json({
            message: "ORIN is temporarily unavailable.",
        });
    }
};
