import React, { useState } from 'react';
import type { RandomizationProfile } from '../../types/gif';

interface RandomizeControlsProps {
  currentProfile: RandomizationProfile;
  currentSeed: string;
  isRandomizing: boolean;
  appliedBiases?: string[];
  onRandomize: (profile: RandomizationProfile, seed?: string) => void;
  onProfileChange: (profile: RandomizationProfile) => void;
}

const PROFILES: Array<{ key: RandomizationProfile; label: string; icon: string; desc: string }> = [
  { key: 'BALANCED', label: 'Balanced', icon: '⚖️', desc: 'Adaptive to image features' },
  { key: 'CHAOTIC', label: 'Chaotic', icon: '⚡', desc: 'Intense glitch & kinetic energy' },
  { key: 'CINEMATIC', label: 'Cinematic', icon: '🎬', desc: 'Subtle micro-movement & lighting' },
  { key: 'RETRO_ARCADE', label: 'Retro', icon: '👾', desc: 'Scanlines, VHS & 8-bit hops' },
  { key: 'NATURE_AMBIENT', label: 'Nature', icon: '🍃', desc: 'Serene particles, rain & snow' },
  { key: 'CYBERPUNK', label: 'Cyberpunk', icon: '🤖', desc: 'Neon glows & digital noise' },
];

export const RandomizeControls: React.FC<RandomizeControlsProps> = ({
  currentProfile,
  currentSeed,
  isRandomizing,
  appliedBiases = [],
  onRandomize,
  onProfileChange,
}) => {
  const [customSeed, setCustomSeed] = useState(currentSeed);
  const [showSeedInput, setShowSeedInput] = useState(false);

  const handleHeroClick = () => {
    onRandomize(currentProfile);
  };

  const handleApplyCustomSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSeed.trim()) {
      onRandomize(currentProfile, customSeed.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Prominent RANDOMIZE Button */}
      <button
        type="button"
        id="randomize-hero-button"
        className={`gif-randomize-hero-btn ${isRandomizing ? 'spinning' : ''}`}
        onClick={handleHeroClick}
        disabled={isRandomizing}
        title="Generate New Random Animation (Press R)"
      >
        <span className="dice-icon" style={{ fontSize: 18 }}>🎲</span>
        <span>{isRandomizing ? 'SYNTHESIZING...' : 'RANDOMIZE'}</span>
      </button>

      {/* Style Profile Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gif-text-muted)' }}>
          STYLE PROFILE
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {PROFILES.map((prof) => (
            <button
              key={prof.key}
              type="button"
              onClick={() => onProfileChange(prof.key)}
              className={`gif-overlay-btn ${currentProfile === prof.key ? 'active' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 4px',
                fontSize: 10,
                textAlign: 'center',
              }}
              title={prof.desc}
            >
              <span style={{ fontSize: 14, marginBottom: 2 }}>{prof.icon}</span>
              <span>{prof.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seed Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gif-text-muted)' }}>
            SEED: <span style={{ color: 'var(--gif-text-primary)', fontFamily: 'monospace' }}>{currentSeed}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowSeedInput(!showSeedInput)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gif-accent-purple)',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showSeedInput ? 'CLOSE' : 'EDIT SEED'}
          </button>
        </div>

        {showSeedInput && (
          <form onSubmit={handleApplyCustomSeed} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              placeholder="Enter seed number or text..."
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: 6,
                background: 'var(--gif-bg-elevated)',
                border: '1px solid var(--gif-border)',
                color: '#ffffff',
                fontSize: 11,
                outline: 'none',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--gif-accent-purple)',
                border: 'none',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              APPLY
            </button>
          </form>
        )}
      </div>

      {/* Applied Computer Vision Biases */}
      {appliedBiases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gif-text-muted)' }}>
            DETECTED IMAGE ADAPTATIONS:
          </span>
          {appliedBiases.map((b, idx) => (
            <div
              key={idx}
              style={{
                fontSize: 10,
                color: 'var(--gif-accent-cyan)',
                background: 'rgba(6, 182, 212, 0.08)',
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid rgba(6, 182, 212, 0.2)',
                lineHeight: 1.3,
              }}
            >
              {b}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
