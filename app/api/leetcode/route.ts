import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase' // Assumes your supabase client is configured

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql'

// Define the GraphQL Queries (Keep these short and clean)
const USER_PUBLIC_PROFILE_QUERY = `query userPublicProfile($username: String!) { matchedUser(username: $username) { username profile { ranking realName userAvatar } } }`
const LANGUAGE_STATS_QUERY = `query languageStats($username: String!) { matchedUser(username: $username) { languageProblemCount { languageName problemsSolved } } }`
const RECENT_AC_SUBMISSIONS_QUERY = `query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }`

async function makeGraphQLRequest(query: string, variables: any = {}) {
  const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://leetcode.com/',
      'Origin': 'https://leetcode.com',
    },
    body: JSON.stringify({ query, variables }),
  })
  const result = await response.json()
  if (result.errors) throw new Error(JSON.stringify(result.errors))
  return result.data
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username) return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 })

    const lowerUsername = username.toLowerCase().trim()

    // 1. CHECK THE CACHE DATABASE FIRST
    const { data: cachedData } = await supabase
      .from('leetcode_cache')
      .select('*')
      .eq('leetcode_username', lowerUsername)
      .single()

    // If cached within the last 15 minutes, return it directly to save time/rate-limits
    if (cachedData) {
      const cacheAge = Date.now() - new Date(cachedData.last_synced_at).getTime()
      if (cacheAge < 15 * 60 * 1000) {
        console.log('📦 Serving from database cache!')
        return NextResponse.json({ success: true, data: cachedData, source: 'database-cache' })
      }
    }

    console.log('📡 Fetching fresh data from LeetCode API...')
    const [profile, languages, submissions] = await Promise.allSettled([
      makeGraphQLRequest(USER_PUBLIC_PROFILE_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(LANGUAGE_STATS_QUERY, { username: lowerUsername }),
      makeGraphQLRequest(RECENT_AC_SUBMISSIONS_QUERY, { username: lowerUsername, limit: 10 })
    ])

    const compiledData = {
      leetcode_username: lowerUsername,
      user_profile: profile.status === 'fulfilled' ? profile.value?.matchedUser : null,
      language_stats: languages.status === 'fulfilled' ? languages.value?.matchedUser?.languageProblemCount : [],
      recent_submissions: submissions.status === 'fulfilled' ? submissions.value?.recentAcSubmissionList : [],
      last_synced_at: new Date().toISOString()
    }

    // 2. SAVE OR UPDATE THE CACHE IN THE DATABASE
    await supabase.from('leetcode_cache').upsert(compiledData, { onConflict: 'leetcode_username' })

    return NextResponse.json({ success: true, data: compiledData, source: 'real-api' })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}