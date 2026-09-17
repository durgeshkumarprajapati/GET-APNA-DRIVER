'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ExperienceRecommendation } from '@/modules/experience/domain/experience-types';
import { ExperienceCard } from './experience-card';

export function CustomerExperienceSection() {
  const [recommendations, setRecommendations] = useState<ExperienceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExperiences = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/experience');
      const data = await res.json();
      if (res.ok && data.success) {
        setRecommendations(data.experiences || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load personalized recommendations');
      }
    } catch {
      setError('Network error fetching experiences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/customer/experience')
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data.success) {
            setRecommendations(data.experiences || []);
            setError(null);
          } else {
            setError(data.error || 'Failed to load personalized recommendations');
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Network error fetching experiences');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDismiss = async (rec: ExperienceRecommendation) => {
    // Optimistic UI update
    setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
    try {
      await fetch(`/api/customer/experience/${rec.id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: rec.fingerprint,
          type: rec.type,
        }),
      });
    } catch (err) {
      console.error('Failed to dismiss experience:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
            Intelligent Experience Orchestrator
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-[#181c24]/50 border border-[#262a33] animate-pulse p-4"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between text-xs text-[#bccac0]">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void loadExperiences()}
          className="px-2.5 py-1 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[11px]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
          Personalized Actions & Recommendations
        </span>
        <span className="text-[10px] font-mono text-[#87948b]">
          {recommendations.length} Active Signal(s)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {recommendations.map((rec) => (
          <ExperienceCard key={rec.id} recommendation={rec} onDismiss={handleDismiss} />
        ))}
      </div>
    </div>
  );
}
