"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Country, createCities } from "@/lib/actions/city";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

interface CityAddFormProps {
  countries: Country[];
  defaultCountryId?: string;
}

export function CityAddForm({ countries, defaultCountryId }: CityAddFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState([
    { id: 1, name: "", countryId: defaultCountryId || "", lat: "", lng: "" },
  ]);

  const addRow = () => {
    setRows([...rows, { id: Date.now(), name: "", countryId: defaultCountryId || "", lat: "", lng: "" }]);
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.name.trim() && r.countryId);

    if (validRows.length === 0) {
      toast.error("Please enter at least one city with a country selected");
      return;
    }

    startTransition(async () => {
      const result = await createCities(
        validRows.map((r) => ({
          name: r.name.trim(),
          countryId: r.countryId,
          lat: r.lat ? parseFloat(r.lat) : undefined,
          lng: r.lng ? parseFloat(r.lng) : undefined,
        }))
      );
      if (result.status) {
        toast.success(result.message);
        router.push("/dashboard/master/city/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/master/city/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Cities</CardTitle>
          <CardDescription>Create one or more cities with coordinates</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label>Cities</Label>
              {rows.map((row, index) => (
                <div key={row.id} className="flex gap-2 items-end">
                  <Select
                    value={row.countryId}
                    onValueChange={(value) => updateRow(row.id, "countryId", value)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={`City ${index + 1}`}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, "name", e.target.value)}
                    disabled={isPending}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Latitude"
                    type="number"
                    step="any"
                    value={row.lat}
                    onChange={(e) => updateRow(row.id, "lat", e.target.value)}
                    disabled={isPending}
                    className="w-28"
                  />
                  <Input
                    placeholder="Longitude"
                    type="number"
                    step="any"
                    value={row.lng}
                    onChange={(e) => updateRow(row.id, "lng", e.target.value)}
                    disabled={isPending}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1 || isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create {rows.length > 1 ? `${rows.length} Cities` : "City"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
              <button
                type="button"
                onClick={addRow}
                disabled={isPending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                + Add more
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

