"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

const institutes = [
  { id: 1, name: "Abasyn University" },
  { id: 2, name: "Abbottabad University of Science and Technology" },
  { id: 3, name: "Abdul Wali Khan University Mardan" },
  { id: 4, name: "Aga Khan University" },
  { id: 5, name: "Air University" },
  { id: 6, name: "Alhamd Islamic University" },
  { id: 7, name: "Ali Institute of Education" },
  { id: 8, name: "Al-Khair University" },
  { id: 9, name: "Bacha Khan University" },
  { id: 10, name: "Bahauddin Zakariya University" },
  { id: 11, name: "Bahria University" },
  { id: 12, name: "Balochistan University of Engineering and Technology" },
  { id: 13, name: "Balochistan University of Information Technology, Engineering and Management Sciences" },
  { id: 14, name: "Baqai Medical University" },
  { id: 15, name: "Beaconhouse National University" },
  { id: 16, name: "Benazir Bhutto Shaheed University Lyari" },
  { id: 17, name: "CECOS University" },
  { id: 18, name: "City University of Science and Information Technology" },
  { id: 19, name: "Commecs Institute of Business and Emerging Sciences" },
  { id: 20, name: "COMSATS Institute of Information Technology" },
  { id: 21, name: "Dadabhoy Institute of Higher Education" },
  { id: 22, name: "Dawood University of Engineering and Technology" },
  { id: 23, name: "DHA Suffa University" },
  { id: 24, name: "DOW University of Health Sciences" },
  { id: 25, name: "FATA University" },
  { id: 26, name: "Fatima Jinnah Women University" },
  { id: 27, name: "Federal Urdu University of Arts, Sciences and Technology Islamabad" },
  { id: 28, name: "Forman Christian College" },
  { id: 29, name: "Foundation University Islamabad" },
  { id: 30, name: "Gandhara University" },
  { id: 31, name: "Ghazi University" },
  { id: 32, name: "Ghulam Ishaq Khan Institute of Engineering Sciences and Technology" },
  { id: 33, name: "GIFT University" },
  { id: 34, name: "Global Institute" },
  { id: 35, name: "Gomal University" },
  { id: 36, name: "Government College for Women University, Sialkot" },
  { id: 37, name: "Government College University, Faisalabad" },
  { id: 38, name: "Government College University, Lahore" },
  { id: 39, name: "Government College Women University, Faisalabad" },
  { id: 40, name: "Greenwich University" },
  { id: 41, name: "Habib University" },
  { id: 42, name: "Hajvery University" },
  { id: 43, name: "Hamdard University" },
  { id: 44, name: "Hazara University" },
  { id: 45, name: "HITEC University" },
  { id: 46, name: "Ilma University" },
  { id: 47, name: "Imperial College of Business Studies" },
  { id: 48, name: "Indus University, Pakistan" },
  { id: 49, name: "Indus Valley School of Art and Architecture" },
  { id: 50, name: "Information Technology University" },
  { id: 51, name: "Institute of Business Administration" },
  { id: 52, name: "Institute of Business Management" },
  { id: 53, name: "Institute of Management Sciences" },
  { id: 54, name: "Institute of Southern Punjab" },
  { id: 55, name: "Institute of Space Technology" },
  { id: 56, name: "International Islamic University, Islamabad" },
  { id: 57, name: "Iqra National University" },
  { id: 58, name: "Iqra University" },
  { id: 59, name: "Islamia College Peshawar" },
  { id: 60, name: "Isra University" },
  { id: 61, name: "Jinnah Sindh Medical University" },
  { id: 62, name: "Jinnah University for Women" },
  { id: 63, name: "Karachi Institute of Economics and Technology" },
  { id: 64, name: "Karachi School for Business and Leadership" },
  { id: 65, name: "Karakurum International University" },
  { id: 66, name: "KASB Institute of Technology" },
  { id: 67, name: "Khawaja Freed University of Engineering and Information Technology" },
  { id: 68, name: "Khushal Khan Khattak University" },
  { id: 69, name: "Khyber Medical University" },
  { id: 70, name: "Khyber Pakhtunkhwa Agricultural University" },
  { id: 71, name: "King Edward Medical University" },
  { id: 72, name: "Kinnaird College for Women" },
  { id: 73, name: "Kohat University of Science and Technology" },
  { id: 74, name: "Lahore College for Women University" },
  { id: 75, name: "Lahore Garrison University" },
  { id: 76, name: "Lahore Leads University" },
  { id: 77, name: "Lahore School of Economics" },
  { id: 78, name: "Lahore University of Management Sciences" },
  { id: 79, name: "Lasbela University of Agriculture, Water and Marine Sciences" },
  { id: 80, name: "Liaquat University of Medical and Health Sciences" },
  { id: 81, name: "Mehran University of Engineering and Technology" },
  { id: 82, name: "Minhaj University" },
  { id: 83, name: "Mirpur University of Science and Technology" },
  { id: 84, name: "Mohammad Ali Jinnah University" },
  { id: 85, name: "Mohi-ud-Din Islamic University" },
  { id: 86, name: "Muhammad Nawaz Shareef University of Agriculture, Multan" },
  { id: 87, name: "Muslim Youth University" },
  { id: 88, name: "National College of Arts" },
  { id: 89, name: "National College of Business Administration and Economics" },
  { id: 90, name: "National Defence University" },
  { id: 91, name: "National Textile University" },
  { id: 92, name: "National University of Computer and Emerging Sciences" },
  { id: 93, name: "National University of Modern Languages" },
  { id: 94, name: "National University of Sciences and Technology" },
  { id: 95, name: "Nazeer Hussain University" },
  { id: 96, name: "NED University of Engineering and Technology" },
  { id: 97, name: "Newports Institute of Communications and Economics" },
  { id: 98, name: "Northern University" },
  { id: 99, name: "Nur International University" },
  { id: 100, name: "Pakistan Institute of Development Economics" },
  { id: 101, name: "Pakistan Institute of Engineering and Applied Sciences" },
  { id: 102, name: "Pakistan Institute of Fashion and Design" },
  { id: 103, name: "Peoples University of Medical and Health Sciences for Women" },
  { id: 104, name: "PIMSAT Institute of Higher Education" },
  { id: 105, name: "Pir Mehr Ali Shah Arid Agriculture University" },
  { id: 106, name: "Preston University" },
  { id: 107, name: "Qarshi University" },
  { id: 108, name: "Quaid-e-Awam University of Engineering, Science and Technology" },
  { id: 109, name: "Quaid-i-Azam University" },
  { id: 110, name: "Qurtaba University" },
  { id: 111, name: "Riphah International University" },
  { id: 112, name: "Sardar Bahadur Khan Women's University" },
  { id: 113, name: "Sarhad University of Science and Information Technology" },
  { id: 114, name: "Shah Abdul Latif University" },
  { id: 115, name: "Shaheed Benazir Bhutto City University" },
  { id: 116, name: "Shaheed Benazir Bhutto University" },
  { id: 117, name: "Shaheed Benazir Bhutto University Shaheed Benazirabad" },
  { id: 118, name: "Shaheed Benazir Bhutto Women University" },
  { id: 119, name: "Shaheed Mohtarma Benazir Bhutto Medical University" },
  { id: 120, name: "Shaheed Zulfiqar Ali Bhutto Institute of Science and Technology" },
  { id: 121, name: "Shaheed Zulfiqar Ali Bhutto University of Law" },
  { id: 122, name: "Shifa Tameer-e-Millat University" },
  { id: 123, name: "Sindh Agriculture University" },
  { id: 124, name: "Sindh Madresatul Islam University" },
  { id: 125, name: "Sir Syed University of Engineering and Technology" },
  { id: 126, name: "Sukkur Institute of Business Administration" },
  { id: 127, name: "Superior Group of Colleges" },
  { id: 128, name: "Textile Institute of Pakistan" },
  { id: 129, name: "The Government Sadiq College Women University, Bahawalpur" },
  { id: 130, name: "The Institute of Management Sciences" },
  { id: 131, name: "The Islamia University of Bahawalpur" },
  { id: 132, name: "The University of Faisalabad" },
  { id: 133, name: "The University of Lahore" },
  { id: 134, name: "The University of Poonch" },
  { id: 135, name: "The Women University, Multan" },
  { id: 136, name: "University of Agriculture, Faisalabad" },
  { id: 137, name: "University of Azad Jammu and Kashmir" },
  { id: 138, name: "University of Balochistan" },
  { id: 139, name: "University of Central Punjab" },
  { id: 140, name: "University of Education" },
  { id: 141, name: "University of Engineering and Technology, Lahore" },
  { id: 142, name: "University of Engineering and Technology, Peshawar" },
  { id: 143, name: "University of Engineering and Technology, Taxila" },
  { id: 144, name: "University of Gujrat" },
  { id: 145, name: "University of Haripur" },
  { id: 146, name: "University of Health Sciences, Lahore" },
  { id: 147, name: "University of Karachi" },
  { id: 148, name: "University of Kotli Azad Jammu and Kashmir" },
  { id: 149, name: "University of Loralai" },
  { id: 150, name: "University of Malakand" },
  { id: 151, name: "University of Management and Technology" },
  { id: 152, name: "University of Peshawar" },
  { id: 153, name: "University of Sargodha" },
  { id: 154, name: "University of Science and Technology, Bannu" },
  { id: 155, name: "University of Sindh" },
  { id: 156, name: "University of South Asia" },
  { id: 157, name: "University of Swabi" },
  { id: 158, name: "University of Swat" },
  { id: 159, name: "University of the Punjab" },
  { id: 160, name: "University of Turbat" },
  { id: 161, name: "University of Veterinary and Animal Sciences" },
  { id: 162, name: "University of Wah" },
  { id: 163, name: "Women University of Azad Jammu and Kashmir Bagh" },
  { id: 164, name: "Ziauddin University" },
];

