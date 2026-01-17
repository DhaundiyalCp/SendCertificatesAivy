'use client';

import { useState, useEffect } from 'react';

export function TokenDisplay() {
    const [tokens, setTokens] = useState<number | null>(null);

    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const response = await fetch('/api/tokens');
                if (response.ok) {
                    const data = await response.json();
                    setTokens(data.tokens);
                }
            } catch (error) {
                console.error('Error fetching tokens:', error);
            }
        };

        fetchTokens();

        // Optional: Refresh tokens periodically or listen for events
        const interval = setInterval(fetchTokens, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (tokens === null) return null;

    return (
        <div className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{tokens} Tokens</span>
        </div>
    );
}
