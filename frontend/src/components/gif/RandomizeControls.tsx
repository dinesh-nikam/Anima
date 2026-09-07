import React, { useState } from 'react';
import type { RandomizationProfile } from '../../types/gif';
import { ConsoleButton, TickLabel } from '../ui/primitives';

interface RandomizeControlsProps {
  currentProfile: RandomizationProfile;
  currentSeed: string;
  isRandomizing: boolean;
  appliedBiases?: string[];
  onRandomize: (profile: RandomizationProfile, seed?: string) => void;
  onProfileChange: (profile: RandomizationProfile) => void;
}

const PROFILES: Array<{ key: RandomizationProfile; label: string; desc: string }> = [
  { key: 'BALANCED', label: 'Balanced', desc: 'Adaptive to image features' },
  { key: 'CHAOTIC', label: 'Chaotic', desc: 'Intense glitch & kinetic energy' },
  { key: 'CINEMATIC', label: 'Cinematic', desc: 'Subtle micro-movement & lighting' },
  { key: 'RETRO_ARCADE', label: 'Retro', desc: 'Scanlines, VHS & 8-bit hops' },
  { key: 'NATURE_AMBIENT', label: 'Nature', desc: 'Serene particles, rain & snow' },
  { key: 'CYBERPUNK', label: 'Cyberpunk', desc: 'Neon glows & digital noise' },
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
    <div className="flex flex-col gap-3 p-3 bg-carbon-800 border border-console-700 rounded-panel">
      {/* Prominent RANDOMIZE Button — scanline anchor */}
      <div className="scanline rounded-tick overflow-hidden">
        <button
          type="button"
          id="randomize-hero-button"
          className={`gif-randomize-hero-btn w-full ${isRandomizing ? 'spinning' : ''}`}
          onClick={handleHeroClick}
          disabled={isRandomizing}
          title="Generate New Random Animation (Press R)"
        >
          <span className="dice-icon text-[14px]" aria-hidden="true">◆</span>
          <span>{isRandomizing ? 'SYNTHESIZING...' : 'RANDOMIZE'}</span>
        </button>
      </div>

      {/* Style Profile Selector */}
      <div className="flex flex-col gap-1.5">
        <TickLabel>STYLE PROFILE</TickLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {PROFILES.map((prof) => (
            <button
              key={prof.key}
              type="button"
              onClick={() => onProfileChange(prof.key)}
              className={`gif-overlay-btn flex flex-col items-center py-1.5 px-1 text-center ${currentProfile === prof.key ? 'active' : ''}`}
              title={prof.desc}
            >
              <span className="font-mono text-[10px] font-bold tracking-wide">{prof.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tick-divider" />

      {/* Seed Controls */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <TickLabel>SEED: <span className="text-console-100 font-mono normal-case tracking-normal">{currentSeed}</span></TickLabel>
          <button
            type="button"
            onClick={() => setShowSeedInput(!showSeedInput)}
            className="font-mono text-[10px] font-bold tracking-widest uppercase text-signal-500 hover:text-signal-400 transition-colors"
          >
            {showSeedInput ? 'CLOSE' : 'EDIT SEED'}
          </button>
        </div>

        {showSeedInput && (
          <form onSubmit={handleApplyCustomSeed} className="flex gap-1.5">
            <input
              type="text"
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              placeholder="Enter seed..."
              className="flex-1 px-2 py-1.5 rounded-tick bg-carbon-900 border border-console-600 text-console-100 font-mono text-xs outline-none focus:border-signal-600"
            />
            <ConsoleButton variant="primary" type="submit" className="px-3 py-1.5 text-[10px]">
              APPLY
            </ConsoleButton>
          </form>
        )}
      </div>

      {/* Applied Computer Vision Biases */}
      {appliedBiases.length > 0 && (
        <>
          <div className="tick-divider" />
          <div className="flex flex-col gap-1">
            <TickLabel>DETECTED ADAPTATIONS</TickLabel>
            {appliedBiases.map((b, idx) => (
              <div
                key={idx}
                className="font-mono text-[10px] leading-relaxed text-signal-500 bg-signal-500/5 px-2 py-1.5 rounded-tick border border-signal-500/20"
              >
                {b}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
