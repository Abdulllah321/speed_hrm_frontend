import { useMemo, useState } from "react";
import {
  CostOfSalesReportData,
  CostOfSalesTotals,
  GroupingLevels,
  CostOfSalesTableRow,
} from "./types";

export function useCostOfSalesData(reportData: CostOfSalesReportData | null) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
    brand: true,
    division: true,
    category: true,
    gender: true,
    article: true,
    variant: true,
  });

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Filtered tree data based on search & attribute selections
  const filteredBrands = useMemo(() => {
    if (!reportData || !reportData.brands) return [];
    let list = reportData.brands;

    if (selectedBrands.length > 0) {
      const bSet = new Set(selectedBrands);
      list = list.filter((b) => bSet.has(b.brandName));
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list
      .map((brand) => {
        const filteredDivisions = brand.divisions
          .map((div) => {
            if (selectedDivisions.length > 0 && !selectedDivisions.includes(div.divisionName)) {
              return null;
            }

            const filteredGenders = div.genders
              .map((gender) => {
                const filteredCategories = gender.categories
                  .map((cat) => {
                    if (selectedCategories.length > 0 && !selectedCategories.includes(cat.categoryName)) {
                      return null;
                    }

                    const filteredProducts = cat.products.filter((prod) => {
                      const matchesProd =
                        prod.sku.toLowerCase().includes(q) ||
                        prod.description.toLowerCase().includes(q) ||
                        prod.productLabel.toLowerCase().includes(q);
                      const matchesSizeOrColor = prod.sizes.some(
                        (s) =>
                          s.size.toLowerCase().includes(q) ||
                          (s.color && s.color.toLowerCase().includes(q)),
                      );
                      return matchesProd || matchesSizeOrColor;
                    });

                    if (
                      filteredProducts.length > 0 ||
                      cat.categoryName.toLowerCase().includes(q)
                    ) {
                      return { ...cat, products: filteredProducts.length > 0 ? filteredProducts : cat.products };
                    }
                    return null;
                  })
                  .filter(Boolean) as any[];

                if (
                  filteredCategories.length > 0 ||
                  gender.genderName.toLowerCase().includes(q)
                ) {
                  return { ...gender, categories: filteredCategories };
                }
                return null;
              })
              .filter(Boolean) as any[];

            if (
              filteredGenders.length > 0 ||
              div.divisionName.toLowerCase().includes(q)
            ) {
              return { ...div, genders: filteredGenders };
            }
            return null;
          })
          .filter(Boolean) as any[];

        if (filteredDivisions.length > 0 || brand.brandName.toLowerCase().includes(q)) {
          return { ...brand, divisions: filteredDivisions };
        }
        return null;
      })
      .filter(Boolean) as typeof reportData.brands;
  }, [reportData, searchQuery, selectedBrands, selectedDivisions, selectedCategories]);

  // Grand Totals Calculation
  const grandTotals = useMemo<CostOfSalesTotals>(() => {
    const totals: CostOfSalesTotals = {
      totalProducts: 0,
      quantity: 0,
      totalCost: 0,
      avgUnitCost: 0,
      totalRevenue: 0,
      grossProfit: 0,
      profitMargin: 0,
    };

    if (!filteredBrands) return totals;

    for (const brand of filteredBrands) {
      for (const div of brand.divisions) {
        for (const gender of div.genders) {
          for (const cat of gender.categories) {
            totals.totalProducts += cat.products.length;
            for (const prod of cat.products) {
              totals.quantity += prod.totals.quantity;
              totals.totalCost += prod.totals.totalCost;
              totals.totalRevenue += prod.totals.totalRevenue;
            }
          }
        }
      }
    }

    if (totals.quantity > 0) {
      totals.avgUnitCost = Math.round((totals.totalCost / totals.quantity) * 100) / 100;
    }
    totals.grossProfit = Math.round((totals.totalRevenue - totals.totalCost) * 100) / 100;
    totals.profitMargin = totals.totalRevenue > 0 ? Math.round((totals.grossProfit / totals.totalRevenue) * 10000) / 100 : 0;

    return totals;
  }, [filteredBrands]);

  // Flatten hierarchy into table rows for virtualization
  const flatRows = useMemo<CostOfSalesTableRow[]>(() => {
    const rows: CostOfSalesTableRow[] = [];
    if (!filteredBrands) return rows;

    for (const brand of filteredBrands) {
      if (groupingLevels.brand) {
        rows.push({
          type: "brand",
          id: `brand-${brand.brandId}`,
          label: `BRAND: ${brand.brandName.toUpperCase()}`,
          totals: brand.totals,
        });
      }

      for (const div of brand.divisions) {
        if (groupingLevels.division) {
          rows.push({
            type: "division",
            id: `div-${div.divisionId}`,
            label: `DIVISION: ${div.divisionName.toUpperCase()}`,
            totals: div.totals,
          });
        }

        for (const gender of div.genders) {
          if (groupingLevels.gender) {
            rows.push({
              type: "gender",
              id: `gender-${gender.genderId}`,
              label: `GENDER: ${gender.genderName.toUpperCase()}`,
              totals: gender.totals,
            });
          }

          for (const cat of gender.categories) {
            if (groupingLevels.category) {
              rows.push({
                type: "category",
                id: `cat-${cat.categoryId}`,
                label: `CATEGORY: ${cat.categoryName.toUpperCase()}`,
                totals: cat.totals,
              });
            }

            for (const prod of cat.products) {
              if (groupingLevels.article) {
                rows.push({
                  type: "article",
                  id: `prod-${prod.sku}`,
                  sku: prod.sku,
                  label: prod.description || prod.sku,
                  totals: prod.totals,
                });
              }

              if (groupingLevels.variant) {
                for (const item of prod.sizes) {
                  rows.push({
                    type: "variant",
                    id: `item-${item.id}`,
                    sku: prod.sku,
                    size: item.size,
                    color: item.color,
                    quantity: item.quantity,
                    unitCost: item.costPrice,
                    totalCost: item.totalCost,
                    unitPrice: item.unitPrice,
                    totalRevenue: item.totalRevenue,
                    grossProfit: item.grossProfit,
                    profitMargin: item.profitMargin,
                  });
                }
              }
            }
          }
        }
      }
    }

    return rows;
  }, [filteredBrands, groupingLevels]);

  const handleToggleLevel = (level: keyof GroupingLevels, checked: boolean) => {
    setGroupingLevels((prev) => {
      const next = { ...prev, [level]: checked };
      if (level === "brand" && checked) next.division = true;
      if (level === "division" && !checked) next.brand = false;
      return next;
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    groupingLevels,
    handleToggleLevel,
    selectedBrands,
    setSelectedBrands,
    selectedDivisions,
    setSelectedDivisions,
    selectedCategories,
    setSelectedCategories,
    filteredBrands,
    grandTotals,
    flatRows,
  };
}
