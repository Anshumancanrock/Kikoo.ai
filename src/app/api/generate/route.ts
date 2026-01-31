import { genAI, generateWithRetry } from '@/lib/genAI';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {    const { tweet, mood, action } = await req.json();
    const session = await getServerSession(authOptions);
    // Removed IP tracking and credit limit checks
    
    let corePrompt;

    try {
        if (!session?.user) {
            corePrompt = process.env.SYSTEM_PROMPT;
            // No IP tracking
        } else {
            // Session exists, continue

            const user = await prisma.user.findFirst({
                where: {
                    email: session.user.email ?? ""
                }
            })
            corePrompt = user?.corePrompt;
        }

        const prompt = `You are an expert tweet refinement engine. Strictly follow these rules:

        [CRITICAL RULES]
        1. NEVER use emojis, hashtags, or markdown - strictly prohibited
        2. NO NEW CONTENT: Never add motivational phrases, opinions, advise or commentary. It's strict rule
        3. NEVER add new content - only refine what's provided
        4. ALWAYS maintain original intent while enhancing clarity
        5. STRICT length limit: Max 280 characters (hard stop)
        6. NEVER mention your actions or process - output only the refined tweet no other bullshit
        7. If the user provides you with a tweet, your task is to refine it, not comment on it or make it longer than the original tweet.

        [PROCESS]
        1. PRIMARY FOCUS: ${corePrompt} - make this drive all changes
        2. TONE: Convert to ${mood} tone while preserving message
        3. ACTION: Execute "${action}" with:
        - Formatting: Logical line breaks, remove fluff
        - Improving: Boost impact using mindset, tighten phrasing no commentary and opinions
        - Correcting: Fix errors, improve readability

        [OUTPUT REQUIREMENTS]
        - Multi-line format unless user specifies single-line
        - Preserve original formatting style when possible
        - Remove redundant phrases while keeping core message
        - Use active voice and concise language

        [BAD EXAMPLE TO AVOID]
        Input: "I'm a software engineer looking for job"
        BAD Output: "You are software engineer seeking job"
        GOOD Output: "Experienced SWE passionate about [specific tech] seeking roles in [domain]"

        [INPUT TO REFINE]
        "${tweet}"

        [FINAL INSTRUCTIONS]
        1. Analyze input against core prompt (${corePrompt})
        2. Apply ${mood} tone and ${action} action
        3. Generate ONLY the refined tweet meeting all rules
        4. Validate against all constraints before outputting`        // Prefer models that are cheaper / more generous with free tier. Allow overriding with AI_MODEL or AI_MODEL_PREFERENCES (comma-separated list)
        const defaultPreferences = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
        const envPref = process.env.AI_MODEL_PREFERENCES || process.env.AI_MODEL || '';
        const prefs = envPref ? envPref.split(',').map(s => s.replace(/^models\//, '').trim()).filter(Boolean) : defaultPreferences;

        console.info('Model preferences for this request:', prefs);

        let text: string | undefined;
        // store last error with candidate for better diagnostics
        let lastError: { candidate?: string; err?: unknown } | null = null;

        for (const candidate of prefs) {
            console.info(`Attempting model candidate: ${candidate}`);
            try {
                const model = genAI.getGenerativeModel({ model: candidate });
                const result = await generateWithRetry(model, prompt);
                text = result.response.text();
                console.info(`Model ${candidate} succeeded and was selected.`);
                // Success - break out
                break;
            } catch (err) {
                console.warn(`Model ${candidate} failed:`, err);
                lastError = { candidate, err };

                const msg = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : String(err);

                // If auth type unsupported, try REST query-param fallback (API key) for this candidate
                if (msg && (msg.includes('401') || msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') || msg.toLowerCase().includes('invalid authentication'))) {
                    console.info(`Auth type unsupported for ${candidate}, trying REST query-param fallback.`);
                    try {
                        const fallbackResult = await generateWithRetry(candidate, prompt);
                        text = fallbackResult.response.text();
                        console.info(`REST fallback for ${candidate} succeeded.`);
                        break;
                    } catch (fallbackErr) {
                        console.warn(`REST fallback for ${candidate} failed:`, fallbackErr);
                        lastError = { candidate, err: fallbackErr };
                        continue; // try next candidate
                    }
                }

                // If rate limit or quota (429) or model not found (404), try next candidate
                if (msg && (msg.includes('429') || msg.includes('quota') || msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('resource_exhausted'))) {
                    console.info(`Skipping ${candidate} due to quota/404/429.`);
                    continue; // try next candidate
                }

                // Otherwise, it's an unexpected error - rethrow
                throw err;
            }
        }

        if (!text) {
            console.error('All model candidates failed. Last attempt:', lastError);
            const message = lastError && lastError.err instanceof Error ? lastError.err.message : String(lastError?.err ?? 'Unknown error');
            return NextResponse.json(
                { success: false, message: `Tweet refinement failed. Last attempted model: ${lastError?.candidate ?? 'none'}. Error: ${message}` },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, message: text },
            {
                status: 200,
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ?
                    `Tweet refinement failed: ${error.message}` :
                    'Our tweet refinement service is currently unavailable. Please try again later.'
            },
            {
                status: 500,
            }
        );
    }
}
