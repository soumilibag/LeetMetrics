import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql'

// GraphQL Queries covering Profile, Contests, Topics, and Languages
const USER_PUBLIC_PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        realName
        userAvatar
      }
    }
  }
`

const USER_CONTEST_RANKING_QUERY = `
  query userContestRankingInfo($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      totalParticipants
      topPercentage
    }
  }
`

const SKILL_STATS_QUERY = `
  query skillStats($username: String!) {
    matchedUser(username: $username) {
      tagProblemCounts {
        advanced { tagName tagSlug problemsSolved }
        intermediate { tagName tagSlug problemsSolved }
        fundamental { tagName tagSlug problemsSolved }
      }
    }
  }
`

const LANGUAGE_STATS_QUERY = `
  query languageStats($username: String!) {
    matchedUser(username: $username) {
      languageProblemCount { languageName problemsSolved }
    }
  }
`

const RECENT_AC_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id title titleSlug timestamp
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

    // 1. Unless a forced refresh is specified, check the database cache first
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('leetcode_cache')
        .select('*')
        .eq('leetcode_username', lowerUsername)
        .maybeSingle()

      if (cachedData) {
        console.log(`📦 Serving cached data for: ${lowerUsername}`)
        return NextResponse.json({ success: true, data: cachedData, source: 'database-cache' })
      }
    }

    // 2. Fetch all requested fields in parallel from LeetCode
    console.log(`📡 Fetching live data for: ${lowerUsername}`)
    const [profile, contest, skills, languages, submissions] = await Promise.allSettled([
      makeGraphQLRequest(USER_PUBLIC_PROFILE_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(USER_CONTEST_RANKING_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(SKILL_STATS_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(LANGUAGE_STATS_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(RECENT_AC_SUBMISSIONS_QUERY, { username: lowerUsername, limit: 10 })
    ])

    // Validate that the user actually exists on LeetCode
    const profileVal = profile.status === 'fulfilled' ? profile.value?.matchedUser : null
    if (!profileVal) {
      return NextResponse.json({ success: false, error: 'LeetCode user not found' }, { status: 404 })
    }

    const compiledData = {
      leetcode_username: lowerUsername,
      user_profile: profileVal,
      contest_ranking: contest.status === 'fulfilled' ? contest.value?.userContestRanking : null,
      tag_stats: skills.status === 'fulfilled' ? skills.value?.matchedUser?.tagProblemCounts : null,
      language_stats: languages.status === 'fulfilled' ? languages.value?.matchedUser?.languageProblemCount : [],
      recent_submissions: submissions.status === 'fulfilled' ? submissions.value?.recentAcSubmissionList : [],
      last_synced_at: new Date().toISOString()
    }

    // 3. Upsert data into the table (inserts if unseen, updates if existing)
    await supabase.from('leetcode_cache').upsert(compiledData, { onConflict: 'leetcode_username' })

    return NextResponse.json({ success: true, data: compiledData, source: 'live-api' })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}