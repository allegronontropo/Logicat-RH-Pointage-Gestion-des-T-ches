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

export function DepartmentCombobox({ departments = [], value, onChange, className }: any) {
  const [open, setOpen] = React.useState(false)
  const selectedDepartment = departments.find((dept: string) => String(dept) === String(value))

  const handleSelect = (dept: string) => {
    onChange(dept);
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
            {selectedDepartment ? selectedDepartment : "Tous les départements"}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un département..." />
          <CommandList>
            <CommandEmpty>Aucun département trouvé.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => handleSelect("")}
                onClick={() => handleSelect("")}
              >
                <Check className={cn("mr-2 h-4 w-4", !value || value === "ALL" ? "opacity-100" : "opacity-0")} />
                Tous les départements
              </CommandItem>
              {departments.map((dept: string) => (
                <CommandItem
                  key={dept}
                  value={dept}
                  onSelect={() => handleSelect(dept)}
                  onClick={() => handleSelect(dept)} // CRITICAL CLICK FALLBACK
                >
                  <Check className={cn("mr-2 h-4 w-4", String(value) === String(dept) ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{dept}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
