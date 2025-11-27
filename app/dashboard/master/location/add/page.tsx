"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

type LocationEntry = {
  id: number;
  name: string;
  station: string;
};

export default function AddLocationPage() {
  const [locations, setLocations] = useState<LocationEntry[]>([
    { id: 1, name: "", station: "" },
  ]);

  const addMore = () => {
    setLocations([...locations, { id: Date.now(), name: "", station: "" }]);
  };

  const removeLocation = (id: number) => {
    if (locations.length > 1) {
      setLocations(locations.filter((l) => l.id !== id));
    }
  };

  const updateLocation = (id: number, field: keyof LocationEntry, value: string) => {
    setLocations(locations.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = locations.filter((l) => l.name && l.station);
    if (valid.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    toast.success(`${valid.length} location(s) created successfully`);
  };

  const handleClear = () => {
    setLocations([{ id: 1, name: "", station: "" }]);
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/location/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Location</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-end gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-2">
                    <Label>
                      Location Name: <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={loc.name}
                      onChange={(e) => updateLocation(loc.id, "name", e.target.value)}
                      placeholder="Enter location name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      IN/OUT Station: <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={loc.station}
                      onValueChange={(value) => updateLocation(loc.id, "station", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select station" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_station">In Station</SelectItem>
                        <SelectItem value="out_station">Out Station</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {locations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeLocation(loc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-4">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear
              </Button>
              <Button type="button" variant="secondary" onClick={addMore}>
                <Plus className="h-4 w-4 mr-2" />
                Add More Locations
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

