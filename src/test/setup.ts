import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock ResizeObserver for jsdom
interface ResizeObserverMock {
  observe: ReturnType<typeof vi.fn>
  unobserve: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

global.ResizeObserver = vi.fn().mockImplementation((): ResizeObserverMock => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.alert for jsdom
global.alert = vi.fn() as typeof alert

// Mock Supabase client utilities
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
    },
  }),
}))

// Mock custom useUser hook
vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ user: null, loading: false }),
}))

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    query: {},
    pathname: '/',
  }),
}))

// Mock all UI components
vi.mock('@/components/ui/dialog', () => {
  let isDialogOpen = false
  return {
    Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
      // If open prop is provided, use it; otherwise use internal state
      const dialogOpen = open ?? isDialogOpen
      return React.createElement('div', { 'data-testid': 'dialog' }, 
        React.Children.map(children, (child: React.ReactNode) => {
          if (React.isValidElement(child)) {
            // Pass dialog state to children
            return React.cloneElement(child as React.ReactElement<{ dialogOpen?: boolean; onOpenChange?: (open: boolean) => void }>, { 
              dialogOpen,
              onOpenChange: onOpenChange ?? ((open: boolean) => { isDialogOpen = open })
            })
          }
          return child
        })
      )
    },
    DialogTrigger: ({ children, onOpenChange }: { children: React.ReactNode; dialogOpen?: boolean; onOpenChange?: (open: boolean) => void }) => 
      React.createElement('div', { 
        'data-testid': 'dialog-trigger',
        onClick: () => {
          if (onOpenChange) onOpenChange(true)
          isDialogOpen = true
        }
      }, children),
    DialogContent: ({ children, dialogOpen }: { children: React.ReactNode; dialogOpen?: boolean }) => 
      dialogOpen ? React.createElement('div', { 'data-testid': 'dialog-content' }, children) : null,
    DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dialog-header' }, children),
    DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dialog-footer' }, children),
    DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dialog-title' }, children),
    DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dialog-description' }, children),
    DialogPortal: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dialog-portal' }, children),
    DialogOverlay: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dialog-overlay' }, children),
    DialogClose: ({ children }: { children: React.ReactNode }) => React.createElement('button', { 'data-testid': 'dialog-close' }, children),
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => React.createElement('button', { 'data-testid': 'button', ...props }, children),
  buttonVariants: vi.fn(),
}))

interface ComponentProps {
  children: React.ReactNode
  [key: string]: unknown
}

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'card', ...props }, children),
  CardHeader: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'card-header', ...props }, children),
  CardTitle: ({ children, ...props }: ComponentProps) => React.createElement('h3', { 'data-testid': 'card-title', ...props }, children),
  CardDescription: ({ children, ...props }: ComponentProps) => React.createElement('p', { 'data-testid': 'card-description', ...props }, children),
  CardContent: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'card-content', ...props }, children),
  CardFooter: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'card-footer', ...props }, children),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => React.createElement('form', { 'data-testid': 'form' }, children),
  FormField: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'form-field' }, children),
  FormItem: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'form-item' }, children),
  FormLabel: ({ children, ...props }: ComponentProps) => React.createElement('label', { 'data-testid': 'form-label', ...props }, children),
  FormControl: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'form-control' }, children),
  FormDescription: ({ children, ...props }: ComponentProps) => React.createElement('p', { 'data-testid': 'form-description', ...props }, children),
  FormMessage: ({ children, ...props }: ComponentProps) => React.createElement('p', { 'data-testid': 'form-message', ...props }, children),
  useFormField: () => ({ error: null, id: 'test-field', name: 'test-field' }),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', { 'data-testid': 'input', ...props }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: ComponentProps) => React.createElement('label', { 'data-testid': 'label', ...props }, children),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: ComponentProps) => React.createElement('span', { 'data-testid': 'badge', ...props }, children),
  badgeVariants: vi.fn(),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'alert', role: 'alert', ...props }, children),
  AlertTitle: ({ children, ...props }: ComponentProps) => React.createElement('h5', { 'data-testid': 'alert-title', ...props }, children),
  AlertDescription: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'alert-description', ...props }, children),
}))

