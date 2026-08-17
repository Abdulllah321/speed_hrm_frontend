import { format } from "date-fns";

export interface PrintStockAdjustmentItem {
  id?: string;
  adjustedQty?: number | string;
  physicalQty?: number | string;
  currentQty?: number | string;
  rate?: number | string;
  locationId?: string | null;
  location?: { id: string; name: string; code: string } | null;
  item?: {
    sku?: string;
    description?: string | null;
    color?: { name: string } | null;
    size?: { name: string } | null;
    category?: { name: string } | null;
    division?: { name: string } | null;
  } | null;
  swapItem?: {
    sku?: string;
    description?: string | null;
    color?: { name: string } | null;
    size?: { name: string } | null;
  } | null;
}

export interface PrintStockAdjustmentData {
  id: string;
  adjustmentNo: string;
  createdAt: string;
  adjustmentDate?: string;
  status: string;
  reason?: string | null;
  notes?: string | null;
  createdById?: string | null;
  warehouse?: { name: string; code: string } | null;
  items: PrintStockAdjustmentItem[];
}

export function printStockAdjustmentNote(
  adj: PrintStockAdjustmentData,
  locationNameOverride?: string,
) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow popups to print stock adjustment notes.");
    return;
  }

  const dateStr = format(new Date(adj.createdAt || Date.now()), "dd-MMM-yyyy");
  const refNo = adj.adjustmentNo || "N/A";
  const statusLabel =
    adj.status === "SUBMITTED"
      ? "Approved / Closed"
      : adj.status === "PENDING_APPROVAL"
        ? "Pending Approval"
        : adj.status;

  const locationName =
    locationNameOverride ||
    adj.items?.find((i) => i.location?.name)?.location?.name ||
    adj.warehouse?.name ||
    "Head Office / Warehouse";

  // Group items hierarchically: Division -> Category -> Product (Description)
  const groups: Record<
    string,
    {
      name: string;
      qty: number;
      val: number;
      categories: Record<
        string,
        {
          name: string;
          qty: number;
          val: number;
          products: Record<
            string,
            {
              name: string;
              qty: number;
              val: number;
              skus: Array<{
                sku: string;
                description: string;
                color: string;
                size: string;
                qty: number;
                rate: number;
                val: number;
                swapSku?: string;
              }>;
            }
          >;
        }
      >;
    }
  > = {};

  let overallQty = 0;
  let overallVal = 0;
  let divisionBrandName = "Speed (pvt.) Limited";

  adj.items?.forEach((item) => {
    const divName = item.item?.division?.name || "General Division";
    const catName = item.item?.category?.name || "General Category";
    const prodName = item.item?.description || "General Product";

    if (item.item?.division?.name) {
      divisionBrandName = item.item.division.name.toUpperCase();
    }

    if (!groups[divName]) {
      groups[divName] = { name: divName, qty: 0, val: 0, categories: {} };
    }
    if (!groups[divName].categories[catName]) {
      groups[divName].categories[catName] = {
        name: catName,
        qty: 0,
        val: 0,
        products: {},
      };
    }
    if (!groups[divName].categories[catName].products[prodName]) {
      groups[divName].categories[catName].products[prodName] = {
        name: prodName,
        qty: 0,
        val: 0,
        skus: [],
      };
    }

    let qty = 0;
    if (item.adjustedQty !== undefined && item.adjustedQty !== null) {
      qty = Number(item.adjustedQty);
    } else if (
      item.physicalQty !== undefined &&
      item.currentQty !== undefined
    ) {
      qty = Number(item.physicalQty) - Number(item.currentQty);
    } else {
      qty = Number(item.physicalQty || 0);
    }

    const rate = Number(item.rate || 0);
    const val = qty * rate;

    overallQty += qty;
    overallVal += val;

    groups[divName].qty += qty;
    groups[divName].val += val;
    groups[divName].categories[catName].qty += qty;
    groups[divName].categories[catName].val += val;
    groups[divName].categories[catName].products[prodName].qty += qty;
    groups[divName].categories[catName].products[prodName].val += val;

    groups[divName].categories[catName].products[prodName].skus.push({
      sku: item.item?.sku || "N/A",
      description: item.item?.description || "",
      color: item.item?.color?.name || "N/A",
      size: item.item?.size?.name || "N/A",
      qty,
      rate,
      val,
      swapSku: item.swapItem?.sku,
    });
  });

  // Generate table rows HTML
  let tableRowsHtml = "";
  Object.values(groups).forEach((div) => {
    tableRowsHtml += `
            <tr class="division-row">
                <td class="font-bold text-left">${div.name}</td>
                <td></td>
                <td></td>
                <td class="text-right font-bold">${div.qty}</td>
                <td></td>
                <td class="text-right font-bold">${div.val.toLocaleString("en-PK")}</td>
            </tr>
        `;

    Object.values(div.categories).forEach((cat) => {
      tableRowsHtml += `
                <tr class="category-row">
                    <td class="font-bold text-left indent-1">${cat.name}</td>
                    <td></td>
                    <td></td>
                    <td class="text-right">${cat.qty}</td>
                    <td></td>
                    <td class="text-right font-semibold">${cat.val.toLocaleString("en-PK")}</td>
                </tr>
            `;

      Object.values(cat.products).forEach((prod) => {
        tableRowsHtml += `
                    <tr class="product-row">
                        <td class="font-bold text-left indent-2">${prod.name}</td>
                        <td></td>
                        <td></td>
                        <td class="text-right">${prod.qty}</td>
                        <td></td>
                        <td class="text-right font-semibold">${prod.val.toLocaleString("en-PK")}</td>
                    </tr>
                `;

        prod.skus.forEach((sku) => {
          tableRowsHtml += `
                        <tr class="sku-row">
                            <td class="text-left indent-3">
                                <span style="border-bottom: 1px dotted #999;">${sku.sku}</span> &nbsp;&nbsp;&nbsp;&nbsp; ${sku.description}
                                ${sku.swapSku ? `<br/><span style="color:#d97706; font-size:10px;">(Swapped with: ${sku.swapSku})</span>` : ""}
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td class="text-right">${sku.qty}</td>
                            <td class="text-right">${sku.rate.toLocaleString("en-PK")}</td>
                            <td class="text-right font-medium">${sku.val.toLocaleString("en-PK")}</td>
                        </tr>
                        <tr class="detail-row">
                            <td></td>
                            <td class="text-left">${sku.color}</td>
                            <td class="text-left">${sku.size}</td>
                            <td class="text-right">${sku.qty}</td>
                            <td></td>
                            <td></td>
                        </tr>
                    `;
        });
      });
    });
  });

  win.document.write(`
        <html><head><title>Adjustment Note - ${refNo}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111; padding: 30px 40px; font-size: 11px; }
            
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
            .company-title { font-size: 15px; font-weight: bold; }
            .document-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; display: inline-block; margin-top: 5px; }
            .brand-header { font-size: 20px; font-weight: bold; text-align: right; vertical-align: top; }
            
            .meta-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
            .meta-table td { padding: 4px 0; font-size: 11px; vertical-align: top; }
            .meta-label { font-weight: bold; width: 120px; }
            .status-box { border: 1.5px solid #000; padding: 6px 20px; font-weight: bold; font-size: 13px; text-transform: uppercase; color: ${
              adj.status === "SUBMITTED"
                ? "green"
                : adj.status === "REJECTED" || adj.status === "CANCELLED"
                  ? "red"
                  : "blue"
            }; float: right; margin-top: 10px; }
            
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.data-table th { border-bottom: 2px solid #000; padding: 8px 6px; font-weight: bold; text-align: left; }
            table.data-table td { padding: 6px; vertical-align: middle; border: none; }
            
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            
            .indent-1 { padding-left: 20px !important; }
            .indent-2 { padding-left: 40px !important; }
            .indent-3 { padding-left: 60px !important; }
            
            .division-row td { padding-top: 10px; font-size: 11px; }
            .category-row td { font-size: 11px; }
            .product-row td { font-size: 11px; }
            .sku-row td { font-size: 11px; }
            .detail-row td { color: #444; font-size: 10px; padding-bottom: 8px; border-bottom: 1px dotted #ccc; }
            
            .totals-section { border-top: 2px solid #000; margin-top: 10px; }
            .totals-table { width: 100%; border-collapse: collapse; }
            .totals-table td { padding: 8px; font-weight: bold; font-size: 12px; }
            .double-underline { border-bottom: 3px double #000; }
            
            .remarks-section { margin-top: 25px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 10px; }
            .remarks-label { font-weight: bold; margin-bottom: 4px; }
            
            .signatures { width: 100%; margin-top: 80px; }
            .signatures td { width: 50%; text-align: center; font-weight: bold; font-size: 10px; border-top: 1px solid #000; padding-top: 8px; }
        </style>
        </head>
        <body onload="window.print()">
            <table class="header-table">
                <tr>
                    <td>
                        <div class="company-title">Speed (Private) Limited</div>
                        <div class="document-title">Stock Adjustment Note</div>
                    </td>
                    <td class="brand-header">${divisionBrandName}</td>
                </tr>
            </table>
            
            <table class="meta-table">
                <tr>
                    <td style="width: 50%;">
                        <table style="width: 100%;">
                            <tr>
                                <td class="meta-label">Financial Year :</td>
                                <td>2,026</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Stock Adjusted At :</td>
                                <td>${locationName}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">S.A.N. No :</td>
                                <td style="font-weight: bold;">${refNo}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Employee / User :</td>
                                <td>${adj.createdById || "System"}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Remarks :</td>
                                <td>${adj.reason || "Stock Count Adjustment"}</td>
                            </tr>
                        </table>
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <div style="float: right; text-align: right;">
                            <table style="width: 100%; margin-bottom: 10px;">
                                <tr>
                                    <td class="meta-label" style="text-align: right; padding-right: 15px;">Date :</td>
                                    <td>${dateStr}</td>
                                </tr>
                            </table>
                            <div class="status-box">${statusLabel}</div>
                        </div>
                    </td>
                </tr>
            </table>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="text-left" style="width: 40%;">GPC / Category / Product</th>
                        <th class="text-left" style="width: 15%;">Color</th>
                        <th class="text-left" style="width: 10%;">Size</th>
                        <th class="text-right" style="width: 10%;">Quantity</th>
                        <th class="text-right" style="width: 12%;">Selling Price (Rs.)</th>
                        <th class="text-right" style="width: 13%;">Total Value (Rs.)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <td style="width: 40%;"></td>
                    <td style="width: 15%;"></td>
                    <td style="width: 10%;"></td>
                    <td class="text-right double-underline" style="width: 10%; font-weight: bold; font-size: 11px; padding: 6px;">${overallQty}</td>
                    <td style="width: 12%;"></td>
                    <td class="text-right double-underline" style="font-weight: bold; font-size: 11px; padding: 6px; width: 13%;">${overallVal.toLocaleString(
                      "en-PK",
                    )}</td>
                </tr>
            </table>
            
            ${
              adj.notes
                ? `
                <div class="remarks-section">
                    <div class="remarks-label">Internal Instructions / Notes:</div>
                    <div>${adj.notes}</div>
                </div>
            `
                : ""
            }
            
            <table class="signatures">
                <tr>
                    <td style="padding-right: 40px;">Store Manager / Requester</td>
                    <td style="padding-left: 40px;">ERP Head Office Approval</td>
                </tr>
            </table>
        </body>
        </html>
    `);
  win.document.close();
}
