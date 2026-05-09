interface FilterBarProps {
  activeType: string;
  onTypeChange: (type: string) => void;
}

const TYPES = [
  { value: "", label: "All" },
  { value: "Placement", label: "Placement" },
  { value: "Result", label: "Result" },
  { value: "Event", label: "Event" },
];

export default function FilterBar({ activeType, onTypeChange }: FilterBarProps) {
  return (
    <div className="filter-chips-row">
      {TYPES.map((t) => {
        const isActive = activeType === t.value;
        const typeClass = t.value ? `type-${t.value.toLowerCase()}` : "";

        return (
          <button
            key={t.value}
            className={`filter-chip ${typeClass} ${isActive ? "active" : ""}`}
            onClick={() => onTypeChange(t.value)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
