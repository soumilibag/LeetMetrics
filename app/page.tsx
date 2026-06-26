'use client';
import { useState } from 'react';

export default function Home() {
  const [username, setUsername] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        alert(result.error || "User not found");
      }
    } catch (err) {
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-500">LeetLoop DSA Tracker</h1>
        
        <form onSubmit={handleSearch} className="flex gap-4 mb-8">
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Type LeetCode Username (e.g., nirmalpat3l)" 
            className="flex-1 bg-gray-900 border border-gray-800 p-3 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold transition">
            {loading ? 'Searching...' : 'Track Profile'}
          </button>
        </form>

        {data && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <img 
                src={data.user_profile?.profile?.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg"} 
                className="w-16 h-16 rounded-full border border-gray-700" 
                alt="Avatar"
              />
              <div>
                <h2 className="text-2xl font-bold">{data.user_profile?.profile?.realName || data.leetcode_username}</h2>
                <p className="text-gray-400">Global Rank: #{data.user_profile?.profile?.ranking?.toLocaleString() || 'N/A'}</p>
                <p className="text-xs text-gray-500">Data Source: {data.last_synced_at ? 'Cached' : 'Live API'}</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3 border-b border-gray-800 pb-2 text-blue-400">Languages Used</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {data.language_stats?.map((lang: any) => (
                <div key={lang.languageName} className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                  <span className="text-gray-400">{lang.languageName}:</span> <span className="font-bold text-green-400">{lang.problemsSolved} Solved</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold mb-3 border-b border-gray-800 pb-2 text-blue-400">Recent Solved Submissions</h3>
            <ul className="space-y-2">
              {data.recent_submissions?.map((sub: any) => (
                <li key={sub.id} className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex justify-between text-sm">
                  <span className="font-medium text-gray-200">{sub.title}</span>
                  <span className="text-gray-500">{new Date(parseInt(sub.timestamp) * 1000).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}