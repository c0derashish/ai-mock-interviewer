import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CategorySelect({
  value,
  onChange,
  options,
  placeholder = "Select Category",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="
          w-full
          flex
          items-center
          justify-between
          px-3
          py-2
          rounded-lg
          border
          text-sm
          font-mono
          text-text
          border-accent
          bg-accent/10
          transition-all
        "
      >
        <span>
          {value || (
            <span className="text-text-dim">
              {placeholder}
            </span>
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="
            absolute
            left-0
            right-0
            mt-2
            rounded-xl
            border
            border-border
            bg-surface
            shadow-2xl
            overflow-hidden
            z-50
            animate-in
            fade-in
            zoom-in-95
          "
        >
          <div className="max-h-72 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`
                  w-full
                  text-left
                  px-3
                  py-2
                  text-sm
                  font-mono
                  transition-all
                  ${
                    value === option
                      ? 'border-accent bg-accent/40 text-text'
                      : 'border-border hover:bg-accent/10 text-text-dim'
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}