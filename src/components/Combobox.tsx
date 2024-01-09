import * as React from "react"

import { Check, ChevronsUpDown } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"

import { Button } from "~/components/ui/button"
import { cn } from "lib/utils"

export type Option = {
    label: string
    value: string
}

type Props = {
    options: Option[],
    value: string,
    setValue: (value: string) => void
}

export function Combobox(props: Props) {
    const { options } = props
  const [open, setOpen] = React.useState(false)
//   const [value, setValue] = React.useState(options[0]!.value)
    const { value, setValue } = props

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[75px] justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : "Select framework..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[75px] p-0">
        <Command>
          <CommandInput placeholder={value} />
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  setValue(currentValue === value ? "" : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
