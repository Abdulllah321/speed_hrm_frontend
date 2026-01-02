"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

// Context for search highlighting
const SearchHighlightContext = createContext<string>("");
export const useSearchHighlight = () => useContext(SearchHighlightContext);

// Utility to highlight matching text
export function HighlightText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const search = useSearchHighlight();
  if (!search || !text) return <span className={className}>{text}</span>;

  const regex = new RegExp(
    `(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleXIcon,
  Columns3Icon,
  ListFilterIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "../ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { motion } from "motion/react";
import { useAuth } from "@/components/providers/auth-provider";

interface DataTableRow {
  id: string;
}

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterConfig = {
  key: string;
  label: string;
  options: FilterOption[];
};

type DataTableProps<TData extends DataTableRow> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  sortingColumns?: SortingState;
  toggleAction?: () => void;
  actionText?: string;
  newItemId?: string;
  onMultiDelete?: (ids: string[]) => void;
  onBulkEdit?: (items: TData[]) => void;
  searchFields?: { key: string; label: string }[];
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  resetFilterKey?: string; // Key to reset a specific filter when it changes
  tableId?: string; // Unique identifier for localStorage persistence
};

export default function DataTable<TData extends DataTableRow>({
  columns,
  data: initialData,
  sortingColumns = [],
  toggleAction,
  actionText = "Add",
  newItemId,
  onMultiDelete,
  onBulkEdit,
  searchFields,
  filters,
  onFilterChange,
  resetFilterKey,
  tableId,
}: DataTableProps<TData>) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<TData[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>(sortingColumns);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // Get preferences from AuthProvider
  const { getPreference, updatePreference } = useAuth();
  
  // Storage key for column visibility
  const storageKey = tableId ? `table-column-visibility-${tableId}` : null;
  const isInitialMount = useRef(true);
  
  // Initialize column visibility from AuthProvider preferences
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (!storageKey) return {};
    const saved = getPreference(storageKey);
    return saved || {};
  });
  const [highlightedId, setHighlightedId] = useState<string | null>(
    newItemId || null
  );

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {}
  );
  const isMobile = useIsMobile();
  // Combine search and filters into a single global filter value to trigger re-filtering
  const globalFilterValue = JSON.stringify({ search, activeFilters });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row) => {
      // Check search filter (OR across searchFields)
      if (search && searchFields?.length) {
        const searchLower = search.toLowerCase();
        const matchesSearch = searchFields.some((field) => {
          const value = row.getValue(field.key);
          return String(value ?? "")
            .toLowerCase()
            .includes(searchLower);
        });
        if (!matchesSearch) return false;
      }

      // Check active filters (AND across all filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (value && value !== "all") {
          // Try to get value from column first, then fallback to original data
          let rowValue: any;
          try {
            rowValue = row.getValue(key);
          } catch {
            // If getValue fails, try accessing original data directly
            const originalData = row.original as any;
            rowValue = originalData?.[key];
          }

          // If still undefined, try accessing original data directly
          if (rowValue === undefined || rowValue === null) {
            const originalData = row.original as any;
            rowValue = originalData?.[key];
          }

          const rowValueStr = rowValue != null ? String(rowValue).trim() : "";
          const filterValueStr = String(value).trim();

          // Skip if both are empty (null/undefined handling)
          if (!rowValueStr && !filterValueStr) continue;

          // For department and other text fields, use case-insensitive comparison
          // For IDs (UUIDs), use exact match
          const isIdField =
            key === "employeeId" || key === "id" || key.includes("Id");
          if (isIdField) {
            if (rowValueStr !== filterValueStr) return false;
          } else {
            if (rowValueStr.toLowerCase() !== filterValueStr.toLowerCase())
              return false;
          }
        }
      }

      return true;
    },
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
      globalFilter: globalFilterValue,
    },
  });

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Load column visibility from AuthProvider preferences on mount and when preferences change
  useEffect(() => {
    if (!storageKey) return;
    const saved = getPreference(storageKey);
    if (saved) {
      setColumnVisibility(saved);
      // Reset initial mount flag if we loaded preferences
      isInitialMount.current = false;
    }
  }, [storageKey, getPreference]);

  // Track previous resetFilterKey to detect changes
  const prevResetFilterKeyRef = useRef<string | undefined>(undefined);

  // Reset employee filter when department changes
  useEffect(() => {
    if (
      resetFilterKey !== undefined &&
      prevResetFilterKeyRef.current !== undefined &&
      prevResetFilterKeyRef.current !== resetFilterKey
    ) {
      setActiveFilters((prev) => {
        const newFilters = { ...prev };
        // Clear employee filter when department changes
        const employeeFilter = filters?.find((f) => f.key === "employeeId");
        if (employeeFilter && prev[employeeFilter.key]) {
          delete newFilters[employeeFilter.key];
        }
        return newFilters;
      });
    }
    prevResetFilterKeyRef.current = resetFilterKey;
  }, [resetFilterKey, filters]);

  useEffect(() => {
    if (newItemId) {
      setHighlightedId(newItemId);
      const timeout = setTimeout(() => {
        setHighlightedId(null);
      }, 10000); // 10 seconds

      return () => clearTimeout(timeout);
    }
  }, [newItemId]);

  // Save column visibility to AuthProvider whenever it changes
  useEffect(() => {
    // Skip saving on initial mount to avoid overwriting with loaded state
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (!storageKey) return;
    
    updatePreference(storageKey, columnVisibility);
  }, [columnVisibility, storageKey, updatePreference]);

  const handleDeleteRows = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const updatedData = data.filter(
      (item) => !selectedRows.some((row) => row.original.id === item.id)
    );
    const selectedRowIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.id);
    onMultiDelete?.(selectedRowIds);
    setData(updatedData);
    table.resetRowSelection();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const newFilters = {
        ...prev,
        [key]: value,
      };
      // Call callback if provided
      onFilterChange?.(key, value);
      return newFilters;
    });
  };

  return (
    <SearchHighlightContext.Provider value={search}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {searchFields?.length && (
              <div className="relative md:w-auto w-full">
                <Input
                  id={`${id}-input`}
                  name="filter"
                  ref={inputRef}
                  className="peer min-w-60 ps-9"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={`Search by ${searchFields
                    .map((f) => f.label)
                    .join(", ")}`}
                  type="text"
                />

                <div className="absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground">
                  <ListFilterIcon size={16} aria-hidden="true" />
                </div>

                {search && (
                  <button
                    className="absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted-foreground"
                    onClick={() => {
                      setSearch("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear filter"
                  >
                    <CircleXIcon size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {/* Filter dropdowns */}
            {filters?.map((filter) => {
              // Increase width for Department and Employee filters
              const isWideFilter =
                filter.key === "department" || filter.key === "employeeId";
              const widthClass = isWideFilter ? "w-[220px]" : "w-[150px]";

              return (
                <Autocomplete
                  key={filter.key}
                  options={[
                    { value: "all", label: `All ${filter.label}` },
                    ...filter.options,
                  ]}
                  value={activeFilters[filter.key] || "all"}
                  onValueChange={(value) =>
                    handleFilterChange(filter.key, value)
                  }
                  placeholder={`Select ${filter.label}`}
                  searchPlaceholder={`Search ${filter.label}...`}
                  className={widthClass}
                />
              );
            })}
          </div>
          {isMobile && <Separator />}
          <div className="flex items-center gap-3">
            {table.getSelectedRowModel().rows.length > 0 && (
              <>
                {onBulkEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const selectedItems = table
                        .getSelectedRowModel()
                        .rows.map((row) => row.original);
                      onBulkEdit(selectedItems);
                    }}
                    className="!bg-primary/5 !border-primary/50 text-primary"
                  >
                    <PencilIcon className="-ms-1 opacity-60" size={16} />
                    Edit
                    <span className="ml-1 text-xs">
                      ({table.getSelectedRowModel().rows.length})
                    </span>
                  </Button>
                )}
                {onMultiDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="!bg-destructive/5 !border-destructive/50 text-destructive"
                      >
                        <TrashIcon className="-ms-1 opacity-60" size={16} />{" "}
                        Delete
                        <span className="ml-1 text-xs">
                          ({table.getSelectedRowModel().rows.length})
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the selected rows.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteRows}
                          className="bg-destructive"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}{" "}
            {/* Toggle columns visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns3Icon className="-ms-1 opacity-60" size={16} /> View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>{" "}
            {/* Add user button */}
            {toggleAction && (
              <Button onClick={toggleAction}>
                <PlusIcon className="-ms-1 opacity-60" size={16} /> {actionText}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm overflow-hidden rounded-lg border border-border/50 shadow-sm w-full max-w-full">
          <div className="w-full max-w-full overflow-x-auto">
            <Table className="w-full table-auto">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="hover:bg-transparent border-b border-border/50 bg-muted/30"
                  >
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          style={{ width: `${header.getSize()}px` }}
                          className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <div
                              className={cn(
                                header.column.getCanSort() &&
                                  "flex h-full cursor-pointer items-center justify-between gap-2 select-none hover:text-foreground transition-colors"
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                              onKeyDown={(e) => {
                                if (
                                  header.column.getCanSort() &&
                                  (e.key === "Enter" || e.key === " ")
                                ) {
                                  e.preventDefault();
                                  header.column.getToggleSortingHandler()?.(e);
                                }
                              }}
                              tabIndex={
                                header.column.getCanSort() ? 0 : undefined
                              }
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: (
                                  <ChevronUpIcon
                                    className="shrink-0 text-primary animate-in slide-in-from-bottom-1 fade-in duration-200"
                                    size={16}
                                    aria-hidden="true"
                                  />
                                ),
                                desc: (
                                  <ChevronDownIcon
                                    className="shrink-0 text-primary animate-in slide-in-from-top-1 fade-in duration-200"
                                    size={16}
                                    aria-hidden="true"
                                  />
                                ),
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row, index) => {
                    const isNew = row.original.id === highlightedId;

                    return (
                      <motion.tr
                        key={row.id}
                        layout="position"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "border-b border-border/30",
                          index % 2 === 0 ? "bg-transparent" : "bg-muted/20",
                          "hover:bg-accent/50",
                          isNew &&
                            "bg-primary/10 animate-pulse ring-1 ring-primary/30"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </motion.tr>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-lg">No results found</span>
                        <span className="text-sm">
                          Try adjusting your search or filters
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-8 md:flex-row flex-col">
          {/* Rows per page dropdown */}
          <div className="flex items-center gap-2 order-3 md:order-1">
            <Label htmlFor="pageSize">Rows per page</Label>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page numbers with animation */}
          <div className="flex items-center gap-1 order-1 md:order-2">
            {getPageNumbers({
              currentPage: table.getState().pagination.pageIndex,
              totalPages: table.getPageCount(),
            }).map((page, idx) =>
              page === "..." ? (
                <PageJumpDropdown
                  key={idx}
                  totalPages={table.getPageCount()}
                  onSelect={(page) => table.setPageIndex(page - 1)}
                />
              ) : (
                <Button
                  key={idx}
                  size="sm"
                  variant={
                    page === table.getState().pagination.pageIndex + 1
                      ? "default"
                      : "ghost"
                  }
                  onClick={() => table.setPageIndex(page - 1)}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          <div className="items-center gap-2 order-2 md:order-3">
            {/* Page number range info */}
            <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
              <p
                className="text-muted-foreground text-sm whitespace-nowrap"
                aria-live="polite"
              >
                <span className="text-foreground">
                  {table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    1}
                  -
                  {Math.min(
                    table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      table.getState().pagination.pageSize,
                    table.getRowCount()
                  )}
                </span>{" "}
                of{" "}
                <span className="text-foreground">
                  {table.getRowCount().toString()}
                </span>
              </p>
            </div>

            {/* Navigation arrows */}
            <div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => table.firstPage()}
                      disabled={!table.getCanPreviousPage()}
                      aria-label="Go to first page"
                    >
                      <ChevronFirstIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      aria-label="Go to previous page"
                    >
                      <ChevronLeftIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      aria-label="Go to next page"
                    >
                      <ChevronRightIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => table.lastPage()}
                      disabled={!table.getCanNextPage()}
                      aria-label="Go to last page"
                    >
                      <ChevronLastIcon size={16} />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      </div>
    </SearchHighlightContext.Provider>
  );
}

function getPageNumbers({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}): (number | "...")[] {
  const pages: (number | "...")[] = [];

  const start = Math.max(1, currentPage + 1 - 2);
  const end = Math.min(totalPages, currentPage + 1 + 2);

  if (start > 1) pages.push(1);
  if (start > 2) pages.push("...");

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) pages.push("...");
  if (end < totalPages) pages.push(totalPages);

  return pages;
}

type PageJumpDropdownProps = {
  totalPages: number;
  onSelect: (page: number) => void;
};

export function PageJumpDropdown({
  totalPages,
  onSelect,
}: PageJumpDropdownProps) {
  const [search, setSearch] = useState("");

  const filtered = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p.toString().includes(search)
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-muted-foreground hover:text-primary"
        >
          ...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2">
        <Input
          name="page-jump-search"
          placeholder="Go to page..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <ScrollArea className="h-40">
          {filtered.map((page) => (
            <Button
              key={page}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onSelect(page);
              }}
            >
              Page {page}
            </Button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
