'use client';
import { useState } from 'react';

export default function Home() {
  const [username, setUsername] = useState('');
  const [activeUser, setActiveUser] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async (targetUsername: string, forceRefresh = false) => {
    if (!targetUsername) return;
    setLoading(true);
    try {
      const res = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername, forceRefresh })
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setActiveUser(targetUsername);
      } else {
        alert(result.error || "Failed to load profile.");
      }
    } catch (err) {
      alert("Network error capturing data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProfile(username, false);
  };

  const handleRefresh = () => {
    fetchProfile(activeUser, true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold text-center text-blue-500 mb-8">LeetLoop Public Tracker</h1>

        {/* Input Search Block */}
        <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-8">
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter LeetCode username..." 
            className="flex-1 bg-gray-900 border border-gray-800 p-3 rounded-xl focus:outline-none focus:border-blue-500 text-white"
          />
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 py-3 rounded-xl transition disabled:opacity-50">
            {loading && !activeUser ? 'Tracking...' : 'Search'}
          </button>
        </form>

        {data && (
          <div className="space-y-6">
            {/* Header Identity Row & Live Refresh Control */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <img 
                  src={data.user_profile?.profile?.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg"} 
                  className="w-16 h-16 rounded-full border border-gray-700"
                  alt="Avatar"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">{data.user_profile?.profile?.realName || data.leetcode_username}</h2>
                  <p className="text-gray-400 text-sm">Global Profile Rank: #{data.user_profile?.profile?.ranking?.toLocaleString() || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-1">Last Cached sync: {new Date(data.last_synced_at).toLocaleString()}</p>
                </div>
              </div>
              <button 
                onClick={handleRefresh} 
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : '🔄 Force Sync Refresh'}
              </button>
            </div>

            {/* Contest Stats Section */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-800 pb-2">🏆 Contest Dashboard Performance</h3>
              {data.contest_ranking ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-400 text-xs uppercase font-semibold">Contest Rating</p>
                    <p className="text-2xl font-black text-yellow-500 mt-1">{Math.round(data.contest_ranking.rating)}</p>
                  </div>
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-400 text-xs uppercase font-semibold">Global Contest Rank</p>
                    <p className="text-2xl font-black text-green-400 mt-1">#{data.contest_ranking.globalRanking?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-400 text-xs uppercase font-semibold">Total Contestants</p>
                    <p className="text-2xl font-black text-purple-400 mt-1">{data.contest_ranking.totalParticipants?.toLocaleString()}</p>
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

            {/* Language Breakdown */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-800 pb-2">💻 Languages Solved</h3>
              <div className="flex flex-wrap gap-3">
                {data.language_stats?.length > 0 ? (
                  data.language_stats.map((lang: any) => (
                    <div key={lang.languageName} className="bg-gray-950 px-4 py-2 rounded-xl border border-gray-800 text-sm">
                      <span className="text-gray-400 font-medium">{lang.languageName}:</span> <span className="text-emerald-400 font-bold ml-1">{lang.problemsSolved}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No recorded language volume data available.</p>
                )}
              </div>
            </div>

            {/* Advanced / Intermediate / Fundamental Topics Breakdown */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-800 pb-2">📊 Tag & Topic Problem Counts</h3>
              {data.tag_stats ? (
                <div className="space-y-6">
                  {['advanced', 'intermediate', 'fundamental'].map((level) => {
                    const topics = data.tag_stats[level] || [];
                    if (topics.length === 0) return null;
                    return (
                      <div key={level}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 mt-2">{level} Topics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {topics.map((topic: any) => (
                            <div key={topic.tagSlug} className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
                              <span className="text-gray-300 font-medium truncate mr-2">{topic.tagName}</span>
                              <span className="bg-blue-950/50 border border-blue-900 text-blue-400 font-bold px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                                {topic.problemsSolved}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No specialized topic stats available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}