import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface DepartmentComboboxProps {
  /** Currently selected department name, or "ALL" / "" for no filter */
  value: string;
  /** Called with the new department name, or "" when "all" is selected */
  onChange: (dept: string) => void;
  /** List of department name strings to display */
  departments: string[];
  /** Label shown when no specific department is selected */
  allOptionLabel?: string;
  /** Extra class applied to the trigger button */
  className?: string;
  disabled?: boolean;
}

export function DepartmentCombobox({
  value,
  onChange,
  departments,
  allOptionLabel = "Tous les départements",
  className,
  disabled = false,
}: DepartmentComboboxProps) {
  const [open, setOpen] = useState(false);

  const isAllSelected = !value || value === "ALL";
  const displayLabel = isAllSelected ? allOptionLabel : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0">
        <Command
          filter={(itemValue, search) => {
            if (!search.trim()) return 1;
            if (itemValue.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Rechercher un département..." />
          <CommandList>
            <CommandEmpty>Aucun département trouvé.</CommandEmpty>
            <CommandGroup>
              {/* "All" option */}
              <CommandItem
                key="__all__"
                value={allOptionLabel}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-3.5 w-3.5 text-primary",
                    isAllSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="font-medium text-slate-800">{allOptionLabel}</span>
              </CommandItem>

              {/* Department options */}
              {departments.map((dept) => (
                <CommandItem
                  key={dept}
                  value={dept}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(dept);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5 text-primary",
                      value === dept ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{dept}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
