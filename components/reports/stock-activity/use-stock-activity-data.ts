import { useMemo, useState, useCallback, useEffect } from "react";
import {
  StockActivityReportData,
  StockActivityTotals,
  GroupingLevels,
  StockActivityTableRow,
  StockActivityBrandNode,
} from "./types";

const createEmptyTotals = (): StockActivityTotals => ({
  bf: 0,
  fromWarehouse: 0,
  fromOutlet: 0,
  totalTrfIn: 0,
  toWarehouse: 0,
  toOutlet: 0,
  totalTrfOut: 0,
  exchg: 0,
  refund: 0,
  claim: 0,
  sales: 0,
  adj: 0,
  availableStock: 0,
  transit: 0,
  balance: 0,
});

const addTotals = (target: StockActivityTotals, source: StockActivityTotals) => {
  target.bf += source.bf;
  target.fromWarehouse += source.fromWarehouse;
  target.fromOutlet += source.fromOutlet;
  target.totalTrfIn += source.totalTrfIn;
  target.toWarehouse += source.toWarehouse;
  target.toOutlet += source.toOutlet;
  target.totalTrfOut += source.totalTrfOut;
  target.exchg += source.exchg;
  target.refund += source.refund;
  target.claim += source.claim;
  target.sales += source.sales;
  target.adj += source.adj;
  target.availableStock += source.availableStock;
  target.transit += source.transit;
  target.balance += source.balance;
};

