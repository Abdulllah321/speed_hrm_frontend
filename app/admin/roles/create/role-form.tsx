"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createRole, updateRole, Role } from "@/lib/actions/roles";
import { Permission } from "@/lib/actions/permissions";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).default([]),
});

interface RoleFormProps {
  initialData?: Role;
  permissions: Permission[];
}

export function RoleForm({ initialData, permissions }: RoleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      permissionIds: initialData?.permissions?.map((p) => p.permission.id) || [],
    },
  });

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      if (initialData) {
        const result = await updateRole(initialData.id, values);
        if (result.status) {
          toast.success("Role updated successfully");
          router.push("/admin/roles");
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } else {
        const result = await createRole(values);
        if (result.status) {
          toast.success("Role created successfully");
          router.push("/admin/roles");
          router.refresh();
        } else {
          toast.error(result.message);
        }
      }
    });
  }

  const handleModuleSelect = (module: string, checked: boolean) => {
    const modulePermissions = groupedPermissions[module].map(p => p.id);
    const currentPermissions = form.getValues("permissionIds");
    
    let newPermissions: string[];
    if (checked) {
        newPermissions = [...new Set([...currentPermissions, ...modulePermissions])];
    } else {
        newPermissions = currentPermissions.filter(id => !modulePermissions.includes(id));
    }
    
    form.setValue("permissionIds", newPermissions, { shouldDirty: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Role Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Role Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. HR Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Describe the role's responsibilities" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {Object.entries(groupedPermissions).map(([module, perms]) => {
                            const allSelected = perms.every(p => form.watch("permissionIds").includes(p.id));
                            const someSelected = perms.some(p => form.watch("permissionIds").includes(p.id));

                            return (
                                <div key={module} className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`module-${module}`}
                                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                            onCheckedChange={(checked) => handleModuleSelect(module, !!checked)}
                                        />
                                        <label htmlFor={`module-${module}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">
                                            {module.replace(/-/g, ' ')}
                                        </label>
                                    </div>
                                    <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {perms.map((permission) => (
                                            <FormField
                                                key={permission.id}
                                                control={form.control}
                                                name="permissionIds"
                                                render={({ field }) => (
                                                    <FormItem
                                                        key={permission.id}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(permission.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...field.value, permission.id])
                                                                        : field.onChange(
                                                                            field.value?.filter(
                                                                                (value) => value !== permission.id
                                                                            )
                                                                        )
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal text-xs">
                                                            {permission.action}
                                                        </FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <Separator className="my-2" />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Update Role" : "Create Role"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
