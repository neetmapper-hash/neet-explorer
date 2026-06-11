import Groq from 'groq-sdk';
import { fal } from '@fal-ai/client';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { roomType, length, width, style, budget } = await req.json();

    if (!roomType || !length || !width || !style || !budget) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    fal.config({ credentials: process.env.FAL_KEY });

    // Step 1: Groq builds 4 different prompts
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const promptCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an expert interior design prompt engineer for Stable Diffusion XL.
Convert room requirements into detailed photorealistic image generation prompts.
Output ONLY a JSON array of 4 strings. No explanation. No markdown. Just the JSON array.`,
        },
        {
          role: 'user',
          content: `4 DIFFERENT Stable Diffusion prompts for:
Room: ${roomType}, Size: ${length}ft x ${width}ft
Style: ${style}, Budget: ${budget}, Setting: Indian home interior
Each prompt must show a distinctly different design variation.
End every prompt with: photorealistic, 8k, interior design photography, professional lighting
Output format: ["prompt1", "prompt2", "prompt3", "prompt4"]`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    let prompts: string[] = [];
    try {
      const content = promptCompletion.choices[0].message.content || '[]';
      const cleaned = content.replace(/```json|```/g, '').trim();
      prompts = JSON.parse(cleaned);
    } catch {
      const fallback = `${style} ${roomType}, ${length}ft x ${width}ft, Indian home, photorealistic, 8k`;
      prompts = [fallback, fallback, fallback, fallback];
    }

    // Step 2: Generate all 4 images in parallel via fal.ai
    const imagePromises = prompts.slice(0, 4).map(async (prompt, i) => {
      try {
        const result = await fal.subscribe('fal-ai/fast-sdxl', {
          input: {
            prompt,
            negative_prompt: 'blurry, low quality, distorted, cartoon, watermark',
            image_size: 'landscape_4_3',
            num_inference_steps: 28,
            guidance_scale: 7.5,
            num_images: 1,
          },
        });

        const imageUrl = (result.data as any)?.images?.[0]?.url ?? null;
        return { url: imageUrl, prompt, index: i };
      } catch (err) {
        console.error(`Image ${i} failed:`, err);
        return { url: null, prompt, index: i };
      }
    });

    const results = await Promise.all(imagePromises);
    return Response.json({ images: results, roomDetails: { roomType, length, width, style, budget } });

  } catch (error) {
    console.error('Generate API error:', error);
    return Response.json({ error: 'Failed to generate images' }, { status: 500 });
  }
}