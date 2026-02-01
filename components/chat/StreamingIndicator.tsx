'use client';

import GlassCard from '@/components/ui/GlassCard';

/**
 * Loading/streaming indicator component
 * Displays while AI is generating a response
 */
export default function StreamingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <GlassCard variant="elevated" className="px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-100" />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-200" />
          </div>
          <span className="text-sm text-gray-300">Hieren is thinking...</span>
        </div>
      </GlassCard>
    </div>
  );
}
