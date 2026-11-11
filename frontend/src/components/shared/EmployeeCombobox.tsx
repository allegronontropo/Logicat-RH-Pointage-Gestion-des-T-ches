import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface EmployeeOption {
  id: number | string;
  firstName: string;
  lastName: string;
  department?: string | null;
}

export function EmployeeCombobox({ employees = [], value, onChange, showAllOption = true, className }: {
  employees?: EmployeeOption[];
  value?: number | string | null;
  onChange: (id: any) => void;
  showAllOption?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false)
  const selectedEmployee = employees.find((emp: any) => String(emp.id) === String(value))

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50/70 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary",
            className
          )}
        >
          <span className="truncate">
            {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : "Tous les collaborateurs"}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un employé..." />
          <CommandList>
            <CommandEmpty>Aucun employé trouvé.</CommandEmpty>
            <CommandGroup>
              {showAllOption && (
                <CommandItem
                  value="all"
                  onSelect={() => handleSelect("")}
                  onClick={() => handleSelect("")}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  Tous les collaborateurs
                </CommandItem>
              )}
              {employees.map((emp: any) => (
                <CommandItem
                  key={emp.id}
                  value={String(emp.id)}
                  onSelect={() => handleSelect(String(emp.id))}
                  onClick={() => handleSelect(String(emp.id))} // CRITICAL CLICK FALLBACK
                >
                  <Check className={cn("mr-2 h-4 w-4", String(value) === String(emp.id) ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{emp.firstName} {emp.lastName}</span>
                    <span className="text-xs text-muted-foreground">{emp.department}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
