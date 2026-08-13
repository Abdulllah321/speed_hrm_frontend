"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Send,
  AlertCircle,
  CheckCircle2,
  Printer,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { createTransferRequest } from "@/lib/actions/transfer-request";
import { getLocations, Location } from "@/lib/actions/location";
import { useAuth } from "@/components/providers/auth-provider";
import { format } from "date-fns";

interface DirectTransferModalProps {
  item: {
    id: string;
    sku: string;
    description: string;
    size?: string;
    color?: string;
  } | null;
  availableStock: number;
  isOpen: boolean;
  onClose: () => void;
}

export function DirectTransferModal({
  item,
  availableStock,
  isOpen,
  onClose,
}: DirectTransferModalProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [destinations, setDestinations] = useState<Location[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<any>(null);

  const fromLocationId = user?.terminal?.location?.id || user?.locationId;

  useEffect(() => {
    if (isOpen) {
      fetchDestinations();
    }
  }, [isOpen]);

  async function fetchDestinations() {
    setIsLoadingDestinations(true);
    try {
      const res = await getLocations();
      if (res.status && res.data) {
        // Filter out current location and keep active locations
        const filtered = res.data.filter(
          (loc) => loc.id !== fromLocationId && loc.status === "active",
        );
        setDestinations(filtered);
      } else {
        toast.error("Failed to load destination outlets");
      }
    } catch (error) {
      console.error("Failed to load destinations", error);
      toast.error("An error occurred while loading destination outlets");
    } finally {
      setIsLoadingDestinations(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !fromLocationId) return;

    if (!selectedDestId) {
      toast.error("Please select a destination outlet");
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (qty > availableStock) {
      toast.error(
        `Cannot transfer more than available stock (${availableStock} units)`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTransferRequest({
        fromLocationId: fromLocationId,
        toLocationId: selectedDestId,
        transferType: "OUTLET_TO_OUTLET",
        isDirectTransfer: true,
        items: [
          {
            itemId: item.id,
            quantity: qty,
          },
        ],
        notes,
      });

      if (res.status) {
        setCreatedRequest(res.data);
        setIsSuccess(true);
        toast.success(
          res.message || "Direct transfer out created successfully!",
        );
      } else {
        toast.error(res.message || "Failed to create transfer request");
      }
    } catch (error: any) {
      console.error("Direct transfer error:", error);
      toast.error(
        error.message || "An error occurred while creating direct transfer",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    onClose();
    setIsSuccess(false);
    setCreatedRequest(null);
    setQuantity("1");
    setNotes("");
    setSelectedDestId("");
  };

  const handlePrintCreatedRequest = () => {
    if (!createdRequest) return;
    const refNo = createdRequest.requestNo || "N/A";
    const typeTitle = "DIRECT OUTLET-TO-OUTLET TRANSFER OUT";
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow popups to print");
      return;
    }

    const dateStr = format(new Date(), "dd MMM yyyy HH:mm");
    const companyName = "Speed (pvt.) Limited";
    const sourceLoc = user?.terminal?.location?.name || "This Outlet";
    const destLoc =
      destinations.find((d) => d.id === selectedDestId)?.name ||
      "Destination Outlet";

    win.document.write(`
            <html><head><title>Transfer Out - ${refNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; padding: 40px; }
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: 800; color: #065f46; letter-spacing: 1px; }
                .document-title { font-size: 14px; font-weight: 600; color: #4b5563; text-transform: uppercase; margin-top: 4px; }
                .status-badge { padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid; display: inline-block; }
                .status-approved { background-color: #d1fae5; color: #065f46; border-color: #10b981; }
                
                .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px; background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .meta-item { display: flex; flex-direction: column; }
                .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
                .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                
                .notes-section { background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin-bottom: 40px; border-radius: 0 8px 8px 0; }
                .notes-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 4px; }
                .notes-content { font-size: 12px; color: #334155; }
                
                .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 60px; }
                .signature-box { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
                
                @media print {
                    body { padding: 0; }
                    .meta-grid { background-color: #fff !important; border: 1px solid #cbd5e1; }
                    th { background-color: #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style></head><body>
                <div class="header-container">
                    <div>
                        <div class="company-name">${companyName}</div>
                        <div class="document-title">${typeTitle}</div>
                    </div>
                    <div>
                        <span class="status-badge status-approved">SOURCE APPROVED / OUTBOUND</span>
                    </div>
                </div>
                
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Reference No</span>
                        <span class="meta-value">${refNo}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Transfer Date</span>
                        <span class="meta-value">${dateStr}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Source Outlet</span>
                        <span class="meta-value">${sourceLoc}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Destination Outlet</span>
                        <span class="meta-value">${destLoc}</span>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60px;">S.No</th>
                            <th>SKU Code</th>
                            <th>Item Description</th>
                            <th>Size</th>
                            <th>Color</th>
                            <th class="text-right" style="width: 100px;">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td class="font-bold">${item?.sku || "—"}</td>
                            <td>${item?.description || "Item"}</td>
                            <td>${item?.size || "—"}</td>
                            <td>${item?.color || "—"}</td>
                            <td class="text-right font-bold">${quantity}</td>
                        </tr>
                    </tbody>
                </table>
                
                ${
                  notes
                    ? `
                    <div class="notes-section">
                        <div class="notes-title">Transfer Notes / Remarks</div>
                        <div class="notes-content">${notes}</div>
                    </div>
                `
                    : ""
                }
                
                <div class="signature-grid">
                    <div class="signature-box">Prepared By</div>
                    <div class="signature-box">Source Authorized By</div>
                    <div class="signature-box">Received By</div>
                </div>
            </body></html>
        `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        {isSuccess ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground font-sans">
              Transfer Sent Out!
            </h3>
            <p className="text-muted-foreground mt-2 font-medium text-sm">
              Stock has been decremented from your outlet and sent to
              destination's inbound queue.
            </p>

            {createdRequest && (
              <div className="mt-4 p-4 bg-muted/40 rounded-xl w-full border text-left font-mono text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ref No:</span>
                  <span className="font-bold text-foreground">
                    {createdRequest.requestNo || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item SKU:</span>
                  <span className="font-bold text-foreground">{item?.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qty:</span>
                  <span className="font-bold text-foreground">
                    {quantity} Units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination:</span>
                  <span className="font-bold text-foreground truncate max-w-[180px]">
                    {destinations.find((d) => d.id === selectedDestId)?.name ||
                      "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold text-emerald-600">
                    SOURCE APPROVED
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 w-full mt-6">
              <Button
                type="button"
                className="w-full h-11 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handlePrintCreatedRequest()}
              >
                <Printer className="h-4 w-4" /> Print Transfer Slip
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 font-bold"
                onClick={handleCloseSuccess}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-emerald-600" />
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Direct Transfer Out
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground font-medium flex flex-col gap-1 mt-1">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span>Send stock of</span>
                  <span className="font-bold text-foreground tracking-tight">
                    {item?.sku}
                  </span>
                  {item?.size && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-300/20">
                      Size: {item.size}
                    </span>
                  )}
                  {item?.color && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 ring-1 ring-inset ring-pink-700/10 dark:ring-pink-300/20">
                      Color: {item.color}
                    </span>
                  )}
                  <span>to another outlet.</span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="destination"
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Select Destination Outlet
                </Label>
                {isLoadingDestinations ? (
                  <div className="flex items-center gap-2 h-11 px-3 border rounded-md bg-muted/20 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading outlets...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedDestId}
                    onValueChange={setSelectedDestId}
                  >
                    <SelectTrigger className="h-11 bg-muted/30">
                      <SelectValue placeholder="Choose target outlet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name} ({dest.code})
                        </SelectItem>
                      ))}
                      {destinations.length === 0 && (
                        <SelectItem value="none" disabled>
                          No other active outlets found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="quantity"
                    className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    Quantity to Transfer
                  </Label>
                  <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    Available in Outlet: {availableStock}
                  </span>
                </div>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={availableStock}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-lg py-6 focus-visible:ring-ring font-mono bg-muted/30"
                  required
                  disabled={availableStock <= 0}
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="notes"
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Stock sent for customer booking order"
                  className="resize-none focus-visible:ring-ring bg-muted/30 min-h-[80px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <AlertCircle className="w-5 h-5 flex-none mt-0.5 text-emerald-600" />
                <p className="leading-relaxed">
                  This transfer out will deduct stock from your outlet
                  immediately. It will appear directly in the destination
                  outlet's inbound queue for receipt.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="font-bold uppercase tracking-wider text-xs h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || availableStock <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs h-11 shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Stock
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
