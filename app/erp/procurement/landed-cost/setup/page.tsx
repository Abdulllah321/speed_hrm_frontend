'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Grn,
  grnApi,
  landedCostApi,
  hsCodeApi,
  HsCode,
  chartOfAccountApi,
  ChartOfAccount,
  LandedCostChargeType,
  itemApi
} from '@/lib/api';
import { getVendors } from '@/lib/actions/procurement';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Calculator, Save } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

interface LocalItem {
  itemId: string;
  itemName: string;
  sku: string;
  description: string;
  hsCodeId?: string;
  qty: number;
  unitFob: number;
  invoiceForeign: number;
  freightForeign: number;
  exchangeRate: number;
  invoicePKR: number;
  insuranceCharges: number;
  landingCharges: number;
  assessableValue: number;

  // Tax Breakdown
  customsDutyRate: number;
  customsDutyAmount: number;
  regulatoryDutyRate: number;
  regulatoryDutyAmount: number;
  additionalCustomsDutyRate: number;
  additionalCustomsDutyAmount: number;
  salesTaxRate: number;
  salesTaxAmount: number;
  additionalSalesTaxRate: number;
  additionalSalesTaxAmount: number;
  incomeTaxRate: number;
  incomeTaxAmount: number;

  otherChargesPKR: number;
  totalOtherCharges: number;
  unitCostPKR: number;
  totalCostPKR: number;
  dutyPaidValue: number;
  valueForSaleTax: number;
  valueForIncomeTax: number;
  totalDutyAmount: number;
  // MIS Details
  misFreightUSD: number;
  misFreightPKR: number;
  misDoThcPKR: number;
  misBankPKR: number;
  misInsurancePKR: number;
  misClgFwdPKR: number;
  // MIS Metadata
  misFreightInvNo: string;
  misFreightDate: string;
  misDoThcPoNo: string;
  misDoThcDate: string;
  misInsurancePolicyNo: string;
  misClgFwdBillNo: string;
  // Excise (calculated from HS Code like CD/RD/ACD)
  exciseChargesRate: number;
  exciseChargesAmount: number;
  // Shipment Metadata
  lcNo: string;
  blNo: string;
  blDate: string;
  gdNo: string;
  origin: string;
  season: string;
  category: string;
  shippingInv: string;
  invDate: string;
}

