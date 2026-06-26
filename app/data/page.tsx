'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DataDisplay() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Show/Hide expansion states for topic tags
  const [showAllAdvanced, setShowAllAdvanced] = useState(false);
  const [showAllIntermediate, setShowAllIntermediate] = useState(false);
  const [showAllFundamental, setShowAllFundamental] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem('tracked_leetcode_data');
    if (!storedData) {
      router.push('/');
    } else {
      setData(JSON.parse(storedData));
    }
  }, [router]);

  const handleRefresh = async () => {
    if (!data?.leetcode_username) return;
    setLoading(true);
    try {
      const res = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.leetcode_username, forceRefresh: true })
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        sessionStorage.setItem('tracked_leetcode_data', JSON.stringify(result.data));
      } else {
        alert(result.error || "Failed to refresh statistics row.");
      }
    } catch (err) {
      alert("Sync connection error.");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex justify-center items-center">
        <p className="text-gray-400">Loading metrics dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Action Row */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => router.push('/')} 
            className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            ← Search Another Profile
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            {loading ? 'Syncing...' : '🔄 Force Sync Refresh'}
          </button>
        </div>

        {/* Header Identity Box */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
          <img 
            src={data.user_profile?.profile?.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg"} 
            className="w-16 h-16 rounded-full border border-gray-700"
            alt="Avatar"
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-100">{data.user_profile?.profile?.realName || data.leetcode_username}</h2>
            <p className="text-gray-400 text-sm">Global Profile Rank: #{data.user_profile?.profile?.ranking?.toLocaleString() || 'N/A'}</p>
            <p className="text-xs text-gray-500 mt-1">Last Synced: {new Date(data.last_synced_at).toLocaleString()}</p>
          </div>
        </div>

        {/* NEW: AI Overview Section */}
        {data.ai_overview && (
          <div className="bg-gradient-to-br from-blue-950/40 to-gray-900 border border-blue-900/60 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold text-blue-400 mb-3 flex items-center gap-2">
              ✨ AI Overview of Profile
            </h3>
            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-line bg-gray-950/40 p-4 rounded-xl border border-gray-800/60">
              {data.ai_overview}
            </div>
          </div>
        )}

        {/* Contest Performance Section (Total Contestants Removed) */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-800 pb-2">🏆 Contest Performance</h3>
          {data.contest_ranking ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
                <p className="text-gray-400 text-xs uppercase font-semibold">Contest Rating</p>
                <p className="text-2xl font-black text-yellow-500 mt-1">{Math.round(data.contest_ranking.rating)}</p>
              </div>
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
                <p className="text-gray-400 text-xs uppercase font-semibold">Global Contest Rank</p>
                <p className="text-2xl font-black text-green-400 mt-1">#{data.contest_ranking.globalRanking?.toLocaleString()}</p>
              </div>
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
                <p className="text-gray-400 text-xs uppercase font-semibold">Top Percentile</p>
                <p className="text-2xl font-black text-blue-400 mt-1">{data.contest_ranking.topPercentage}%</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">User has not participated in rated LeetCode contests yet.</p>
          )}
        </div>

        {/* Language Volume */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-800 pb-2">💻 Languages Solved</h3>
          <div className="flex flex-wrap gap-3">
            {data.language_stats?.length > 0 ? (
              // Sort languages by problems solved descending
              [...data.language_stats]
                .sort((a: any, b: any) => b.problemsSolved - a.problemsSolved)
                .map((lang: any) => (
                  <div key={lang.languageName} className="bg-gray-950 px-4 py-2 rounded-xl border border-gray-800 text-sm">
                    <span className="text-gray-400 font-medium">{lang.languageName}:</span> 
                    <span className="text-emerald-400 font-bold ml-1">{lang.problemsSolved}</span>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-sm">No language tracking data found.</p>
            )}
          </div>
        </div>

        {/* Topic Specific Breakdown with Sorting and Show More/Less rules */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-800 pb-2">📊 Tag & Topic Problem Counts</h3>
          {data.tag_stats ? (
            <div className="space-y-6">
              {[
                { level: 'advanced', showAll: showAllAdvanced, toggle: setShowAllAdvanced },
                { level: 'intermediate', showAll: showAllIntermediate, toggle: setShowAllIntermediate },
                { level: 'fundamental', showAll: showAllFundamental, toggle: setShowAllFundamental }
              ].map(({ level, showAll, toggle }) => {
                const rawTopics = data.tag_stats[level] || [];
                if (rawTopics.length === 0) return null;

                // Sort topics in decreasing order (highest count first)
                const sortedTopics = [...rawTopics].sort((a: any, b: any) => b.problemsSolved - a.problemsSolved);
                
                // Determine whether to display all elements or slice down to only the top 3
                const displayedTopics = showAll ? sortedTopics : sortedTopics.slice(0, 3);

                return (
                  <div key={level} className="border-b border-gray-800/40 pb-4 last:border-none">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{level} Topics</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {displayedTopics.map((topic: any) => (
                        <div key={topic.tagSlug} className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
                          <span className="text-gray-300 font-medium truncate mr-2">{topic.tagName}</span>
                          <span className="bg-blue-950/50 border border-blue-900 text-blue-400 font-bold px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                            {topic.problemsSolved}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Show More / Show Less control block */}
                    {sortedTopics.length > 3 && (
                      <button
                        onClick={() => toggle(!showAll)}
                        className="text-xs text-blue-500 hover:text-blue-400 font-semibold mt-3 transition focus:outline-none"
                      >
                        {showAll ? 'Show Less ↑' : `Show More (+${sortedTopics.length - 3}) ↓`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No advanced data available.</p>
          )}
        </div>

      </div>
    </div>
  );
}