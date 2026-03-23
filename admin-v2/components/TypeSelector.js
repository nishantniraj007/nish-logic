const typeNames = {
  qa: 'Quant',
  lr: 'Logic',
  sgk: 'Static GK',
  ca: 'Current Affairs',
  eng: 'English',
  comp: 'Computer',
  phy: 'Physics',
  chem: 'Chemistry',
  bio: 'Biology',
  mat: 'Math'
};

const TypeSelector = ({ level, selectedType, onSelect }) => {
  const { levelTypeMap } = window.Collections;
  const types = levelTypeMap[level] || [];

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {types.map((type) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={`px-6 py-3 rounded-xl font-bold transition-all border ${
            selectedType === type
              ? 'bg-[#6af7a2] border-[#6af7a2] text-black shadow-[0_0_15px_rgba(106,247,162,0.4)]'
              : 'bg-[#1a1a2e] border-white/5 text-[#888] hover:border-white/20 hover:text-white'
          }`}
        >
          {typeNames[type] || type.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

window.TypeSelector = TypeSelector;
