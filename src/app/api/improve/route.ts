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
        // Use the model specified in environment variables
        const modelName = process.env.AI_MODEL || "gemini-1.0-pro";
        let text;
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const res = await generateWithRetry(model, prompt);
            text = res.response.text();
        } catch (modelError) {
            console.error("Model error:", modelError);
            // Fallback to gemini-1.0-pro if the specified model fails
            if (modelName !== "gemini-1.0-pro") {
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
                try {
                    const fallbackRes = await generateWithRetry(fallbackModel, prompt);
                    text = fallbackRes.response.text();
                } catch (fallbackError) {
                    console.error("Fallback model error:", fallbackError);
                    throw fallbackError;
                }
            } else {
                throw modelError;
            }
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