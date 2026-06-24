import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Search, Check } from "lucide-react";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: FilterOption[];
  value: string | null;
  onSelect: (id: string | null) => void;
  searchPlaceholder?: string;
}

export function FilterDropdown({
  label,
  icon,
  options,
  value,
  onSelect,
  searchPlaceholder = "Search…",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = value ? options.find(o => o.id === value) : null;
  const isActive = !!value;

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const showSearch = options.length > 6;
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-medium transition-colors ${
          isActive
            ? "bg-[#9000FF]/10 text-[#9000FF] font-semibold"
            : open
            ? "bg-[#E5EAF0] text-[#212833]"
            : "bg-[#F0F4F8] text-[#5E687B] hover:bg-[#E5EAF0] hover:text-[#212833]"
        }`}
      >
        {isActive ? (
          <>
            <span className="max-w-[120px] truncate">
              <span className="opacity-60">{label}:</span>{" "}
              {selectedOption?.label ?? value}
            </span>
            <span
              role="button"
              tabIndex={-1}
              onClick={e => {
                e.stopPropagation();
                onSelect(null);
                setOpen(false);
              }}
              className="ml-0.5 opacity-60 hover:opacity-100"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          </>
        ) : (
          <>
            {icon}
            <span>{label}</span>
            <ChevronDown className={`w-2.5 h-2.5 opacity-40 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E5EAF0] rounded-xl shadow-lg w-56 py-1.5 overflow-hidden">
          {showSearch && (
            <div className="px-2 pb-1.5 pt-0.5">
              <div className="flex items-center gap-1.5 bg-[#F0F4F8] rounded-lg px-2 py-1">
                <Search className="w-3 h-3 text-[#9E9FAE] shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="flex-1 text-[11px] bg-transparent outline-none text-[#212833] placeholder:text-[#9E9FAE]"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-[#9E9FAE] hover:text-[#5E687B]">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-[#9E9FAE] text-center">No results</div>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onSelect(isSelected ? null : opt.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors ${
                      isSelected
                        ? "bg-[#F5F3FF] text-[#9000FF] font-semibold"
                        : "text-[#212833] hover:bg-[#F0F4F8]"
                    }`}
                  >
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {opt.count !== undefined && (
                      <span className={`text-[10px] ${isSelected ? "text-[#9000FF]/70" : "text-[#9E9FAE]"}`}>
                        {opt.count}
                      </span>
                    )}
                    {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
