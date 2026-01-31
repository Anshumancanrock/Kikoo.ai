import { genAI, generateWithRetry } from '@/lib/genAI';
import { NextResponse } from 'next/server';
// Removed unused imports: getServerSession, authOptions, prisma

export async function POST(req: Request) {    const { tweet, result, improvePrompt } = await req.json();
    // Removed session variable since it's not being used
    // Removed IP tracking and credit limit checks - allowing unlimited use

    const prompt = `You are a tweet EDITOR executing specific user-requested changes. Follow these rules:

    [CRITICAL RULES]
    1. MAKE ONLY REQUESTED CHANGES: Never modify unmentioned aspects
    2. PRESERVE EXISTING STRUCTURE: Keep intact what user hasn't specified to change
    3. STRICT INSTRUCTION ADHERENCE: Implement ${improvePrompt} exactly
    4. NO NEW CONTENT: Never add emojis, hashtags, or unsolicited ideas
    5. LENGTH CAP: Absolute maximum 270 characters
    6. If the user provides you with a tweet, your task is to refine it, not comment on it or make it longer than the original tweet.

    [CONTEXT]
    Original: "${tweet}"
    Previous Version: "${result}"
    User's Exact Request: "${improvePrompt}"

    [REQUIRED PROCESS]
    1. Compare previous version and user request
    2. Identify SPECIFIC elements to change/keep
    3. Apply ONLY requested modifications
    4. Preserve unrelated aspects from previous version
    5. Validate against all rules before output

    [BAD EXAMPLE]
    User Request: "Make it shorter"
    Bad Change: Added more words "Leverage blockchain AI synergies" (new concept)
    Good Change: Make it shorter and if possible try to match the length with the original tweet

    [OUTPUT REQUIREMENTS]
    - Maintain previous version's line breaks/formatting
    - Keep unchanged portions verbatim where possible
    - Make minimal alterations to fulfill request
    - Use only vocabulary from existing versions unless instructed

    [VALIDATION CHECKLIST]
    Before responding, verify:
    ☑ Changes match EXACTLY what user requested if short then ensure it has lesser words then previous response
    ☑ Unrelated content remains identical
    ☑ No new concepts/terms added
    ☑ Length under 270 chars
    ☑ No emojis/hashtags

    Refined version (ONLY OUTPUT THIS):`

    try {
        // Prefer models that are cheaper / more generous with free tier. Allow overriding with AI_MODEL or AI_MODEL_PREFERENCES (comma-separated list)
        const defaultPreferences = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
        const envPref = process.env.AI_MODEL_PREFERENCES || process.env.AI_MODEL || '';
        const prefs = envPref ? envPref.split(',').map(s => s.replace(/^models\//, '').trim()).filter(Boolean) : defaultPreferences;

        let text: string | undefined;
        let lastError: unknown = null;

        for (const candidate of prefs) {
            try {
                const model = genAI.getGenerativeModel({ model: candidate });
                const result = await generateWithRetry(model, prompt);
                text = result.response.text();
                // Success - break out
                break;
            } catch (err) {
                console.warn(`Model ${candidate} failed:`, err);
                lastError = err;

                const msg = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : String(err);

                // If auth type unsupported, try REST query-param fallback (API key) for this candidate
                if (msg && (msg.includes('401') || msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') || msg.toLowerCase().includes('invalid authentication'))) {
                    try {
                        const fallbackRes = await generateWithRetry(candidate, prompt);
                        text = fallbackRes.response.text();
                        break;
                    } catch (fallbackErr) {
                        console.warn(`REST fallback for ${candidate} failed:`, fallbackErr);
                        lastError = fallbackErr;
                        continue; // try next candidate
                    }
                }

                // If rate limit or quota (429) or model not found (404), try next candidate
                if (msg && (msg.includes('429') || msg.includes('quota') || msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('resource_exhausted'))) {
                    continue; // try next candidate
                }

                // Otherwise, it's an unexpected error - rethrow
                throw err;
            }
        }

        if (!text) {
            console.error('All model candidates failed. Last error:', lastError);
            const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown error');
            return NextResponse.json(
                { success: false, message: `Tweet refinement failed: ${message}` },
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
                    `Tweet improvement failed: ${error.message}` :
                    'Our tweet improvement service is currently unavailable. Please try again later.'
            },
            {
                status: 500,
            }
        );
    }

}