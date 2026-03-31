const LevelSelector = ({ selectedLevel, onSelect }) => {
  const { levelProfiles } = window.Collections;

  const levelOrder = ['e', 'm', 's', 'b', 'u', 'c', 'n', 'i', 'clat_e'];

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {levelOrder.map((key) => {
        const profile = levelProfiles[key];
        if (!profile) return null;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`px-6 py-3 rounded-xl font-bold transition-all border ${
              selectedLevel === key
                ? 'bg-[#7c6af7] border-[#7c6af7] text-white shadow-[0_0_15px_rgba(124,106,247,0.4)]'
                : 'bg-[#1a1a2e] border-white/5 text-[#888] hover:border-white/20 hover:text-white'
            }`}
          >
            {profile.name}
          </button>
        );
      })}
    </div>
  );
};
window.LevelSelector = LevelSelector;
