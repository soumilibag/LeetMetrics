import Groq from 'groq-sdk';

// Initialize Groq securely using your system environment keys
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generatePortfolioAIOverview(profileData: any): Promise<string> {
  try {
    // Safety check to ensure your key configuration exists locally
    if (!process.env.GROQ_API_KEY) {
      console.error("❌ Error: GROQ_API_KEY is missing from your environment setup.");
      return "AI overview unavailable: Configuration token missing.";
    }

    const prompt = `
Analyze my LeetCode profile statistics and write a concise, professional report suitable for my portfolio or resume.

Profile Raw Data Snapshot:
- Username: ${profileData.leetcode_username}
- Global Rank: ${profileData.user_profile?.profile?.ranking || 'N/A'}
- Contest Rating: ${profileData.contest_ranking?.rating || 'No rated contests'}
- Global Contest Rank: ${profileData.contest_ranking?.globalRanking || 'N/A'}
- Top Percentile: ${profileData.contest_ranking?.topPercentage || 'N/A'}
- Languages Used: ${JSON.stringify(profileData.language_stats || [])}
- Topics Solved Count: ${JSON.stringify(profileData.tag_stats || {})}

Guidelines:
1. Start with a 2–3 sentence overall assessment describing what the profile reflects about my skills and consistency. Do not simply repeat statistics.
2. Then provide 5–7 short bullet points, where each bullet is a complete sentence (not just a heading followed by a phrase).
3. Focus on what the data implies, rather than listing numbers. For example, instead of saying "351 problems solved," say "Demonstrates consistent problem-solving across a broad range of DSA topics."
4. Highlight strengths such as consistency, topic coverage, technical depth, progression, language proficiency, or contest performance—whichever is relevant to the profile.
5. Avoid generic praise or exaggerated claims. Every statement should be supported by the profile.
6. Mention statistics only if they add context, and weave them naturally into the sentence instead of making them the focus.
7. Keep the tone professional, concise, ATS-friendly, and suitable for a portfolio README.
8. Do not include recommendations or areas for improvement.
9. The final output should be under 180 words.

Return the text cleanly. Do not wrap the response inside json or markdown code block characters.
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 600,
    });

    return completion.choices[0]?.message?.content || "AI summary layout empty.";
  } catch (error: any) {
    // Log the exact error directly into your terminal so you can trace it
    console.error("❌ Groq Request Error Details:", error);
    return `Profile analysis generation failed: ${error.message || 'Unknown network error'}`;
  }
}