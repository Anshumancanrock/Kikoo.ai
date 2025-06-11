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
        4. Validate against all constraints before outputting`        // Use the model specified in environment variables
        const modelName = process.env.AI_MODEL || "gemini-1.0-pro";
        let text;
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await generateWithRetry(model, prompt);
            text = result.response.text();
        } catch (modelError) {
            console.error("Model error:", modelError);
            // Fallback to gemini-1.0-pro if the specified model fails
            if (modelName !== "gemini-1.0-pro") {
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
                try {
                    const fallbackResult = await generateWithRetry(fallbackModel, prompt);
                    text = fallbackResult.response.text();
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
                    `Tweet refinement failed: ${error.message}` :
                    'Our tweet refinement service is currently unavailable. Please try again later.'
            },
            {
                status: 500,
            }
        );
    }
}
