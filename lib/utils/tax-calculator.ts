export function calculateTaxForAccount(
  accountCode: string,
  tagCode: string,
  taxableAmount: number
): number | null {
  if (taxableAmount <= 0) return 0;

  // 12060001 with Tag T00001 (Income Tax Slabs — FY 2026-27, Finance Act 2026)
  if (accountCode === "12060001" && tagCode === "T00001") {
    let tax = 0;

    if (taxableAmount <= 600000) {
      tax = 0;
    } else if (taxableAmount <= 1200000) {
      // 1% on amount exceeding Rs. 600,000
      tax = (taxableAmount - 600000) * 0.01;
    } else if (taxableAmount <= 2200000) {
      // Rs. 6,000 + 11% on amount exceeding Rs. 1,200,000
      tax = 6000 + (taxableAmount - 1200000) * 0.11;
    } else if (taxableAmount <= 3200000) {
      // Rs. 116,000 + 20% on amount exceeding Rs. 2,200,000
      tax = 116000 + (taxableAmount - 2200000) * 0.20;
    } else if (taxableAmount <= 4100000) {
      // Rs. 316,000 + 25% on amount exceeding Rs. 3,200,000
      tax = 316000 + (taxableAmount - 3200000) * 0.25;
    } else if (taxableAmount <= 5600000) {
      // Rs. 541,000 + 29% on amount exceeding Rs. 4,100,000
      tax = 541000 + (taxableAmount - 4100000) * 0.29;
    } else if (taxableAmount <= 7000000) {
      // Rs. 976,000 + 32% on amount exceeding Rs. 5,600,000
      tax = 976000 + (taxableAmount - 5600000) * 0.32;
    } else {
      // Rs. 1,424,800 + 35% on amount exceeding Rs. 7,000,000
      tax = 1424800 + (taxableAmount - 7000000) * 0.35;
    }

    // Note: 9% surcharge (previously on income > Rs. 10,000,000) has been abolished
    // under Finance Act 2026 effective FY 2026-27.

    return Math.round(tax * 100) / 100; // Round to 2 decimal places
  }

  // 12060002 with Tag T00002 (Flat 15% rate)
  if (accountCode === "12060002" && tagCode === "T00002") {
    const tax = taxableAmount * 0.15;
    return Math.round(tax * 100) / 100;
  }

  // 12060003 - WHT Payable-Goods u/s 153(1)(a)
  
  // T00003: 153(1)(a)/2-Goods (ATL) - 1%
  if (accountCode === "12060003" && tagCode === "T00003") {
    return Math.round(taxableAmount * 0.01 * 100) / 100;
  }

  // T00004: 153(1)(a)/2-Goods (Non ATL) - 2%
  if (accountCode === "12060003" && tagCode === "T00004") {
    return Math.round(taxableAmount * 0.02 * 100) / 100;
  }

  // T00005: 153(1)(a)/29-Goods (ATL) - 5%
  if (accountCode === "12060003" && tagCode === "T00005") {
    return Math.round(taxableAmount * 0.05 * 100) / 100;
  }

  // T00006: 153(1)(a)/29-Goods (Non ATL) - 10%
  if (accountCode === "12060003" && tagCode === "T00006") {
    return Math.round(taxableAmount * 0.10 * 100) / 100;
  }

  // T00007: 153(1)(a)/30-Goods (ATL) - 5.5% (other than companies)
  if (accountCode === "12060003" && tagCode === "T00007") {
    return Math.round(taxableAmount * 0.055 * 100) / 100;
  }

  // T00008: 153(1)(a)/30-Goods (Non ATL) - 11% (other than companies)
  if (accountCode === "12060003" && tagCode === "T00008") {
    return Math.round(taxableAmount * 0.11 * 100) / 100;
  }

  // 12060004 - WHT Payable-Services u/s 153(1)(b)

  // T00008S / T00008: 153(1)(b)/29-Services (ATL) - 6%
  if (accountCode === "12060004" && (tagCode === "T00008S" || tagCode === "T00008")) {
    return Math.round(taxableAmount * 0.06 * 100) / 100;
  }

  // T00009: 153(1)(b)/29-Services (Non ATL) - 12%
  if (accountCode === "12060004" && tagCode === "T00009") {
    return Math.round(taxableAmount * 0.12 * 100) / 100;
  }

  // T00010: 153(1)(b)/30-Services (ATL) - 15%
  if (accountCode === "12060004" && tagCode === "T00010") {
    return Math.round(taxableAmount * 0.15 * 100) / 100;
  }

  // T00011: 153(1)(b)/30-Services (Non ATL) - 30%
  if (accountCode === "12060004" && tagCode === "T00011") {
    return Math.round(taxableAmount * 0.30 * 100) / 100;
  }

  // T00012: 153(1)(b)/26-Services (ATL) - IT/IT-enabled - 4%
  if (accountCode === "12060004" && tagCode === "T00012") {
    return Math.round(taxableAmount * 0.04 * 100) / 100;
  }

  // T00013: 153(1)(b)/26-Services (Non ATL) - IT/IT-enabled - 8%
  if (accountCode === "12060004" && tagCode === "T00013") {
    return Math.round(taxableAmount * 0.08 * 100) / 100;
  }

  // T00014: 153(1)(b)/11-Services (ATL) - Advertising (electronic/print media) - 1.5%
  if (accountCode === "12060004" && tagCode === "T00014") {
    return Math.round(taxableAmount * 0.015 * 100) / 100;
  }

  // T00015: 153(1)(b)/11-Services (Non ATL) - Advertising (electronic/print media) - 3%
  if (accountCode === "12060004" && tagCode === "T00015") {
    return Math.round(taxableAmount * 0.03 * 100) / 100;
  }

  // T00022: 153(1)(b)/32-Services (ATL) - Payment for Services u/s 153(1)(b) - 7%
  if (accountCode === "12060004" && tagCode === "T00022") {
    return Math.round(taxableAmount * 0.07 * 100) / 100;
  }

  // T00023: 153(1)(b)/32-Services (Non ATL) - Payment for Services u/s 153(1)(b) - 14%
  if (accountCode === "12060004" && tagCode === "T00023") {
    return Math.round(taxableAmount * 0.14 * 100) / 100;
  }

  // T00024: 153(1)(b)/34-Services (ATL) - Payment for Services u/s 153(1)(b) - 14%
  if (accountCode === "12060004" && tagCode === "T00024") {
    return Math.round(taxableAmount * 0.14 * 100) / 100;
  }
  // T00025: 153(1)(b)/34-Services (Non ATL) - Payment for Services u/s 153(1)(b) - 28%
  if (accountCode === "12060004" && tagCode === "T00025") {
    return Math.round(taxableAmount * 0.28 * 100) / 100;
  }



  // 12060005 - WHT Payable-Rent u/s 155

  // T00016: 155-Rent (Individual/AOP) - Slab-based
  if (accountCode === "12060005" && tagCode === "T00016") {
    let tax = 0;
    if (taxableAmount <= 300000) {
      tax = 0;
    } else if (taxableAmount <= 600000) {
      tax = (taxableAmount - 300000) * 0.05;
    } else if (taxableAmount <= 2000000) {
      tax = 15000 + (taxableAmount - 600000) * 0.10;
    } else {
      tax = 155000 + (taxableAmount - 2000000) * 0.25;
    }
    return Math.round(tax * 100) / 100;
  }

  // T00017: 155-Rent (Company ATL) - 15%
  if (accountCode === "12060005" && tagCode === "T00017") {
    return Math.round(taxableAmount * 0.15 * 100) / 100;
  }

  // T00018: 155-Rent (Company Non ATL) - 30%
  if (accountCode === "12060005" && tagCode === "T00018") {
    return Math.round(taxableAmount * 0.30 * 100) / 100;
  }

  // 12060006 - WHT Payable-Commission u/s 233

  // T00019: 233/2-Commission (ATL) - Brokerage/Commission - 12%
  if (accountCode === "12060006" && tagCode === "T00019") {
    return Math.round(taxableAmount * 0.12 * 100) / 100;
  }

  // T00020: 233/2-Commission (Non ATL) - Brokerage/Commission - 24%
  if (accountCode === "12060006" && tagCode === "T00020") {
    return Math.round(taxableAmount * 0.24 * 100) / 100;
  }

  // 12060007 - WHT Payable-Retailers u/s 236H

  // T00020: 236/H-Retailers (ATL) - 0.5%
  if (accountCode === "12060007" && tagCode === "T00020") {
    return Math.round(taxableAmount * 0.005 * 100) / 100;
  }

  // T00021: 236/H-Retailers (Non ATL) - 2.5%
  if (accountCode === "12060007" && tagCode === "T00021") {
    return Math.round(taxableAmount * 0.025 * 100) / 100;
  }

  // --- Sales Tax Withheld (ST0001 - ST0007) ---

  // 12040003 - SALES TAX WITHHELD ON PURCHASES (Goods)
  
  // ST0001: Sales Tax Withhled Goods 10% - Registered (Wholesaler, Distributors & Dealers)
  if (accountCode === "12040003" && tagCode === "ST0001") {
    return Math.round(taxableAmount * 0.10 * 100) / 100;
  }

  // ST0002: Sales Tax Withheld Goods 20% - Registered person other than (Wholesaler, Distributors & Dealers)
  if (accountCode === "12040003" && tagCode === "ST0002") {
    return Math.round(taxableAmount * 0.20 * 100) / 100;
  }

  // ST0003: Sales Tax Withheld Goods 5% - Unregistered person
  if (accountCode === "12040003" && tagCode === "ST0003") {
    return Math.round(taxableAmount * 0.05 * 100) / 100;
  }

  // 12040004 - SALES TAX WITHHELD SRB
  
  // ST0004: Sales Tax Withheld SRB - 100% - SRB (Rent)
  if (accountCode === "12040004" && tagCode === "ST0004") {
    return Math.round(taxableAmount * 1.00 * 100) / 100;
  }

  // ST0005: Sales Tax Witheld SRB - 20% - SRB (Services)
  if (accountCode === "12040004" && tagCode === "ST0005") {
    return Math.round(taxableAmount * 0.20 * 100) / 100;
  }

  // 12040005 - SALES TAX WITHHELD PRA
  
  // ST0006: Sales Tax Withheld Service PRA - 20% - PRA (Services)
  if (accountCode === "12040005" && tagCode === "ST0006") {
    return Math.round(taxableAmount * 0.20 * 100) / 100;
  }

  // ST0007: Sales Tax Withheld Service PRA - 100% - PRA (Services)
  if (accountCode === "12040005" && tagCode === "ST0007") {
    return Math.round(taxableAmount * 1.00 * 100) / 100;
  }

  return null; // Return null if it's not a recognized tax account
}
