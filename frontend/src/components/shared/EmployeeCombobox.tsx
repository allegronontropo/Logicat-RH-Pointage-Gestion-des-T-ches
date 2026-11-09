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
  /** Currently selected employee ID (0 or "" means none selected) */
  value: number | string;
  /** Called with the new employee's id when a selection changes */
  onChange: (id: number) => void;
  employees: EmployeeOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Extra class applied to the trigger button */
  className?: string;
}

export function EmployeeCombobox({
  value,
  onChange,
  employees,
  placeholder = "Choisir un collaborateur...",
  disabled = false,
  className,
}: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedEmployee = employees.find((emp) => emp.id === Number(value));

  const displayLabel = selectedEmployee
    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}${
        selectedEmployee.department ? ` (${selectedEmployee.department})` : ""
      }`
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
            !selectedEmployee && "text-slate-400",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-0">
        <Command
          filter={(value, search) => {
            // value is the data-value we set on CommandItem (name + dept)
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Rechercher un employé..." />
          <CommandList>
            <CommandEmpty>Aucun employé trouvé.</CommandEmpty>
            <CommandGroup>
              {employees.map((emp) => {
                const label = `${emp.firstName} ${emp.lastName}${
                  emp.department ? ` (${emp.department})` : ""
                }`;
                const isSelected = emp.id === Number(value);
                return (
                  <CommandItem
                    key={emp.id}
                    // data-value used by the filter function above
                    value={label}
                    onSelect={() => {
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
