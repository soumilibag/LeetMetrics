import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { generatePortfolioAIOverview } from '../../../lib/groq-api'

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql'

const USER_PUBLIC_PROFILE_QUERY = `query userPublicProfile($username: String!) { matchedUser(username: $username) { username profile { ranking realName userAvatar } } }`
const USER_CONTEST_RANKING_QUERY = `query userContestRankingInfo($username: String!) { userContestRanking(username: $username) { attendedContestsCount rating globalRanking totalParticipants topPercentage } }`
const SKILL_STATS_QUERY = `query skillStats($username: String!) { matchedUser(username: $username) { tagProblemCounts { advanced { tagName tagSlug problemsSolved } intermediate { tagName tagSlug problemsSolved } fundamental { tagName tagSlug problemsSolved } } } }`
const LANGUAGE_STATS_QUERY = `query languageStats($username: String!) { matchedUser(username: $username) { languageProblemCount { languageName problemsSolved } } }`
const RECENT_AC_SUBMISSIONS_QUERY = `query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }`

// NEW: Added to capture the submission graph calendar string
const USER_PROFILE_CALENDAR_QUERY = `
  query userProfileCalendar($username: String!, $year: Int) {
    matchedUser(username: $username) {
      userCalendar(year: $year) {
        submissionCalendar
      }
    }
  }
`

async function makeGraphQLRequest(query: string, variables: any = {}) {
  const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://leetcode.com/',
      'Origin': 'https://leetcode.com/',
    },
    body: JSON.stringify({ query, variables }),
  })
  const result = await response.json()
  if (result.errors) throw new Error(JSON.stringify(result.errors))
  return result.data
}

export async function POST(request: NextRequest) {
  try {
    const { username, forceRefresh } = await request.json()
    if (!username) return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 })

    const lowerUsername = username.toLowerCase().trim()

    if (!forceRefresh) {
      console.log(`\n🕵️‍♂️ Checking Supabase cache for string match: "${lowerUsername}"`)
      
      try {
        const { data: cachedData, error: cacheError } = await supabase
          .from('leetcode_cache') // Verify this matches the exact name in your Supabase table schema
          .select('*')
          .eq('leetcode_username', lowerUsername)
          .maybeSingle();

        if (cacheError) {
          console.error("❌ Supabase Select Read Error Details:", {
            message: cacheError.message,
            details: cacheError.details,
            hint: cacheError.hint,
            code: cacheError.code
          });
        } else if (cachedData) {
          console.log(`📦 CACHE HIT: Found existing row record for: ${lowerUsername}`);
          return NextResponse.json({ success: true, data: cachedData, source: 'database-cache' });
        } else {
          console.log(`📭 CACHE MISS: No readable data row matched in DB for: ${lowerUsername}`);
        }
      } catch (err: any) {
        console.error("💥 Critical exception reading table:", err.message);
      }
    }

    // Parallel fetch including our calendar graph info
    const [profile, contest, skills, languages, submissions, calendar] = await Promise.allSettled([
      makeGraphQLRequest(USER_PUBLIC_PROFILE_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(USER_CONTEST_RANKING_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(SKILL_STATS_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(LANGUAGE_STATS_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(RECENT_AC_SUBMISSIONS_QUERY, { username: lowerUsername, limit: 10 }),
      makeGraphQLRequest(USER_PROFILE_CALENDAR_QUERY, { username: lowerUsername, year: new Date().getFullYear() })
    ])

    const profileVal = profile.status === 'fulfilled' ? profile.value?.matchedUser : null
    if (!profileVal) {
      return NextResponse.json({ success: false, error: 'LeetCode user not found' }, { status: 404 })
    }

    // Temporary data object to send to the AI generation prompt
    const baseCompiled = {
      leetcode_username: lowerUsername,
      user_profile: profileVal,
      contest_ranking: contest.status === 'fulfilled' ? contest.value?.userContestRanking : null,
      tag_stats: skills.status === 'fulfilled' ? skills.value?.matchedUser?.tagProblemCounts : null,
      language_stats: languages.status === 'fulfilled' ? languages.value?.matchedUser?.languageProblemCount : [],
      recent_submissions: submissions.status === 'fulfilled' ? submissions.value?.recentAcSubmissionList : [],
      submission_calendar: calendar.status === 'fulfilled' ? calendar.value?.matchedUser?.userCalendar?.submissionCalendar : "{}"
    }

    // Generate fresh resume summary dynamically
    const aiInsightText = await generatePortfolioAIOverview(baseCompiled);

    const finalData = {
      ...baseCompiled,
      ai_overview: aiInsightText,
      last_synced_at: new Date().toISOString()
    }

    await supabase.from('leetcode_cache').upsert(finalData, { onConflict: 'leetcode_username' })

    return NextResponse.json({ success: true, data: finalData, source: 'live-api' })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}