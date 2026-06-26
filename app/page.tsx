'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export default function Home() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, forceRefresh: false })
      });
      const result = await res.json();
      
      if (result.success) {
        sessionStorage.setItem('tracked_leetcode_data', JSON.stringify(result.data));
        router.push('/data');
      } else {
        alert(result.error || "Failed to locate profile.");
      }
    } catch (err) {
      alert("Network error connecting to tracking service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col justify-center items-center p-6 font-sans relative transition-colors duration-300">
      {/* Global Top-Right Utility Bar */}
      <div className="absolute top-6 right-6">
        <ThemeSwitcher />
      </div>

      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-extrabold text-blue-500 mb-4">LeetMetrics</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Enter any public LeetCode username to cache and visualize stats.</p>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Type LeetCode username..." 
            className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 text-center text-lg text-gray-900 dark:text-white"
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-lg text-white"
          >
            {loading ? 'Searching Profile...' : 'Track Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}