"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Steps } from "@/components/ui/steps-indicator";
import { MasterSelect } from "@/components/form/master-select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// --- Validation Schemas ---

// We'll use a single schema for the whole form for simplicity in validation logic across steps
const itemFormSchema = z.object({
    // Step 1: Basic Info
    concept: z.string().min(1, "Brand (Concept) is required"),
    description: z.string().optional(),
    sku: z.string().min(1, "SKU is required"),
    itemId: z.string().min(1, "Item ID is required"),
    barCode: z.string().optional(),
    hsCode: z.string().optional(),
    isActive: z.boolean(),

    // Step 2: Classification (Masters)
    // brandId removed, using concept as Brand
    divisionId: z.string().optional(), // Can be made required based on business rule
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
    class: z.string().optional(),
    subclass: z.string().optional(),
    channelClassId: z.string().optional(),
    genderId: z.string().optional(),
    season: z.string().optional(),
    oldSeason: z.string().optional(),

    // Step 3: Pricing & Discount
    unitPrice: z.coerce.number().min(0),
    taxRate1: z.coerce.number().min(0).optional(),
    taxRate2: z.coerce.number().min(0).optional(),
    discountRate: z.coerce.number().min(0).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    discountStartDate: z.date().optional(),
    discountEndDate: z.date().optional(),

    // Step 4: Attributes
    size: z.string().optional(),
    colorId: z.string().optional(),
    silhouetteId: z.string().optional(),
    case: z.string().optional(),
    band: z.string().optional(),
    movementType: z.string().optional(),
    heelHeight: z.string().optional(),
    width: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

// --- Dummy Data & Types ---

const STEPS = ["Basic Details", "Classification", "Pricing & Discounts", "Attributes", "Review"];

// Initial dummy data
const INITIAL_MASTERS = {
    brands: [
        { id: "1", name: "ADIDAS" },
        { id: "2", name: "NIKE" },
        { id: "3", name: "PUMA" },
    ],
    divisions: [
        { id: "1", name: "APPAREL" },
        { id: "2", name: "FOOTWEAR" },
        { id: "3", name: "HARDWARE" },
    ],
    categories: [
        { id: "1", name: "ATHLETICS" },
        { id: "2", name: "TRAINING" },
        { id: "3", name: "SWIMMING" },
    ],
    colors: [
        { id: "1", name: "BLACK" },
        { id: "2", name: "WHITE" },
        { id: "3", name: "RED" },
    ],
    silhouettes: [
        { id: "1", name: "LOW TOP" },
        { id: "2", name: "HIGH TOP" },
    ],
    channelClasses: [
        { id: "1", name: "Wholesale" },
        { id: "2", name: "Retail" },
    ],
    genders: [
        { id: "1", name: "MEN" },
        { id: "2", name: "WOMEN" },
        { id: "3", name: "UNISEX" },
        { id: "4", name: "KIDS" },
    ],
};

export default function ItemCreatePage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [masters, setMasters] = useState(INITIAL_MASTERS);

    const form = useForm({
        resolver: zodResolver(itemFormSchema),
        defaultValues: {
            concept: "",
            description: "",
            sku: "",
            itemId: "",
            barCode: "",
            hsCode: "",
            isActive: true,
            unitPrice: 0,
            taxRate1: 0,
            taxRate2: 0,
            discountRate: 0,
            discountAmount: 0,
        },
        mode: "onChange",
    });

    // Helper to add new master options
    const createMaster = (key: keyof typeof INITIAL_MASTERS) => (name: string) => {
        const newId = Math.random().toString(36).substr(2, 9);
        setMasters((prev) => ({
            ...prev,
            [key]: [...prev[key], { id: newId, name }],
        }));
        // Ideally, we'd also return the new ID so it can be selected
        return newId;
    };

    const nextStep = async () => {
        const fieldsToValidate = getFieldsForStep(currentStep);
        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
        }
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const onSubmit = (data: ItemFormValues) => {
        console.log("Form Submitted:", data);
        alert("Item Created Successfully! (Check Console for Data)");
    };

    // Define which fields belong to which step for validation
    const getFieldsForStep = (step: number): (keyof ItemFormValues)[] => {
        switch (step) {
            case 0: // Basic
                return ["concept", "sku", "itemId", "barCode", "hsCode", "isActive", "description"];
            case 1: // Classification
                return ["divisionId", "categoryId", "subCategoryId", "class", "subclass", "channelClassId", "genderId", "season", "oldSeason"];
            case 2: // Pricing
                return ["unitPrice", "taxRate1", "taxRate2", "discountRate", "discountAmount", "discountStartDate", "discountEndDate"];
            case 3: // Attributes
                return ["size", "colorId", "silhouetteId", "case", "band", "movementType", "heelHeight", "width"];
            default:
                return [];
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Create New Item</h1>
                <p className="text-muted-foreground">Add a new item to your inventory catalog.</p>
            </div>

            <Steps steps={STEPS} currentStep={currentStep} />

            <div className="mt-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>

                        <Card>
                            <CardHeader>
                                <CardTitle>{STEPS[currentStep]}</CardTitle>
                                <CardDescription>Enter the details for {STEPS[currentStep].toLowerCase()}.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">

                                {/* STEP 1: BASIC DETAILS */}
                                {currentStep === 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="concept"
                                            render={({ field }) => (
                                                <MasterSelect
                                                    label="Concept (Brand)"
                                                    field={field}
                                                    options={masters.brands}
                                                    onCreateOption={createMaster("brands")}
                                                />
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="itemId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Item ID <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Unique Item ID" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>SKU <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="SKU Number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="barCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Barcode</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="EAN / UPC" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="hsCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>HS Code</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Harmonized System Code" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem className="col-span-full">
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Detailed product description..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="isActive"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 col-span-full">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>
                                                            Active Item
                                                        </FormLabel>
                                                        <FormDescription>
                                                            This item will be visible in sales and inventory channels.
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* STEP 2: CLASSIFICATION */}
                                {currentStep === 1 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Brand/Concept moved to Step 1 */}
                                        <FormField
                                            control={form.control}
                                            name="divisionId"
                                            render={({ field }) => (
                                                <MasterSelect
                                                    label="Division"
                                                    field={field}
                                                    options={masters.divisions}
                                                    onCreateOption={createMaster("divisions")}
                                                />
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="categoryId"
                                            render={({ field }) => (
                                                <MasterSelect
                                                    label="Category"
                                                    field={field}
                                                    options={masters.categories}
                                                    onCreateOption={createMaster("categories")}
                                                />
                                            )}
                                        />
                                        {/* Add inputs for free-text classifications or other masters */}
                                        <FormField
                                            control={form.control}
                                            name="subCategoryId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>SubCategory</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="class"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Class</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="subclass"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subclass</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="channelClassId"
                                            render={({ field }) => (
                                                <MasterSelect
                                                    label="Channel Class"
                                                    field={field}
                                                    options={masters.channelClasses}
                                                    onCreateOption={createMaster("channelClasses")}
                                                />
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="genderId"
                                            render={({ field }) => (
                                                <MasterSelect
                                                    label="Gender"
                                                    field={field}
                                                    options={masters.genders}
                                                    onCreateOption={createMaster("genders")}
                                                />
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="season"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Season</FormLabel>
                                                    <FormControl><Input placeholder="e.g. SS25" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="oldSeason"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Old Season</FormLabel>
                                                    <FormControl><Input placeholder="e.g. FW24" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* STEP 3: PRICING & DISCOUNTS */}
                                {currentStep === 2 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="unitPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Unit Price</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value as number} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="taxRate1"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tax Rate 1 (%)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value as number} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="taxRate2"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tax Rate 2 (%)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value as number} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="col-span-full border-t my-4 py-4">
                                            <h3 className="font-semibold mb-4">Discount Information</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <FormField
                                                    control={form.control}
                                                    name="discountRate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Discount Rate (%)</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" {...field} value={field.value as number} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="discountAmount"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Discount Amount</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" {...field} value={field.value as number} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="discountStartDate"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col">
                                                            <FormLabel>Discount Start Date</FormLabel>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                            variant={"outline"}
                                                                            className={cn(
                                                                                "pl-3 text-left font-normal",
                                                                                !field.value && "text-muted-foreground"
                                                                            )}
                                                                        >
                                                                            {field.value ? (
                                                                                format(field.value, "PPP")
                                                                            ) : (
                                                                                <span>Pick a date</span>
                                                                            )}
                                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={field.value}
                                                                        onSelect={field.onChange}
                                                                        disabled={(date) =>
                                                                            date < new Date("1900-01-01")
                                                                        }
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="discountEndDate"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col">
                                                            <FormLabel>Discount End Date</FormLabel>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                            variant={"outline"}
                                                                            className={cn(
                                                                                "pl-3 text-left font-normal",
                                                                                !field.value && "text-muted-foreground"
                                                                            )}
                                                                        >
                                                                            {field.value ? (
                                                                                format(field.value, "PPP")
                                                                            ) : (
                                                                                <span>Pick a date</span>
                                                                            )}
                                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={field.value}
                                                                        onSelect={field.onChange}
                                                                        disabled={(date) =>
                                                                            date < new Date("1900-01-01")
                                                                        }
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: ATTRIBUTES */}
                                {currentStep === 3 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="size"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Size</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="colorId"
                                            render={({ field }) => (
                                                <MasterSelect
                                                    label="Color"
                                                    field={field}
                                                    options={masters.colors}
                                                    onCreateOption={createMaster("colors")}
                                                />
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="silhouetteId"
                                            render={({ field }) => (
                                                <MasterSelect
                                                    label="Silhouette"
                                                    field={field}
                                                    options={masters.silhouettes}
                                                    onCreateOption={createMaster("silhouettes")}
                                                />
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="case"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Case</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="band"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Band</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="movementType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Movement Type</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="heelHeight"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Heel Height</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="width"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Width</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* STEP 5: REVIEW */}
                                {currentStep === 4 && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-muted-foreground">Item ID</Label>
                                                <div className="font-medium">{form.getValues("itemId")}</div>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Brand (Concept)</Label>
                                                <div className="font-medium">
                                                    {masters.brands.find(b => b.id === form.getValues("concept"))?.name || form.getValues("concept")}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Price</Label>
                                                <div className="font-medium">{form.getValues("unitPrice") as unknown as number}</div>
                                            </div>
                                        </div>
                                        <div className="bg-muted p-4 rounded-md">
                                            <p className="text-sm">Please review the information above before submitting. Creation is final for this step.</p>
                                        </div>
                                    </div>
                                )}

                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={prevStep}
                                    disabled={currentStep === 0}
                                >
                                    Previous
                                </Button>

                                {currentStep < STEPS.length - 1 ? (
                                    <Button type="button" onClick={nextStep}>
                                        Next Step
                                    </Button>
                                ) : (
                                    <Button type="submit">
                                        Create Item
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </form>
                </Form>
            </div>

            {/* Dev helper to visualize state */}
            {/* <pre className="mt-10 p-4 bg-gray-100 rounded text-xs">{JSON.stringify(form.watch(), null, 2)}</pre> */}
        </div>
    );
}
