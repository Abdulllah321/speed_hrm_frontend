// "use client";

// import * as React from "react";
// import { format } from "date-fns";
// import { Calendar as CalendarIcon } from "lucide-react";

// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { Calendar } from "@/components/ui/calendar";

// export function DatePicker({ value, onChange }: any) {
//   const [date, setDate] = React.useState<Date | undefined>(
//     value ? new Date(value) : undefined
//   );

//   const handleSelect = (d: any) => {
//     setDate(d);
//     onChange && onChange(d);
//   };

//   return (
//     <Popover>
//       <PopoverTrigger asChild>
//         <Button
//           variant={"outline"}
//           className={cn(
//             "w-[240px] justify-start text-left font-normal",
//             !date && "text-muted-foreground"
//           )}
//         >
//           <CalendarIcon className="mr-2 h-4 w-4" />
//           {date ? format(date, "PPP") : <span>Select Date</span>}
//         </Button>
//       </PopoverTrigger>

//       <PopoverContent className="w-auto p-0">
//         <Calendar
//           mode="single"
//           selected={date}
//           onSelect={handleSelect}
//           initialFocus
//         />
//       </PopoverContent>
//     </Popover>
//   );
// }
