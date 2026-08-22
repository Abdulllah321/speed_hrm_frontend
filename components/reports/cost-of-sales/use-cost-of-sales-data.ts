import { useMemo, useState, useCallback } from "react";
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

  const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
  const [filterDivisions, setFilterDivisions] = useState<Set<string>>(new Set());
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
  const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(new Set());
  const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
  const [filterColors, setFilterColors] = useState<Set<string>>(new Set());

  // Set of node IDs that are collapsed
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  // Extract available attribute filter options
  const attributeOptions = useMemo(() => {
    const brands = new Set<string>();
    const divisions = new Set<string>();
    const categories = new Set<string>();
    const genders = new Set<string>();
    const silhouettes = new Set<string>();
    const sizes = new Set<string>();
    const colors = new Set<string>();

    if (reportData?.flatItems && reportData.flatItems.length > 0) {
      for (const item of reportData.flatItems) {
        if (item.brand) brands.add(item.brand);
        if (item.division) divisions.add(item.division);
        if (item.category) categories.add(item.category);
        if (item.gender) genders.add(item.gender);
        if (item.silhouette) silhouettes.add(item.silhouette);
        if (item.size) sizes.add(item.size);
        if (item.color) colors.add(item.color);
      }
    } else if (reportData?.brands) {
      for (const b of reportData.brands) {
        if (b.brandName) brands.add(b.brandName);
        for (const d of b.divisions) {
          if (d.divisionName) divisions.add(d.divisionName);
          for (const g of d.genders) {
            if (g.genderName) genders.add(g.genderName);
            for (const c of g.categories) {
              if (c.categoryName) categories.add(c.categoryName);
              for (const p of c.products) {
                for (const s of p.sizes) {
                  if (s.size) sizes.add(s.size);
                  if (s.color) colors.add(s.color);
                }
              }
            }
          }
        }
      }
    }

    return {
      brands: Array.from(brands).sort(),
      divisions: Array.from(divisions).sort(),
      categories: Array.from(categories).sort(),
      genders: Array.from(genders).sort(),
      silhouettes: Array.from(silhouettes).sort(),
      sizes: Array.from(sizes).sort(),
      colors: Array.from(colors).sort(),
    };
  }, [reportData]);

  // Filtered tree data based on search & attribute selections
  const filteredBrands = useMemo(() => {
    if (!reportData || !reportData.brands) return [];
    let list = reportData.brands;

    const q = searchQuery.toLowerCase().trim();

    return list
      .map((brand) => {
        if (filterBrands.size > 0 && !filterBrands.has(brand.brandName)) {
          return null;
        }

        const filteredDivisions = brand.divisions
          .map((div) => {
            if (filterDivisions.size > 0 && !filterDivisions.has(div.divisionName)) {
              return null;
            }

            const filteredGenders = div.genders
              .map((gender) => {
                if (filterGenders.size > 0 && !filterGenders.has(gender.genderName)) {
                  return null;
                }

                const filteredCategories = gender.categories
                  .map((cat) => {
                    if (filterCategories.size > 0 && !filterCategories.has(cat.categoryName)) {
                      return null;
                    }

                    const filteredProducts = cat.products.filter((prod) => {
                      const filteredSizes = prod.sizes.filter((s) => {
                        if (filterSizes.size > 0 && !filterSizes.has(s.size)) return false;
                        if (filterColors.size > 0 && !filterColors.has(s.color)) return false;
                        return true;
                      });

                      if (filterSizes.size > 0 || filterColors.size > 0) {
                        if (filteredSizes.length === 0) return false;
                      }

                      if (!q) return true;

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

                    if (filteredProducts.length > 0) {
                      return { ...cat, products: filteredProducts };
                    }
                    return null;
                  })
                  .filter(Boolean) as any[];

                if (filteredCategories.length > 0) {
                  return { ...gender, categories: filteredCategories };
                }
                return null;
              })
              .filter(Boolean) as any[];

            if (filteredGenders.length > 0) {
              return { ...div, genders: filteredGenders };
            }
            return null;
          })
          .filter(Boolean) as any[];

        if (filteredDivisions.length > 0) {
          return { ...brand, divisions: filteredDivisions };
        }
        return null;
      })
      .filter(Boolean) as typeof reportData.brands;
  }, [
    reportData,
    searchQuery,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
  ]);

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

  // Collapse All Nodes function
  const collapseAll = useCallback(() => {
    const allNodeIds = new Set<string>();
    if (filteredBrands) {
      for (const brand of filteredBrands) {
        allNodeIds.add(`brand-${brand.brandId}`);
        for (const div of brand.divisions) {
          allNodeIds.add(`div-${brand.brandId}-${div.divisionId}`);
          for (const gender of div.genders) {
            allNodeIds.add(`gender-${brand.brandId}-${div.divisionId}-${gender.genderId}`);
            for (const cat of gender.categories) {
              allNodeIds.add(`cat-${brand.brandId}-${div.divisionId}-${gender.genderId}-${cat.categoryId}`);
              for (const prod of cat.products) {
                allNodeIds.add(`prod-${brand.brandId}-${cat.categoryId}-${prod.sku}`);
              }
            }
          }
        }
      }
    }
    setCollapsedNodes(allNodeIds);
  }, [filteredBrands]);

  // Flatten hierarchy into table rows respecting collapse state & grouping levels
  const flatRows = useMemo<CostOfSalesTableRow[]>(() => {
    const rows: CostOfSalesTableRow[] = [];
    if (!filteredBrands) return rows;

    for (const brand of filteredBrands) {
      const brandId = `brand-${brand.brandId}`;
      const isBrandCollapsed = collapsedNodes.has(brandId);
      const hasDivisions = brand.divisions.length > 0;

      if (groupingLevels.brand) {
        rows.push({
          type: "brand",
          id: brandId,
          nodeId: brandId,
          label: brand.brandName.toUpperCase(),
          totals: brand.totals,
          depth: 0,
          hasChildren: hasDivisions,
          isExpanded: !isBrandCollapsed,
        });
      }

      if (!isBrandCollapsed) {
        for (const div of brand.divisions) {
          const divId = `div-${brand.brandId}-${div.divisionId}`;
          const isDivCollapsed = collapsedNodes.has(divId);
          const hasGenders = div.genders.length > 0;

          if (groupingLevels.division) {
            rows.push({
              type: "division",
              id: divId,
              nodeId: divId,
              label: div.divisionName.toUpperCase(),
              totals: div.totals,
              depth: 1,
              hasChildren: hasGenders,
              isExpanded: !isDivCollapsed,
            });
          }

          if (!isDivCollapsed) {
            for (const gender of div.genders) {
              const genderId = `gender-${brand.brandId}-${div.divisionId}-${gender.genderId}`;
              const isGenderCollapsed = collapsedNodes.has(genderId);
              const hasCategories = gender.categories.length > 0;

              if (groupingLevels.gender) {
                rows.push({
                  type: "gender",
                  id: genderId,
                  nodeId: genderId,
                  label: gender.genderName.toUpperCase(),
                  totals: gender.totals,
                  depth: 2,
                  hasChildren: hasCategories,
                  isExpanded: !isGenderCollapsed,
                });
              }

              if (!isGenderCollapsed) {
                for (const cat of gender.categories) {
                  const catId = `cat-${brand.brandId}-${div.divisionId}-${gender.genderId}-${cat.categoryId}`;
                  const isCatCollapsed = collapsedNodes.has(catId);
                  const hasProducts = cat.products.length > 0;

                  if (groupingLevels.category) {
                    rows.push({
                      type: "category",
                      id: catId,
                      nodeId: catId,
                      label: cat.categoryName.toUpperCase(),
                      totals: cat.totals,
                      depth: 3,
                      hasChildren: hasProducts,
                      isExpanded: !isCatCollapsed,
                    });
                  }

                  if (!isCatCollapsed) {
                    for (const prod of cat.products) {
                      const prodId = `prod-${brand.brandId}-${cat.categoryId}-${prod.sku}`;
                      const isProdCollapsed = collapsedNodes.has(prodId);
                      const hasSizes = prod.sizes.length > 0;

                      if (groupingLevels.article) {
                        rows.push({
                          type: "article",
                          id: prodId,
                          nodeId: prodId,
                          sku: prod.sku,
                          label: prod.description || prod.sku,
                          totals: prod.totals,
                          depth: 4,
                          hasChildren: hasSizes,
                          isExpanded: !isProdCollapsed,
                        });
                      }

                      if (!isProdCollapsed && groupingLevels.variant) {
                        for (const item of prod.sizes) {
                          rows.push({
                            type: "variant",
                            id: `item-${item.id}`,
                            nodeId: `item-${item.id}`,
                            sku: prod.sku,
                            barCode: item.barCode,
                            size: item.size,
                            color: item.color,
                            quantity: item.quantity,
                            unitCost: item.costPrice,
                            totalCost: item.totalCost,
                            unitPrice: item.unitPrice,
                            totalRevenue: item.totalRevenue,
                            grossProfit: item.grossProfit,
                            profitMargin: item.profitMargin,
                            depth: 5,
                            hasChildren: false,
                            isExpanded: false,
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return rows;
  }, [filteredBrands, groupingLevels, collapsedNodes]);

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
    setGroupingLevels,
    handleToggleLevel,
    attributeOptions,
    filterBrands,
    setFilterBrands,
    filterDivisions,
    setFilterDivisions,
    filterCategories,
    setFilterCategories,
    filterGenders,
    setFilterGenders,
    filterSilhouettes,
    setFilterSilhouettes,
    filterSizes,
    setFilterSizes,
    filterColors,
    setFilterColors,
    filteredBrands,
    grandTotals,
    flatRows,
    toggleNode,
    expandAll,
    collapseAll,
  };
}