vi.mock('@/components/ui/command', () => ({
  Command: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'command', ...props }, children),
  CommandDialog: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'command-dialog', ...props }, children),
  CommandInput: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', { 'data-testid': 'command-input', ...props }),
  CommandList: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'command-list', ...props }, children),
  CommandEmpty: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'command-empty', ...props }, children),
  CommandGroup: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'command-group', ...props }, children),
  CommandItem: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'command-item', ...props }, children),
  CommandSeparator: ({ ...props }: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', { 'data-testid': 'command-separator', ...props }),
  CommandShortcut: ({ children, ...props }: ComponentProps) => React.createElement('span', { 'data-testid': 'command-shortcut', ...props }, children),
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'popover' }, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'popover-trigger' }, children),
  PopoverContent: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'popover-content', ...props }, children),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dropdown-menu' }, children),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dropdown-menu-trigger' }, children),
  DropdownMenuContent: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-content', ...props }, children),
  DropdownMenuItem: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-item', ...props }, children),
  DropdownMenuCheckboxItem: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-checkbox-item', ...props }, children),
  DropdownMenuRadioItem: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-radio-item', ...props }, children),
  DropdownMenuLabel: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-label', ...props }, children),
  DropdownMenuSeparator: ({ ...props }: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', { 'data-testid': 'dropdown-menu-separator', ...props }),
  DropdownMenuShortcut: ({ children, ...props }: ComponentProps) => React.createElement('span', { 'data-testid': 'dropdown-menu-shortcut', ...props }, children),
  DropdownMenuGroup: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-group', ...props }, children),
  DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dropdown-menu-portal' }, children),
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'dropdown-menu-sub' }, children),
  DropdownMenuSubContent: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-sub-content', ...props }, children),
  DropdownMenuSubTrigger: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-sub-trigger', ...props }, children),
  DropdownMenuRadioGroup: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'dropdown-menu-radio-group', ...props }, children),
}))

vi.mock('@/components/ui/toast', () => ({
  Toast: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'toast', ...props }, children),
  ToastProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'toast-provider' }, children),
  ToastViewport: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'toast-viewport', ...props }, children),
  ToastTitle: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'toast-title', ...props }, children),
  ToastDescription: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'toast-description', ...props }, children),
  ToastClose: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => React.createElement('button', { 'data-testid': 'toast-close', ...props }, children),
  ToastAction: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => React.createElement('button', { 'data-testid': 'toast-action', ...props }, children),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: [],
  }),
  toast: vi.fn(),
}))

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
}))

// Mock alternative path variants used in some components
vi.mock('src/components/ui/dialog', () => vi.importMock('@/components/ui/dialog'))
vi.mock('src/components/ui/button', () => vi.importMock('@/components/ui/button'))
vi.mock('src/components/ui/card', () => vi.importMock('@/components/ui/card'))
vi.mock('src/components/ui/form', () => vi.importMock('@/components/ui/form'))
vi.mock('src/components/ui/input', () => vi.importMock('@/components/ui/input'))
vi.mock('src/components/ui/label', () => vi.importMock('@/components/ui/label'))
vi.mock('src/components/ui/badge', () => vi.importMock('@/components/ui/badge'))
vi.mock('src/components/ui/alert', () => vi.importMock('@/components/ui/alert'))
vi.mock('src/components/ui/command', () => vi.importMock('@/components/ui/command'))
vi.mock('src/components/ui/popover', () => vi.importMock('@/components/ui/popover'))
vi.mock('src/components/ui/dropdown-menu', () => vi.importMock('@/components/ui/dropdown-menu'))
vi.mock('src/components/ui/toast', () => vi.importMock('@/components/ui/toast'))
vi.mock('src/components/ui/use-toast', () => vi.importMock('@/components/ui/use-toast'))
vi.mock('src/components/ui/toaster', () => vi.importMock('@/components/ui/toaster'))

// Mock non-UI components that are used in tests
interface CalendarHandlerProps {
  onSubmit: (schedule: unknown) => void
  schedule?: unknown
}

vi.mock('@/components/CalendarHandler', () => ({
  default: ({ onSubmit, schedule }: CalendarHandlerProps) => React.createElement('div', { 'data-testid': 'calendar-handler' }, [
    React.createElement('div', { 'data-testid': 'current-schedule', key: 'schedule' }, JSON.stringify(schedule)),
    React.createElement('button', { 
      key: 'save',
      onClick: () => {
        const newSchedule = {
          Monday: [{ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } }],
          Tuesday: [], Wednesday: [{ start: { hour: 10, minute: 0 }, end: { hour: 14, minute: 0 } }],
          Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
        onSubmit(newSchedule)
      }
    }, 'Save Availability'),
    React.createElement('button', { 
      key: 'clear',
      onClick: () => {
        const emptySchedule = {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
          Friday: [], Saturday: [], Sunday: []
        }
        onSubmit(emptySchedule)
      }
    }, 'Clear Availability')
  ])
}))

// Mock React Hook Form components
interface FormMethods {
  register: ReturnType<typeof vi.fn>
  handleSubmit: (fn: (data: unknown) => void) => (data: unknown) => void
  formState: { errors: Record<string, unknown> }
  setValue: ReturnType<typeof vi.fn>
  getValues: ReturnType<typeof vi.fn>
  watch: ReturnType<typeof vi.fn>
  control: Record<string, unknown>
}