interface QualificationEntry {
  id: number;
  instituteName: string;
  qualification: string;
  country: string;
  city: string;
  subDepartment: string;
}

export default function AddQualificationPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qualifications, setQualifications] = useState<QualificationEntry[]>([
    { id: 1, instituteName: "", qualification: "", country: "", city: "", subDepartment: "" },
  ]);

  const addMoreField = () => {
    setQualifications([
      ...qualifications,
      { id: Date.now(), instituteName: "", qualification: "", country: "", city: "", subDepartment: "" },
    ]);
  };

  const removeField = (id: number) => {
    if (qualifications.length > 1) {
      setQualifications(qualifications.filter((q) => q.id !== id));
    }
  };

  const updateField = (id: number, field: keyof QualificationEntry, value: string) => {
    setQualifications(qualifications.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const clearForm = () => {
    setQualifications([
      { id: 1, instituteName: "", qualification: "", country: "", city: "", subDepartment: "" },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validQualifications = qualifications.filter(
      (q) => q.instituteName && q.qualification.trim()
    );
    if (validQualifications.length === 0) {
      toast.error("Please fill at least one qualification");
      return;
    }

    startTransition(async () => {
      try {
        for (const qual of validQualifications) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api"}/qualifications`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instituteName: institutes.find((i) => i.id.toString() === qual.instituteName)?.name,
                qualification: qual.qualification,
                country: qual.country,
                city: qual.city,
                subDepartment: qual.subDepartment,
              }),
            }
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to create qualification");
          }
        }
        toast.success(`${validQualifications.length} qualification(s) created successfully`);
        router.push("/dashboard/master/qualification/list");
      } catch (error: any) {
        toast.error(error.message || "Failed to create qualification");
      }
    });
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/qualification/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Qualification</CardTitle>
          <CardDescription>Create new qualification(s) for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {qualifications.map((qual, index) => (
              <div key={qual.id} className="p-4 border rounded-lg space-y-4 relative">
                {qualifications.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(qual.id)}
                    disabled={isPending}
                    className="absolute top-2 right-2 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                <div className="font-medium text-sm text-muted-foreground mb-2">
                  Qualification {qualifications.length > 1 && `#${index + 1}`}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Institute Name</Label>
                    <Select
                      value={qual.instituteName}
                      onValueChange={(value) => updateField(qual.id, "instituteName", value)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full min-w-[280px]">
                        <SelectValue placeholder="Select institute" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {institutes.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id.toString()}>
                            {inst.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Qualification</Label>
                    <Input
                      placeholder="e.g., BS Computer Science"
                      value={qual.qualification}
                      onChange={(e) => updateField(qual.id, "qualification", e.target.value)}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      placeholder="Enter country"
                      value={qual.country}
                      onChange={(e) => updateField(qual.id, "country", e.target.value)}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      placeholder="Enter city"
                      value={qual.city}
                      onChange={(e) => updateField(qual.id, "city", e.target.value)}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Sub Department Name</Label>
                    <Input
                      placeholder="Enter sub department"
                      value={qual.subDepartment}
                      onChange={(e) => updateField(qual.id, "subDepartment", e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addMoreField}
              disabled={isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More Qualification Section
            </Button>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit
              </Button>
              <Button type="button" variant="outline" onClick={clearForm} disabled={isPending}>
                Clear Form
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