export function useStockActivityData(reportData: StockActivityReportData | null) {
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
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

  // Interactive collapsed nodes state
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (reportData?.reportType) {
      setReportType(reportData.reportType);
    }
  }, [reportData?.reportType]);

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

  // Helper filter function for brand tree
  const filterBrandTree = useCallback(
    (brandList: StockActivityBrandNode[]) => {
      const q = searchQuery.toLowerCase().trim();

      return brandList
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
        .filter(Boolean) as StockActivityBrandNode[];
    },
    [
      searchQuery,
      filterBrands,
      filterDivisions,
      filterCategories,
      filterGenders,
      filterSilhouettes,
      filterSizes,
      filterColors,
    ],
  );

  // Grand Totals Calculation
  const grandTotals = useMemo<StockActivityTotals>(() => {
    if (!reportData) return createEmptyTotals();
    return reportData.grandTotals || createEmptyTotals();
  }, [reportData]);

  // Collapse All Nodes
  const collapseAll = useCallback(() => {
    const allNodeIds = new Set<string>();
    if (reportData?.locations) {
      for (const loc of reportData.locations) {
        allNodeIds.add(`loc-${loc.locationKey}`);
      }
    }
    setCollapsedNodes(allNodeIds);
  }, [reportData]);

  // Flatten hierarchy into table rows respecting collapse state & grouping levels
  const flatRows = useMemo<StockActivityTableRow[]>(() => {
    const rows: StockActivityTableRow[] = [];
    if (!reportData) return rows;

    const flattenBrands = (brandList: StockActivityBrandNode[], depthOffset: number, prefix: string) => {
      const filtered = filterBrandTree(brandList);

      for (const brand of filtered) {
        const brandId = `${prefix}-brand-${brand.brandId}`;
        const isBrandCollapsed = collapsedNodes.has(brandId);
        const hasDivisions = brand.divisions.length > 0;

        if (groupingLevels.brand) {
          rows.push({
            type: "brand",
            id: brandId,
            nodeId: brandId,
            label: brand.brandName.toUpperCase(),
            totals: brand.totals,
            depth: depthOffset,
            hasChildren: hasDivisions,
            isExpanded: !isBrandCollapsed,
          });
        }

        if (!isBrandCollapsed) {
          for (const div of brand.divisions) {
            const divId = `${prefix}-div-${brand.brandId}-${div.divisionId}`;
            const isDivCollapsed = collapsedNodes.has(divId);
            const hasGenders = div.genders.length > 0;

            if (groupingLevels.division) {
              rows.push({
                type: "division",
                id: divId,
                nodeId: divId,
                label: div.divisionName.toUpperCase(),
                totals: div.totals,
                depth: depthOffset + 1,
                hasChildren: hasGenders,
                isExpanded: !isDivCollapsed,
              });
            }

            if (!isDivCollapsed) {
              for (const gender of div.genders) {
                const genderId = `${prefix}-gender-${brand.brandId}-${div.divisionId}-${gender.genderId}`;
                const isGenderCollapsed = collapsedNodes.has(genderId);
                const hasCategories = gender.categories.length > 0;

                if (groupingLevels.gender) {
                  rows.push({
                    type: "gender",
                    id: genderId,
                    nodeId: genderId,
                    label: gender.genderName.toUpperCase(),
                    totals: gender.totals,
                    depth: depthOffset + 2,
                    hasChildren: hasCategories,
                    isExpanded: !isGenderCollapsed,
                  });
                }

                if (!isGenderCollapsed) {
                  for (const cat of gender.categories) {
                    const catId = `${prefix}-cat-${brand.brandId}-${div.divisionId}-${gender.genderId}-${cat.categoryId}`;
                    const isCatCollapsed = collapsedNodes.has(catId);
                    const hasProducts = cat.products.length > 0;

                    if (groupingLevels.category) {
                      rows.push({
                        type: "category",
                        id: catId,
                        nodeId: catId,
                        label: cat.categoryName.toUpperCase(),
                        totals: cat.totals,
                        depth: depthOffset + 3,
                        hasChildren: hasProducts,
                        isExpanded: !isCatCollapsed,
                      });
                    }

                    if (!isCatCollapsed) {
                      for (const prod of cat.products) {
                        const prodId = `${prefix}-prod-${brand.brandId}-${cat.categoryId}-${prod.sku}`;
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
                            depth: depthOffset + 4,
                            hasChildren: hasSizes,
                            isExpanded: !isProdCollapsed,
                          });
                        }

                        if (!isProdCollapsed && groupingLevels.variant) {
                          for (const item of prod.sizes) {
                            rows.push({
                              type: "variant",
                              id: `${prefix}-item-${item.id}`,
                              nodeId: `${prefix}-item-${item.id}`,
                              sku: prod.sku,
                              barCode: item.barCode,
                              size: item.size,
                              color: item.color,
                              totals: item.totals,
                              depth: depthOffset + 5,
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
    };

    if (reportData.reportType === "separate" && reportData.locations && reportData.locations.length > 0) {
      for (const loc of reportData.locations) {
        const locId = `loc-${loc.locationKey}`;
        const isLocCollapsed = collapsedNodes.has(locId);
        const hasBrands = loc.brands.length > 0;

        rows.push({
          type: "location",
          id: locId,
          nodeId: locId,
          label: loc.locationName.toUpperCase(),
          locationName: loc.locationName,
          totals: loc.totals,
          depth: 0,
          hasChildren: hasBrands,
          isExpanded: !isLocCollapsed,
        });

        if (!isLocCollapsed && hasBrands) {
          flattenBrands(loc.brands, 1, loc.locationKey);
        }
      }
    } else if (reportData.brands) {
      flattenBrands(reportData.brands, 0, "merged");
    }

    return rows;
  }, [reportData, groupingLevels, collapsedNodes, filterBrandTree]);

  const handleToggleLevel = (level: keyof GroupingLevels, checked: boolean) => {
    setGroupingLevels((prev) => {
      const next = { ...prev, [level]: checked };
      if (level === "brand" && checked) next.division = true;
      if (level === "division" && !checked) next.brand = false;
      return next;
    });
  };

  const filteredBrands = useMemo(() => {
    if (!reportData?.brands) return [];
    return filterBrandTree(reportData.brands);
  }, [reportData?.brands, filterBrandTree]);

  return {
    reportType,
    setReportType,
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