vi.mock('react-hook-form', () => ({
  useForm: (): FormMethods => ({
    register: vi.fn(),
    handleSubmit: (fn: (data: unknown) => void) => fn,
    formState: { errors: {} },
    setValue: vi.fn(),
    getValues: vi.fn(),
    watch: vi.fn(),
    control: {},
  }),
  Controller: ({ render }: { render: (props: { field: { onChange: ReturnType<typeof vi.fn>; value: string } }) => React.ReactElement }) => render({ field: { onChange: vi.fn(), value: '' } }),
  useController: () => ({
    field: { onChange: vi.fn(), value: '' },
    fieldState: { error: null },
  }),
}))

// Mock Zod for schema validation
interface ZodMock {
  min: ReturnType<typeof vi.fn>
  email: ReturnType<typeof vi.fn>
  max: ReturnType<typeof vi.fn>
}

vi.mock('zod', () => ({
  z: {
    string: (): ZodMock => ({ min: vi.fn().mockReturnThis(), email: vi.fn().mockReturnThis(), max: vi.fn().mockReturnThis() }),
    object: () => ({ parse: vi.fn(), safeParse: vi.fn(() => ({ success: true })) }),
    array: (): ZodMock => ({ min: vi.fn().mockReturnThis(), email: vi.fn().mockReturnThis(), max: vi.fn().mockReturnThis() }),
    number: (): ZodMock => ({ min: vi.fn().mockReturnThis(), max: vi.fn().mockReturnThis(), email: vi.fn().mockReturnThis() }),
  },
}))

// Mock Lucide React icons
type IconProps = React.SVGAttributes<SVGElement>

vi.mock('lucide-react', () => ({
  Calendar: (props: IconProps) => React.createElement('svg', { 'data-testid': 'calendar-icon', ...props }),
  Send: (props: IconProps) => React.createElement('svg', { 'data-testid': 'send-icon', ...props }),
  Plus: (props: IconProps) => React.createElement('svg', { 'data-testid': 'plus-icon', ...props }),
  Settings: (props: IconProps) => React.createElement('svg', { 'data-testid': 'settings-icon', ...props }),
  Users: (props: IconProps) => React.createElement('svg', { 'data-testid': 'users-icon', ...props }),
  Clock: (props: IconProps) => React.createElement('svg', { 'data-testid': 'clock-icon', ...props }),
  Check: (props: IconProps) => React.createElement('svg', { 'data-testid': 'check-icon', ...props }),
  X: (props: IconProps) => React.createElement('svg', { 'data-testid': 'x-icon', ...props }),
  AlertCircle: (props: IconProps) => React.createElement('svg', { 'data-testid': 'alert-circle-icon', ...props }),
  Info: (props: IconProps) => React.createElement('svg', { 'data-testid': 'info-icon', ...props }),
  Mail: (props: IconProps) => React.createElement('svg', { 'data-testid': 'mail-icon', ...props }),
  Edit: (props: IconProps) => React.createElement('svg', { 'data-testid': 'edit-icon', ...props }),
  Trash: (props: IconProps) => React.createElement('svg', { 'data-testid': 'trash-icon', ...props }),
  ChevronDown: (props: IconProps) => React.createElement('svg', { 'data-testid': 'chevron-down-icon', ...props }),
  ExternalLink: (props: IconProps) => React.createElement('svg', { 'data-testid': 'external-link-icon', ...props }),
}))

// Mock additional UI components that are commonly imported
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'select' }, children),
  SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => React.createElement('button', { 'data-testid': 'select-trigger', ...props }, children),
  SelectContent: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'select-content', ...props }, children),
  SelectValue: ({ children, ...props }: ComponentProps) => React.createElement('span', { 'data-testid': 'select-value', ...props }, children),
  SelectItem: ({ children, ...props }: ComponentProps) => React.createElement('div', { 'data-testid': 'select-item', ...props }, children),
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', { type: 'checkbox', 'data-testid': 'checkbox', ...props }),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => React.createElement('textarea', { 'data-testid': 'textarea', ...props }),
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', { type: 'checkbox', 'data-testid': 'switch', ...props }),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement> & { children: React.ReactNode }) => React.createElement('table', { 'data-testid': 'table', ...props }, children),
  TableHeader: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { children: React.ReactNode }) => React.createElement('thead', { 'data-testid': 'table-header', ...props }, children),
  TableBody: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { children: React.ReactNode }) => React.createElement('tbody', { 'data-testid': 'table-body', ...props }, children),
  TableRow: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { children: React.ReactNode }) => React.createElement('tr', { 'data-testid': 'table-row', ...props }, children),
  TableHead: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) => React.createElement('th', { 'data-testid': 'table-head', ...props }, children),
  TableCell: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) => React.createElement('td', { 'data-testid': 'table-cell', ...props }, children),
}))

// Mock class-variance-authority
vi.mock('class-variance-authority', () => ({
  cva: () => vi.fn(),
}))

// Mock tailwind-merge
vi.mock('tailwind-merge', () => ({
  twMerge: (...args: string[]) => args.join(' '),
}))