import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface WardrobeItemInput {
    id: string;
    category: string;
    color: string;
    season: string;
    name?: string;
}

interface RecommendRequest {
    wardrobeItems: WardrobeItemInput[];
    weather: {
        temp: number;
        condition: string;
        humidity: number;
        wind_speed: number;
        feels_like: number;
    };
    preferences: {
        gender: string | null;
        style: string | null;
        location: string | null;
    };
    mood: string;
    occasion: string;
}

export async function POST(req: NextRequest) {
    try {
        if (!OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OpenAI API key not configured' },
                { status: 500 }
            );
        }

        const body: RecommendRequest = await req.json();
        const { wardrobeItems, weather, preferences, mood, occasion } = body;

        if (!wardrobeItems || wardrobeItems.length === 0) {
            return NextResponse.json(
                { error: 'No wardrobe items provided' },
                { status: 400 }
            );
        }

        const wardrobeSummary = wardrobeItems.map(item =>
            `- ${item.name || item.color + ' ' + item.category} (category: ${item.category}, color: ${item.color}, season: ${item.season})`
        ).join('\n');

        const itemIds = wardrobeItems.map(item => item.id);

        const prompt = `You are a personal fashion stylist AI. Given the user's wardrobe, current weather, preferences, mood, and occasion, recommend the best outfit.

## User's Wardrobe
${wardrobeSummary}

## Current Weather
- Temperature: ${weather.temp}°C (feels like ${weather.feels_like}°C)
- Condition: ${weather.condition}
- Humidity: ${weather.humidity}%
- Wind: ${weather.wind_speed} km/h

## User Preferences
- Gender: ${preferences.gender || 'Not specified'}
- Style: ${preferences.style || 'Not specified'}
- Location: ${preferences.location || 'Not specified'}

## Context
- Mood: ${mood}
- Occasion: ${occasion}

## Instructions
Pick the best items from the wardrobe for this outfit. You MUST only reference items by their exact ID from the wardrobe list. If a category is not needed or not available, set it to null.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "top_id": "<item id or null>",
  "bottom_id": "<item id or null>",
  "shoes_id": "<item id or null>",
  "outerwear_id": "<item id or null>",
  "accessory_ids": ["<item id>", ...],
  "explanation": "<2-3 sentence explanation of why this outfit works for the weather, mood, and occasion>"
}

Available item IDs: ${JSON.stringify(itemIds)}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a fashion stylist AI. Always respond with valid JSON only, no markdown.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 500,
                response_format: { type: 'json_object' },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`OpenAI API error (${response.status}):`, errorData);

            let userMessage = 'Failed to get recommendation from AI';
            if (response.status === 401) {
                userMessage = 'AI service authentication failed. Check API key.';
            } else if (response.status === 429) {
                userMessage = 'AI service rate limit reached. Please try again in a minute.';
            } else if (response.status === 500 || response.status === 503) {
                userMessage = 'AI service is temporarily unavailable. Please try again.';
            }

            return NextResponse.json(
                { error: userMessage, details: errorData },
                { status: 502 }
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return NextResponse.json(
                { error: 'Empty response from AI' },
                { status: 502 }
            );
        }

        // Parse the AI response
        let parsed;
        try {
            // Strip any accidental markdown fencing
            const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse AI response:', content);
            return NextResponse.json(
                { error: 'Invalid response format from AI' },
                { status: 502 }
            );
        }

        // Map IDs back to full wardrobe items
        const itemMap = new Map(wardrobeItems.map(item => [item.id, item]));

        const recommendation = {
            top: parsed.top_id ? itemMap.get(parsed.top_id) || null : null,
            bottom: parsed.bottom_id ? itemMap.get(parsed.bottom_id) || null : null,
            shoes: parsed.shoes_id ? itemMap.get(parsed.shoes_id) || null : null,
            outerwear: parsed.outerwear_id ? itemMap.get(parsed.outerwear_id) || null : null,
            accessories: (parsed.accessory_ids || [])
                .map((id: string) => itemMap.get(id))
                .filter(Boolean),
            explanation: parsed.explanation || 'Here is your AI-curated outfit recommendation.',
        };

        return NextResponse.json(recommendation);
    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
