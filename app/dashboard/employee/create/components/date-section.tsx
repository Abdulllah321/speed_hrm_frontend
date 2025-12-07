"use client";

import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

export function DateSection({ form, isPending, errors }: { form: UseFormReturn<any>; isPending: boolean; errors: Record<string, { message?: string }> }) {
  const { control } = form;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>Date of Birth <span className="text-destructive">*</span></Label>
        <Controller name="dateOfBirth" control={control} render={({ field }) => (
          <DatePicker value={field.value as string | undefined} onChange={field.onChange} disabled={isPending} />
        )} />
        {errors?.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth.message}</p>}
      </div>
    </div>
  );
}
