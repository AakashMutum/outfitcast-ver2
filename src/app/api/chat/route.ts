interface ChatBody {
  message?: string;
  wardrobe?: WardrobeItem[];
  weather?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

import { generateFallbackOutfit } from "@/lib/fallbackOutfit";
import { WardrobeItem } from "@/types";

export async function POST(req: Request) {
  let body: ChatBody = {};

  try {
    try {
      body = await req.json();
    } catch {
      return Response.json({ reply: "Couldn't read the request. Try again." }, { status: 400 });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY not found in environment.");
    }

    const { message = "", wardrobe = [], weather = {}, preferences = {} } = body;

    // Build a rich, context-aware prompt for a friendly stylist persona
    const prompt = `
You are a personal fashion stylist — friendly, casual, and fashion-savvy. You speak like a helpful friend, not a robot.

Here is what you know about the user:

=== Weather ===
${JSON.stringify(weather)}

=== Wardrobe (what they actually own) ===
${JSON.stringify(wardrobe)}

=== User Preferences ===
- Style preference: ${preferences?.style_pref || preferences?.style || "not set"}
- Temperature sensitivity: ${preferences?.temp_sensitivity || "neutral"}
- Outfit goal: ${preferences?.outfit_goal || "balanced"}
- Colour preference: ${preferences?.color_pref || "not set"}
- Most common occasion: ${preferences?.occasion_freq || "not set"}
- Gender: ${preferences?.gender || "not set"}

=== User Message ===
"${message}"

=== Your Instructions ===
- Speak naturally. Sound like a fashion-savvy friend, not a system.
- PREFER items from their wardrobe, but you MAY suggest external items if their wardrobe is missing something important.
  When you suggest something they don't own, say so clearly: e.g., "You don't have a jacket — a lightweight denim one would work here."
- Factor in temperature sensitivity. If they run hot, lean lighter. If they run cold, bias towards layers.
- Factor in their colour preference when choosing between options.
- Keep reply SHORT (4–8 lines max).
- Format your outfit suggestion like this (use emojis, keep it scannable):
  👚 Top: ...
  👖 Bottom: ...
  👟 Shoes: ...
  🧥 Layer: ... (only if needed)
  💡 Why: one short sentence on the vibe/reasoning.
- If the message isn't about outfits, just be helpful and natural.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Error (${response.status}):`, errText);
      throw new Error(`Gemini returned ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini response received ✓");

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("AI returned empty response");
    }

    return Response.json({ reply: text });

  } catch (error: any) {
    console.error("CHAT ERROR:", error.message || error);
    console.log("AI failed → using fallback");

    try {
      const fallback = generateFallbackOutfit({
        wardrobe: body.wardrobe || [],
        weather: body.weather || {},
      });

      console.log("Fallback triggered:", fallback.explanation);

      const fmt = (item: any) => item?.name || item?.color || "Not available";

      let reply = `Hey! AI is taking a break, but here's a smart pick from your wardrobe:\n\n`;
      reply += `👚 Top: ${fmt(fallback.outfit.top)}\n`;
      reply += `👖 Bottom: ${fmt(fallback.outfit.bottom)}\n`;
      reply += `👟 Shoes: ${fmt(fallback.outfit.shoes)}\n`;
      if (fallback.outfit.outerwear) {
        reply += `🧥 Layer: ${fmt(fallback.outfit.outerwear)}\n`;
      }
      reply += `\n💡 Why: ${fallback.explanation}`;

      return Response.json({ reply }, { status: 200 });
    } catch (fallbackErr) {
      console.error("Fallback also failed:", fallbackErr);
      return Response.json(
        { reply: "Sorry, I'm having trouble right now. Try refreshing!" },
        { status: 500 }
      );
    }
  }
}