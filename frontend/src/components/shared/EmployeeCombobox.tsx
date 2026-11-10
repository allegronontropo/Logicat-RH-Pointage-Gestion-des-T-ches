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

export interface EmployeeOption {
  /** The ID that gets stored in the form (employee_profile.id or employee_id) */
  id: number;
  firstName: string;
  lastName: string;
  department?: string;
}

interface EmployeeComboboxProps {
  /** Currently selected employee ID (0, "ALL", "", or null means none/all selected) */
  value?: number | string | null;
  /** Called with the new employee's id (or null when 'Tous les collaborateurs' is selected) */
  onChange: (id: any) => void;
  employees: EmployeeOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Extra class applied to the trigger button */
  className?: string;
  /** If true, renders a "Tous les collaborateurs" item at the top */
  showAllOption?: boolean;
  /** Custom label for the all option (defaults to "Tous les collaborateurs") */
  allOptionLabel?: string;
}

export function EmployeeCombobox({
  value,
  onChange,
  employees,
  placeholder = "Choisir un collaborateur...",
  disabled = false,
  className,
  showAllOption = false,
  allOptionLabel = "Tous les collaborateurs",
}: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false);

  const isAllSelected = !value || value === "ALL" || value === 0 || value === "0";
  const selectedEmployee = !isAllSelected
    ? employees.find((emp) => emp.id === Number(value))
    : null;

  const displayLabel = selectedEmployee
    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}${
        selectedEmployee.department ? ` (${selectedEmployee.department})` : ""
      }`
    : showAllOption
    ? allOptionLabel
    : placeholder;

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
            !selectedEmployee && !showAllOption && "text-slate-400",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0">
        <Command
          filter={(itemValue, search) => {
            if (!search.trim()) return 1;
            if (itemValue.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Rechercher un employé..." />
          <CommandList>
            <CommandEmpty>Aucun employé trouvé.</CommandEmpty>
            <CommandGroup>
              {/* "All" option */}
              {showAllOption && (
                <CommandItem
                  key="all"
                  value={allOptionLabel}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(null);
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
              )}

              {/* Employee options */}
              {employees.map((emp) => {
                const searchValue = `${emp.firstName} ${emp.lastName} ${emp.department ?? ""}`;
                const isSelected = selectedEmployee?.id === emp.id;
                return (
                  <CommandItem
                    key={emp.id}
                    value={searchValue}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(emp.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5 text-primary",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {emp.firstName} {emp.lastName}
                      </span>
                      {emp.department && (
                        <span className="text-[10px] text-slate-400 truncate">
                          {emp.department}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