export default function LandedCostSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Data State
  const [grns, setGrns] = useState<Grn[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [hsCodes, setHsCodes] = useState<HsCode[]>([]);
  const [chargeTypes, setChargeTypes] = useState<LandedCostChargeType[]>([]);

  // Form State
  const [grnId, setGrnId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [lcNo, setLcNo] = useState('');
  const [blNo, setBlNo] = useState('');
  const [blDate, setBlDate] = useState('');
  const [gdNo, setGdNo] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [season, setSeason] = useState('');
  const [category, setCategory] = useState('');
  const [shippingInvoiceNo, setShippingInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(280);
  const [totalFreight, setTotalFreight] = useState(0);
  const [totalInvoiceValue, setTotalInvoiceValue] = useState(0);

  // Other Charges Detail State (from screenshot)
  const [freightUSD, setFreightUSD] = useState(0);
  const [freightPKR, setFreightPKR] = useState(0);
  const [freightInvNo, setFreightInvNo] = useState('');
  const [freightDate, setFreightDate] = useState('');

  const [doThcCharges, setDoThcCharges] = useState(0);
  const [doThcPoNo, setDoThcPoNo] = useState('');
  const [doThcDate, setDoThcDate] = useState('');

  const [bankCharges, setBankCharges] = useState(0);

  const [mInsuranceCharges, setMInsuranceCharges] = useState(0);
  const [mInsurancePolicyNo, setMInsurancePolicyNo] = useState('');

  const [clgFwdCharges, setClgFwdCharges] = useState(0);
  const [clgFwdBillNo, setClgFwdBillNo] = useState('');


  const [items, setItems] = useState<LocalItem[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [totalFreight, totalInvoiceValue, freightUSD, freightPKR, doThcCharges, bankCharges, mInsuranceCharges, clgFwdCharges, exchangeRate,
    lcNo, blNo, blDate, gdNo, countryOfOrigin, season, category, shippingInvoiceNo, invoiceDate]);

  useEffect(() => {
    console.log('GRNs state updated:', grns);
  }, [grns]);

  const fetchInitialData = async () => {
    try {
      const [grnsRes, vendorsRes, hsRes, ctRes] = await Promise.all([
        grnApi.getAll(),
        getVendors(),
        hsCodeApi.getAll(),
        landedCostApi.listChargeTypes()
      ]);
      console.log('GRN Response:', grnsRes);
      const grnData = Array.isArray(grnsRes) ? grnsRes : (grnsRes as any)?.data || [];
      setGrns(grnData.filter((g: any) => g.status === 'SUBMITTED' || g.status === 'RECEIVED_UNVALUED'));
      if (vendorsRes?.data) setVendors(vendorsRes.data);
      if (hsRes?.data) setHsCodes(hsRes.data);
      if (ctRes?.data) setChargeTypes(ctRes.data);

      // Auto-select GRN from query parameter
      const grnIdFromUrl = searchParams.get('grnId');
      if (grnIdFromUrl) {
        const foundGrn = grnData.find((g: any) => g.id === grnIdFromUrl);
        if (foundGrn) {
          setTimeout(() => onGrnChange(grnIdFromUrl), 500);
        }
      }
    } catch (err) {
      toast.error('Failed to load initial data');
    }
  };

  const onGrnChange = async (id: string) => {
    console.log('onGrnChange triggered with ID:', id);
    setGrnId(id);
    const grn = grns.find(g => g.id === id);
    if (!grn) {
      console.warn('GRN not found in state for ID:', id);
      return;
    }

    setLoading(true);
    try {
      // Auto-set supplier if PO is available in GRN
      if ((grn as any).purchaseOrder?.vendorId) {
        setSupplierId((grn as any).purchaseOrder.vendorId);
      }

      // Map items from GRN - STEP 1: Immediate basic items
      const grnItems = Array.isArray(grn.items) ? grn.items : [];
      console.log('GRN items count:', grnItems.length);

      const basicItems: LocalItem[] = grnItems.map((gi: any) => {
        const poItems = (grn as any).purchaseOrder?.items || [];
        const poItem = poItems.find((pi: any) => String(pi.itemId) === String(gi.itemId));
        const unitFob = poItem ? parseFloat(String(poItem.unitPrice)) : 0;

        return {
          itemId: gi.itemId,
          itemName: gi.itemId, // Temporary
          sku: '',
          description: gi.description || '',
          qty: parseFloat(String(gi.receivedQty || 0)),
          unitFob: unitFob,
          invoiceForeign: 0,
          freightForeign: 0,
          exchangeRate: exchangeRate,
          invoicePKR: 0,
          insuranceCharges: 0,
          landingCharges: 0,
          assessableValue: 0,
          hsCodeId: '',
          customsDutyRate: 0,
          customsDutyAmount: 0,
          regulatoryDutyRate: 0,
          regulatoryDutyAmount: 0,
          additionalCustomsDutyRate: 0,
          additionalCustomsDutyAmount: 0,
          salesTaxRate: 0,
          salesTaxAmount: 0,
          additionalSalesTaxRate: 0,
          additionalSalesTaxAmount: 0,
          incomeTaxRate: 0,
          incomeTaxAmount: 0,
          otherChargesPKR: 0,
          unitCostPKR: 0,
          totalCostPKR: 0,
          dutyPaidValue: 0,
          valueForSaleTax: 0,
          valueForIncomeTax: 0,
          totalDutyAmount: 0,
          misFreightUSD: 0,
          misFreightPKR: 0,
          misDoThcPKR: 0,
          misBankPKR: 0,
          misInsurancePKR: 0,
          misClgFwdPKR: 0,
          misFreightInvNo: '',
          misFreightDate: '',
          misDoThcPoNo: '',
          misDoThcDate: '',
          misInsurancePolicyNo: '',
          misClgFwdBillNo: '',
          exciseChargesRate: 0,
          exciseChargesAmount: 0,
          lcNo: '',
          blNo: '',
          blDate: '',
          gdNo: '',
          origin: '',
          season: '',
          category: '',
          shippingInv: '',
          invDate: '',
        };
      });

      console.log('Setting basic items:', basicItems.length);
      setItems(basicItems);

      const sumInvoice = basicItems.reduce((acc, item) => acc + (item.qty * item.unitFob), 0);
      setTotalInvoiceValue(sumInvoice);

      if (basicItems.length > 0) {
        calculateTotals(basicItems, sumInvoice);
      } else {
        toast.info('No items found in selected GRN');
        setLoading(false);
        return;
      }

      // STEP 2: Fetch details in background and update
      const enrichedItems = await Promise.all(basicItems.map(async (item) => {
        try {
          const itemMasterRes = await itemApi.getByCode(item.itemId);
          const itemMaster = (itemMasterRes as any)?.data || itemMasterRes;

          if (itemMaster) {
            const itemHsCode = (itemMaster.hsCode as any)?.hsCode || itemMaster.hsCodeStr;
            let rates = { cd: 0, rd: 0, acd: 0, st: 0, ast: 0, it: 0, excise: 0 };
            let hsCodeId = '';

            if (itemHsCode) {
              const matchedHs = hsCodes.find(h => String(h.hsCode) === String(itemHsCode));
              if (matchedHs) {
                hsCodeId = matchedHs.id;
                rates = {
                  cd: matchedHs.customsDutyCd,
                  rd: matchedHs.regulatoryDutyRd,
                  acd: matchedHs.additionalCustomsDutyAcd,
                  st: matchedHs.salesTax,
                  ast: matchedHs.additionalSalesTax,
                  it: matchedHs.incomeTax,
                  excise: matchedHs.exciseCharges
                };
              }
            }

            const updatedItem: LocalItem = {
              ...item,
              itemName: itemMaster?.name || itemMaster?.sku || itemMaster?.itemId || item.itemId,
              sku: itemMaster?.sku || itemMaster?.itemId || item.itemId,
              description: itemMaster?.description || item.description || '',
              category: itemMaster?.category?.name || '',
              hsCodeId: hsCodeId,
              customsDutyRate: rates.cd,
              regulatoryDutyRate: rates.rd,
              additionalCustomsDutyRate: rates.acd,
              salesTaxRate: rates.st,
              additionalSalesTaxRate: rates.ast,
              incomeTaxRate: rates.it,
              exciseChargesRate: rates.excise,
            };
            return updatedItem;
          }
          return item;
        } catch (err) {
          console.error('Error enriching item:', item.itemId, err);
          return item;
        }
      })); console.log('Setting enriched items');
      setItems(enrichedItems);
      calculateTotals(enrichedItems);

    } catch (err: any) {
      console.error('onGrnChange Error:', err);
      toast.error('Failed to load items from GRN: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (itemsToUse?: LocalItem[], manualTotalInvoice?: number) => {
    const currentItems = itemsToUse || items;
    if (currentItems.length === 0) return;

    // First, calculate local invoice foreign for all items to get an accurate total
    const itemsWithFullValues = currentItems.map(item => ({
      ...item,
      invoiceForeign: item.qty * item.unitFob
    }));

    const totalInvoiceForeign = itemsWithFullValues.reduce((sum, i) => sum + i.invoiceForeign, 0);
    // Use user-provided total if available, otherwise use calculated sum
    const denominator = (manualTotalInvoice !== undefined && manualTotalInvoice > 0)
      ? manualTotalInvoice
      : (totalInvoiceValue > 0 ? totalInvoiceValue : totalInvoiceForeign);

    const updatedItems = itemsWithFullValues.map(item => {
      // 1. Invoice Foreign (already calculated above)
      const invoiceForeign = item.invoiceForeign;

      // 2. Proportional Freight (based on Manual Total Invoice or Calculated Sum)
      // Formula: Total Freight / Total Invoice Value * Inv ($)
      const freightShare = denominator > 0
        ? (invoiceForeign / denominator) * totalFreight
        : 0;

      // 3. Invoice PKR (Formula: (Inv$ + Freight$) * ExRate)
      const itemFreightPKR = freightShare * exchangeRate;
      const invoicePKR = (invoiceForeign + freightShare) * exchangeRate;

      // 4. Sequential 1%+1% Logic (As per XLS)
      // Step A: Value after Insurance (1% of Inv PKR)
      // Note: subtotalPKR is now same as invoicePKR because invoicePKR includes freight
      const subtotalPKR = invoicePKR;
      const insurance = subtotalPKR * 0.01;
      const valueAfterInsurance = subtotalPKR + insurance;

      // Step B: Landing (1% of Value after Insurance)
      const landing = valueAfterInsurance * 0.01;

      // 5. Assessable Value (AV)
      const assessableValue = valueAfterInsurance + landing;

      // 6. Duties based on Assessable Value
      const cdAmount = (assessableValue * item.customsDutyRate) / 100;
      const rdAmount = (assessableValue * item.regulatoryDutyRate) / 100;
      const acdAmount = (assessableValue * item.additionalCustomsDutyRate) / 100;

      // 7. Sales Tax & AST based on valueForSaleTax (AV + Duties)
      const valueForSaleTax = assessableValue + cdAmount + rdAmount + acdAmount;
      const stAmount = (valueForSaleTax * item.salesTaxRate) / 100;
      const astAmount = (valueForSaleTax * item.additionalSalesTaxRate) / 100;

      // 8. Income Tax based on valueForIncomeTax (ValueForSaleTax + ST + AST)
      const valueForIncomeTax = valueForSaleTax + stAmount + astAmount;
      const itAmount = (valueForIncomeTax * item.incomeTaxRate) / 100;

      // 9. DPV (Duty Paid Value) usually corresponds to valueForSaleTax in this context
      const dpv = valueForSaleTax;

      // 10. Other Charges Distribution (Proportional to Invoice PKR)
      // Use the header "Other Charges" breakdown
      const distributionRatio = (denominator > 0)
        ? (invoiceForeign / denominator)
        : (totalInvoiceForeign > 0 ? (invoiceForeign / totalInvoiceForeign) : 0);

      const misFreightUSDValue = freightUSD * distributionRatio;
      const misFreight = misFreightUSDValue * freightPKR; // freightPKR is the (Ex. rate other) from form
      const misDoThc = doThcCharges * distributionRatio;
      const misBank = bankCharges * distributionRatio;
      const misInsurance = mInsuranceCharges * distributionRatio;
      const misClgFwd = clgFwdCharges * distributionRatio;

      // excise Charges (calculated from HS Code like CD/RD/ACD)
      const exciseAmount = (assessableValue * item.exciseChargesRate) / 100;

      // 11. Total Duty Amount (Sum of all taxes + excise)
      const totalDutyAmount = cdAmount + rdAmount + acdAmount + stAmount + astAmount + itAmount + exciseAmount;

      // 12. Total Cost PKR (Formula requested by user: Inv PKR + CD + RD + ACD + Excise)
      const baseInvoicePKR = invoiceForeign * exchangeRate;
      const totalCostPKR = baseInvoicePKR + cdAmount + rdAmount + acdAmount + exciseAmount;
      const unitCostPKR = item.qty > 0 ? totalCostPKR / item.qty : 0;

      return {
        ...item,
        invoiceForeign,
        freightForeign: freightShare,
        invoicePKR,
        insuranceCharges: insurance,
        landingCharges: landing,
        assessableValue,
        dutyPaidValue: dpv,
        valueForSaleTax: valueForSaleTax,
        valueForIncomeTax: valueForIncomeTax,
        customsDutyAmount: cdAmount,
        regulatoryDutyAmount: rdAmount,
        additionalCustomsDutyAmount: acdAmount,
        salesTaxAmount: stAmount,
        additionalSalesTaxAmount: astAmount,
        incomeTaxAmount: itAmount,
        totalDutyAmount: totalDutyAmount,
        misFreightUSD: misFreightUSDValue,
        misFreightPKR: misFreight,
        misDoThcPKR: misDoThc,
        misBankPKR: misBank,
        misInsurancePKR: misInsurance,
        misClgFwdPKR: misClgFwd,
        totalOtherCharges: misFreight + misDoThc + misBank + misInsurance + misClgFwd,
        misFreightInvNo: freightInvNo,
        misFreightDate: freightDate,
        misDoThcPoNo: doThcPoNo,
        misDoThcDate: doThcDate,
        misInsurancePolicyNo: mInsurancePolicyNo,
        misClgFwdBillNo: clgFwdBillNo,
        exciseChargesAmount: exciseAmount,
        // Shipment Metadata
        lcNo: lcNo,
        blNo: blNo,
        blDate: blDate,
        gdNo: gdNo,
        origin: countryOfOrigin,
        season: season,
        category: category,
        shippingInv: shippingInvoiceNo,
        invDate: invoiceDate,
        unitCostPKR,
        totalCostPKR
      };
    });
    setItems(updatedItems);
  };

  const handleItemChange = (index: number, field: keyof LocalItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    if (field === 'hsCodeId') {
      const hsc = hsCodes.find(h => h.id === value);
      if (hsc) {
        newItems[index].customsDutyRate = Number(hsc.customsDutyCd);
        newItems[index].regulatoryDutyRate = Number(hsc.regulatoryDutyRd);
        newItems[index].additionalCustomsDutyRate = Number(hsc.additionalCustomsDutyAcd);
        newItems[index].salesTaxRate = Number(hsc.salesTax);
        newItems[index].additionalSalesTaxRate = Number(hsc.additionalSalesTax);
        newItems[index].incomeTaxRate = Number(hsc.incomeTax);
        newItems[index].exciseChargesRate = Number(hsc.exciseCharges);
      }
    }

    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!grnId || !supplierId) {
      toast.error('GRN and Supplier are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        grnId,
        supplierId,
        lcNo,
        blNo,
        blDate: blDate || undefined,
        gdNo,
        countryOfOrigin,
        season,
        category,
        shippingInvoiceNo,
        currency,
        exchangeRate,
        // MIS Header Fields
        freightUSD,
        freightPKR,
        freightInvNo,
        freightDate,
        doThcCharges,
        doThcPoNo,
        doThcDate,
        bankCharges,
        insuranceChargesH: mInsuranceCharges,
        insurancePolicyNo: mInsurancePolicyNo,
        clgFwdCharges,
        clgFwdBillNo,
        items: items.map(i => {
          const hsCodeObj = hsCodes.find(h => h.id === i.hsCodeId);
          return {
            itemId: i.itemId,
            sku: i.sku,
            description: i.description,
            hsCode: hsCodeObj?.hsCode || '', // Send the actual string (e.g. "8414.1000")
            qty: i.qty,
            unitFob: i.unitFob,
            freightForeign: i.freightForeign,
            insuranceCharges: i.insuranceCharges,
            landingCharges: i.landingCharges,
            assessableValue: i.assessableValue,
            customsDutyRate: i.customsDutyRate,
            customsDutyAmount: i.customsDutyAmount,
            regulatoryDutyRate: i.regulatoryDutyRate,
            regulatoryDutyAmount: i.regulatoryDutyAmount,
            additionalCustomsDutyRate: i.additionalCustomsDutyRate,
            additionalCustomsDutyAmount: i.additionalCustomsDutyAmount,
            salesTaxRate: i.salesTaxRate,
            salesTaxAmount: i.salesTaxAmount,
            additionalSalesTaxRate: i.additionalSalesTaxRate,
            additionalSalesTaxAmount: i.additionalSalesTaxAmount,
            incomeTaxRate: i.incomeTaxRate,
            incomeTaxAmount: i.incomeTaxAmount,
            exciseChargesAmount: i.exciseChargesAmount,
            unitCostPKR: i.unitCostPKR,
            totalCostPKR: i.totalCostPKR,
            // MIS Item Shares
            misFreightUSD: i.misFreightUSD,
            misFreightPKR: i.misFreightPKR,
            misDoThcPKR: i.misDoThcPKR,
            misBankPKR: i.misBankPKR,
            misInsurancePKR: i.misInsurancePKR,
            misClgFwdPKR: i.misClgFwdPKR,
            misFreightInvNo: i.misFreightInvNo || freightInvNo,
            misFreightDate: i.misFreightDate || freightDate,
            misDoThcPoNo: i.misDoThcPoNo || doThcPoNo,
            misDoThcDate: i.misDoThcDate || doThcDate,
            misInsurancePolicyNo: i.misInsurancePolicyNo || mInsurancePolicyNo,
            misClgFwdBillNo: i.misClgFwdBillNo || clgFwdBillNo,
          };
        })
      };

      const res = await landedCostApi.create(payload);
      toast.success('Landed Cost values posted successfully');
      router.push(`/erp/procurement/landed-cost/report/${res.id}`); // View report
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Landed Cost Setup</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => calculateTotals()}>
            <Calculator className="mr-2 h-4 w-4" /> Calculate
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="mr-2 h-4 w-4" /> {loading ? 'Posting...' : 'Post Landed Cost'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Header Info Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">Header Info</h3>
              <div>
                <Label>Select GRN</Label>
                <Select value={grnId} onValueChange={onGrnChange}>
                  <SelectTrigger><SelectValue placeholder="Select GRN" /></SelectTrigger>
                  <SelectContent>
                    {grns.map(g => <SelectItem key={g.id} value={g.id}>{g.grnNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Currency</Label>
                  <Input value={currency} onChange={e => setCurrency(e.target.value)} />
                </div>
                <div>
                  <Label>Ex. Rate</Label>
                  <Input type="number" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Label>Total Freight ({currency})</Label>
                <Input type="number" value={totalFreight} onChange={e => setTotalFreight(Number(e.target.value))} />
              </div>
              <div>
                <Label>Total Invoice Value ({currency})</Label>
                <Input type="number" value={totalInvoiceValue} onChange={e => setTotalInvoiceValue(Number(e.target.value))} />
              </div>
            </div>

            {/* Shipment Details Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">Shipment Details</h3>
              <div><Label>LC No.</Label><Input value={lcNo} onChange={e => setLcNo(e.target.value)} /></div>
              <div><Label>B/L No.</Label><Input value={blNo} onChange={e => setBlNo(e.target.value)} /></div>
              <div><Label>B/L Date</Label><DatePicker value={blDate} onChange={setBlDate} placeholder="Select B/L Date" /></div>
              <div><Label>GD No.</Label><Input value={gdNo} onChange={e => setGdNo(e.target.value)} /></div>
              <div><Label>Origin</Label><Input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)} /></div>
              <div><Label>Season</Label><Input value={season} onChange={e => setSeason(e.target.value)} /></div>
              <div><Label>Category</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
              <div><Label>Shipping Inv.</Label><Input value={shippingInvoiceNo} onChange={e => setShippingInvoiceNo(e.target.value)} /></div>
              <div><Label>Inv. Date</Label><DatePicker value={invoiceDate} onChange={setInvoiceDate} placeholder="Select Invoice Date" /></div>
            </div>

            {/* Other Charges (MIS Detail) Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">Other Charges (MIS Detail)</h3>
              {/* Freight Section */}
              <div className="border p-2 rounded">
                <p className="text-xs font-bold text-green-700 mb-1">Freight</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">US$ ($)</Label><Input type="number" value={freightUSD} onChange={e => setFreightUSD(Number(e.target.value))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">(Ex. rate other)</Label><Input type="number" value={freightPKR} onChange={e => setFreightPKR(Number(e.target.value))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Invoice No.</Label><Input value={freightInvNo} onChange={e => setFreightInvNo(e.target.value)} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Date</Label><DatePicker value={freightDate} onChange={setFreightDate} placeholder="Date" className="h-7 text-xs" /></div>
                </div>
              </div>

              {/* DO/THC Section */}
              <div className="border p-2 rounded">
                <p className="text-xs font-bold text-green-700 mb-1">DO/THC</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Charges</Label><Input type="number" value={doThcCharges} onChange={e => setDoThcCharges(Number(e.target.value))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">P.O. #</Label><Input value={doThcPoNo} onChange={e => setDoThcPoNo(e.target.value)} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Date</Label><DatePicker value={doThcDate} onChange={setDoThcDate} placeholder="Date" className="h-7 text-xs" /></div>
                </div>
              </div>

              {/* Bank Section */}
              <div className="border p-2 rounded">
                <p className="text-xs font-bold text-green-700 mb-1">Bank</p>
                <Label className="text-[10px]">Charges</Label>
                <Input type="number" value={bankCharges} onChange={e => setBankCharges(Number(e.target.value))} className="h-7 text-xs" />
              </div>

              {/* M. Insurance Section */}
              <div className="border p-2 rounded">
                <p className="text-xs font-bold text-green-700 mb-1">M. Insurance</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Charges</Label><Input type="number" value={mInsuranceCharges} onChange={e => setMInsuranceCharges(Number(e.target.value))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Policy #</Label><Input value={mInsurancePolicyNo} onChange={e => setMInsurancePolicyNo(e.target.value)} className="h-7 text-xs" /></div>
                </div>
              </div>

              {/* Clg/Fwd Section */}
              <div className="border p-2 rounded">
                <p className="text-xs font-bold text-green-700 mb-1">Clg/Fwd</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Charges</Label><Input type="number" value={clgFwdCharges} onChange={e => setClgFwdCharges(Number(e.target.value))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Bill #</Label><Input value={clgFwdBillNo} onChange={e => setClgFwdBillNo(e.target.value)} className="h-7 text-xs" /></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              {/* Primary Header Grouping */}
              <TableRow className="bg-gray-200 border-b-2 border-gray-300">
                <TableHead colSpan={11} className="text-center font-bold border-r border-gray-300">SHIPMENT DETAILS</TableHead>
                <TableHead colSpan={10} className="text-center font-bold border-r border-gray-300 bg-blue-50 text-blue-800">ASSESSABLE VALUE</TableHead>
                <TableHead colSpan={9} className="text-center font-bold border-r border-gray-300 bg-orange-50 text-orange-900">DUTY CALCULATION</TableHead>
                <TableHead colSpan={1} className="text-center font-bold border-r border-gray-300 bg-purple-50 text-purple-900">EXCISE</TableHead>
                <TableHead colSpan={4} className="text-center font-bold border-r border-gray-300 bg-green-100">FREIGHT (MIS)</TableHead>
                <TableHead colSpan={3} className="text-center font-bold border-r border-gray-300 bg-green-100">DO/THC (MIS)</TableHead>
                <TableHead colSpan={1} className="text-center font-bold border-r border-gray-300 bg-green-100">BANK (MIS)</TableHead>
                <TableHead colSpan={2} className="text-center font-bold border-r border-gray-300 bg-green-100">INSURANCE (MIS)</TableHead>
                <TableHead colSpan={2} className="text-center font-bold border-r border-gray-300 bg-green-100">CLG/FWD (MIS)</TableHead>
                <TableHead className="text-center font-bold bg-yellow-50 text-yellow-900 border-r border-gray-300">Total Other Charges</TableHead>
                <TableHead colSpan={3} className="text-center font-bold bg-gray-200">TOTALS</TableHead>
              </TableRow>
              {/* Secondary Detail Header */}
              <TableRow className="bg-gray-100">
                <TableHead>L.C. #</TableHead>
                <TableHead>B.L. #</TableHead>
                <TableHead>B.L. Date</TableHead>
                <TableHead>G.D. #</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Shipping Inv.</TableHead>
                <TableHead>Inv. Date</TableHead>
                <TableHead>SKU No.</TableHead>
                <TableHead className="border-r border-gray-300 min-w-[200px]">Description</TableHead>
                <TableHead className="w-[120px] sticky left-0 bg-gray-100 z-10 border-l font-bold text-blue-800">Item Code</TableHead>
                <TableHead className="w-[120px] font-bold text-blue-800">HS Code</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>FOB ($)</TableHead>
                <TableHead>Inv ($)</TableHead>
                <TableHead>Freight ($)</TableHead>
                <TableHead>Ex. Rate</TableHead>
                <TableHead>Inv PKR</TableHead>
                <TableHead>1%+1%</TableHead>
                <TableHead className="bg-blue-50 font-bold">ASSL. VALUE</TableHead>
                <TableHead>CD Amt</TableHead>
                <TableHead>RD Amt</TableHead>
                <TableHead>ACD Amt</TableHead>
                <TableHead>val Sale Tax</TableHead>
                <TableHead>S.T.</TableHead>
                <TableHead>AST</TableHead>
                <TableHead>val Inc Tax</TableHead>
                <TableHead>I.T.</TableHead>
                <TableHead className="font-bold border-r border-gray-300">Total Duty</TableHead>
                <TableHead className="bg-purple-50 border-r border-gray-300">Charges</TableHead>
                <TableHead>$</TableHead>
                <TableHead>PKR</TableHead>
                <TableHead>Inv No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>P.O. #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Policy #</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead className="border-r border-gray-300">Bill #</TableHead>
                <TableHead className="bg-yellow-50 font-bold border-r border-gray-300">PKR</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead className="bg-green-50 font-bold">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={46} className="text-center py-10 text-gray-500">
                    {grnId ? (
                      <div className="flex flex-col items-center gap-2">
                        <span>Items failed to load from GRN ({grnId})</span>
                        <Button variant="outline" size="sm" onClick={() => onGrnChange(grnId)}>
                          Retry Loading Items
                        </Button>
                      </div>
                    ) : (
                      'Select a GRN to load items'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-[10px]">{item.lcNo}</TableCell>
                    <TableCell className="text-[10px]">{item.blNo}</TableCell>
                    <TableCell className="text-[10px]">{item.blDate}</TableCell>
                    <TableCell className="text-[10px]">{item.gdNo}</TableCell>
                    <TableCell className="text-[10px]">{item.origin}</TableCell>
                    <TableCell className="text-[10px]">{item.season}</TableCell>
                    <TableCell className="text-[10px]">{item.category || '-'}</TableCell>
                    <TableCell className="text-[10px]">{item.shippingInv}</TableCell>
                    <TableCell className="text-[10px]">{item.invDate}</TableCell>
                    <TableCell className="text-[10px] font-bold">{item.sku}</TableCell>
                    <TableCell className="text-[10px] border-r max-w-[200px] truncate" title={item.description}>{item.description}</TableCell>
                    <TableCell className="font-bold text-xs sticky left-0 bg-white z-10 border-l border-r-2 border-r-blue-200 text-blue-800">{item.itemId}</TableCell>
                    <TableCell>
                      <Select value={item.hsCodeId} onValueChange={val => handleItemChange(idx, 'hsCodeId', val)}>
                        <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="HS Code" /></SelectTrigger>
                        <SelectContent>
                          {hsCodes.map(h => <SelectItem key={h.id} value={h.id}>{h.hsCode}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-[10px]">{item.qty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitFob}
                        onChange={e => handleItemChange(idx, 'unitFob', Number(e.target.value))}
                        className="h-7 w-16 text-[10px]"
                      />
                    </TableCell>
                    <TableCell className="text-[10px]">{item.invoiceForeign.toFixed(2)}</TableCell>
                    <TableCell className="text-[10px]">{item.freightForeign.toFixed(2)}</TableCell>
                    <TableCell className="text-[10px]">{exchangeRate}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.invoicePKR).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.insuranceCharges + item.landingCharges).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] font-bold text-blue-600 bg-blue-50">{Math.round(item.assessableValue).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.customsDutyAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.regulatoryDutyAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.additionalCustomsDutyAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.valueForSaleTax).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.salesTaxAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.additionalSalesTaxAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.valueForIncomeTax).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.incomeTaxAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] font-bold border-r">{Math.round(item.totalDutyAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] bg-purple-50 border-r">{Math.round(item.exciseChargesAmount).toLocaleString()}</TableCell>
                    {/* MIS Details Breakdown */}
                    <TableCell className="text-[10px]">{item.misFreightUSD.toFixed(2)}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.misFreightPKR).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{item.misFreightInvNo}</TableCell>
                    <TableCell className="text-[10px]">{item.misFreightDate}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.misDoThcPKR).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{item.misDoThcPoNo}</TableCell>
                    <TableCell className="text-[10px]">{item.misDoThcDate}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.misBankPKR).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.misInsurancePKR).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px]">{item.misInsurancePolicyNo}</TableCell>
                    <TableCell className="text-[10px]">{Math.round(item.misClgFwdPKR).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] border-r">{item.misClgFwdBillNo}</TableCell>
                    <TableCell className="text-[10px] font-bold bg-yellow-50 border-r">{Math.round(item.totalOtherCharges).toLocaleString()}</TableCell>

                    <TableCell className="text-[10px] font-bold">{Math.round(item.unitCostPKR).toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] font-bold bg-green-50">{Math.round(item.totalCostPKR).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
