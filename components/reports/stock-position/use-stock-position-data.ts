import { useMemo, useState, useCallback } from "react";
import {
  StockPositionReportData,
  StockPositionTotals,
  GroupingLevels,
  StockPositionTableRow,
  StockPositionFlatRecord,
} from "./types";

const createEmptyTotals = (): StockPositionTotals => ({
  launchQty: 0,
  beginning: 0,
  netSales: 0,
  end: 0,
  totalQty: 0,
  sellThroughPercent: 0,
  opening: 0,
  purchases: 0,
  purchaseReturns: 0,
  netPurchases: 0,
  positiveAdjustments: 0,
  negativeAdjustments: 0,
  netAdjustments: 0,
  sales: 0,
  salesReturns: 0,
});

const addTotals = (target: StockPositionTotals, source: StockPositionTotals) => {
  target.launchQty += Number(source.launchQty) || 0;
  target.beginning += Number(source.beginning) || 0;
  target.netSales += Number(source.netSales) || 0;
  target.end += Number(source.end) || 0;
  const actualTotal =
    source.totalQty !== undefined && source.totalQty !== null && Number(source.totalQty) !== 0
      ? Number(source.totalQty)
      : Number(source.end) || 0;
  target.totalQty += actualTotal;
  target.opening += source.opening || 0;
  target.purchases += source.purchases || 0;
  target.purchaseReturns += source.purchaseReturns || 0;
  target.netPurchases += source.netPurchases || 0;
  target.positiveAdjustments += source.positiveAdjustments || 0;
  target.negativeAdjustments += source.negativeAdjustments || 0;
  target.netAdjustments += source.netAdjustments || 0;
  target.sales += source.sales || 0;
  target.salesReturns += source.salesReturns || 0;
  target.sellThroughPercent =
    target.beginning > 0 ? (target.netSales / target.beginning) * 100 : 0;
};

export function useStockPositionData(reportData: StockPositionReportData | null) {
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
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
  const [filterSeasons, setFilterSeasons] = useState<Set<string>>(new Set());

  // Interactive collapsed nodes state for Tree view
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

  const collapseAll = useCallback(() => {
    if (!reportData?.brands) return;
    const allNodeIds = new Set<string>();
    reportData.brands.forEach((brand) => {
      allNodeIds.add(`brand-${brand.brandName}`);
      brand.divisions?.forEach((div) => {
        allNodeIds.add(`div-${brand.brandName}-${div.divisionName}`);
        (div.genders || []).forEach((gen) => {
          allNodeIds.add(`gen-${brand.brandName}-${div.divisionName}-${gen.genderName}`);
          (gen.categories || []).forEach((cat) => {
            allNodeIds.add(`cat-${brand.brandName}-${div.divisionName}-${gen.genderName}-${cat.categoryName}`);
            (cat.products || []).forEach((prod) => {
              allNodeIds.add(`prod-${brand.brandName}-${div.divisionName}-${gen.genderName}-${cat.categoryName}-${prod.sku}`);
            });
          });
        });
        (div.categories || []).forEach((cat: any) => {
          allNodeIds.add(`cat-${brand.brandName}-${div.divisionName}-${cat.categoryName}`);
          (cat.genders || []).forEach((gen: any) => {
            allNodeIds.add(`gen-${brand.brandName}-${div.divisionName}-${cat.categoryName}-${gen.genderName}`);
            (gen.products || []).forEach((prod: any) => {
              allNodeIds.add(`prod-${brand.brandName}-${div.divisionName}-${cat.categoryName}-${gen.genderName}-${prod.sku}`);
            });
          });
        });
      });
    });
    setCollapsedNodes(allNodeIds);
  }, [reportData]);

  // Extract filter options from flat items
  const filterOptions = useMemo(() => {
    const brands = new Set<string>();
    const divisions = new Set<string>();
    const categories = new Set<string>();
    const genders = new Set<string>();
    const silhouettes = new Set<string>();
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const seasons = new Set<string>();

    if (reportData?.flatItems) {
      for (const item of reportData.flatItems) {
        if (item.brand && item.brand !== "N/A") brands.add(item.brand);
        if (item.division && item.division !== "N/A") divisions.add(item.division);
        if (item.productCategory && item.productCategory !== "N/A") categories.add(item.productCategory);
        if (item.gender && item.gender !== "N/A") genders.add(item.gender);
        if (item.silhouette && item.silhouette !== "N/A") silhouettes.add(item.silhouette);
        if (item.size && item.size !== "N/A") sizes.add(item.size);
        if (item.color && item.color !== "N/A") colors.add(item.color);
        if (item.season && item.season !== "N/A") seasons.add(item.season);
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
      seasons: Array.from(seasons).sort(),
    };
  }, [reportData?.flatItems]);

  // Filter flat items by active search & attribute filters
  const flatFilteredItems = useMemo(() => {
    if (!reportData?.flatItems) return [];

    const q = searchQuery.toLowerCase().trim();

    return reportData.flatItems.filter((item) => {
      // Search query across SKU, Barcode, ItemName, Color, Brand, Category, etc.
      if (q) {
        const match =
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.barCode && item.barCode.toLowerCase().includes(q)) ||
          (item.itemName && item.itemName.toLowerCase().includes(q)) ||
          (item.color && item.color.toLowerCase().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.division && item.division.toLowerCase().includes(q)) ||
          (item.productCategory && item.productCategory.toLowerCase().includes(q)) ||
          (item.season && item.season.toLowerCase().includes(q)) ||
          (item.silhouette && item.silhouette.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (filterBrands.size > 0 && !filterBrands.has(item.brand)) return false;
      if (filterDivisions.size > 0 && !filterDivisions.has(item.division)) return false;
      if (filterCategories.size > 0 && !filterCategories.has(item.productCategory)) return false;
      if (filterGenders.size > 0 && !filterGenders.has(item.gender)) return false;
      if (filterSilhouettes.size > 0 && !filterSilhouettes.has(item.silhouette)) return false;
      if (filterSizes.size > 0 && !filterSizes.has(item.size)) return false;
      if (filterColors.size > 0 && !filterColors.has(item.color)) return false;
      if (filterSeasons.size > 0 && !filterSeasons.has(item.season)) return false;

      return true;
    });
  }, [
    reportData?.flatItems,
    searchQuery,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
    filterSeasons,
  ]);

  // Compute grand totals from filtered items
  const grandTotals = useMemo(() => {
    const totals = createEmptyTotals();
    for (const item of flatFilteredItems) {
      totals.launchQty += Number(item.launchQty) || 0;
      totals.beginning += Number(item.beginning) || 0;
      totals.netSales += Number(item.netSales) || 0;
      totals.end += Number(item.end) || 0;
      totals.totalQty += Number(item.totalQty) || 0;
    }
    totals.sellThroughPercent =
      totals.beginning > 0 ? (totals.netSales / totals.beginning) * 100 : 0;
    return totals;
  }, [flatFilteredItems]);

  // Construct Tree Rows when viewMode === "tree"
  const treeRows = useMemo(() => {
    if (viewMode !== "tree" || !reportData?.brands) return [];

    const rows: StockPositionTableRow[] = [];
    const q = searchQuery.toLowerCase().trim();

    // Check if variant passes current filters
    const variantPasses = (v: StockPositionFlatRecord | any) => {
      if (q) {
        const match =
          (v.sku && v.sku.toLowerCase().includes(q)) ||
          (v.barCode && v.barCode.toLowerCase().includes(q)) ||
          (v.itemName && v.itemName.toLowerCase().includes(q)) ||
          (v.color && v.color.toLowerCase().includes(q)) ||
          (v.season && v.season.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterSizes.size > 0 && !filterSizes.has(v.size)) return false;
      if (filterColors.size > 0 && !filterColors.has(v.color)) return false;
      if (filterSeasons.size > 0 && !filterSeasons.has(v.season)) return false;
      if (filterSilhouettes.size > 0 && !filterSilhouettes.has(v.silhouette)) return false;
      return true;
    };

    for (const brand of reportData.brands) {
      if (filterBrands.size > 0 && !filterBrands.has(brand.brandName)) continue;

      const brandNodeId = `brand-${brand.brandName}`;
      const isBrandCollapsed = collapsedNodes.has(brandNodeId);
      const brandTotals = createEmptyTotals();
      const brandRows: StockPositionTableRow[] = [];

      for (const div of brand.divisions || []) {
        if (filterDivisions.size > 0 && !filterDivisions.has(div.divisionName)) continue;

        const divNodeId = `div-${brand.brandName}-${div.divisionName}`;
        const isDivCollapsed = collapsedNodes.has(divNodeId);
        const divTotals = createEmptyTotals();
        const divRows: StockPositionTableRow[] = [];

        // Check if division has genders (standard backend structure)
        const genders = div.genders || [];
        if (genders.length > 0) {
          for (const gen of genders) {
            if (filterGenders.size > 0 && !filterGenders.has(gen.genderName)) continue;

            const genNodeId = `gen-${brand.brandName}-${div.divisionName}-${gen.genderName}`;
            const isGenCollapsed = collapsedNodes.has(genNodeId);
            const genTotals = createEmptyTotals();
            const genRows: StockPositionTableRow[] = [];

            for (const cat of gen.categories || []) {
              if (filterCategories.size > 0 && !filterCategories.has(cat.categoryName)) continue;

              const catNodeId = `cat-${brand.brandName}-${div.divisionName}-${gen.genderName}-${cat.categoryName}`;
              const isCatCollapsed = collapsedNodes.has(catNodeId);
              const catTotals = createEmptyTotals();
              const catRows: StockPositionTableRow[] = [];

              for (const prod of cat.products || []) {
                const prodNodeId = `prod-${brand.brandName}-${div.divisionName}-${gen.genderName}-${cat.categoryName}-${prod.sku}`;
                const isProdCollapsed = collapsedNodes.has(prodNodeId);
                const prodTotals = createEmptyTotals();
                const variantRows: StockPositionTableRow[] = [];

                for (const v of prod.sizes || []) {
                  if (!variantPasses(v)) continue;

                  addTotals(prodTotals, v.totals);

                  if (groupingLevels.variant) {
                    variantRows.push({
                      id: `var-${v.id}`,
                      type: "variant",
                      brand: brand.brandName,
                      sku: v.sku,
                      itemName: prod.description || prod.itemName || prod.sku,
                      barCode: v.barCode,
                      size: v.size,
                      color: v.color,
                      division: v.division,
                      department: v.department,
                      productCategory: v.productCategory,
                      silhouette: v.silhouette,
                      class: v.class,
                      subclass: v.subclass,
                      season: v.season,
                      oldSeason: v.oldSeason,
                      gender: v.gender,
                      case: v.case,
                      band: v.band,
                      movementType: v.movementType,
                      heelHeight: v.heelHeight,
                      width: v.width,
                      channelClass: v.channelClass,
                      discountPercent: v.discountPercent,
                      rirRp: v.rirRp,
                      currentRp: v.currentRp,
                      fob: v.fob,
                      launchDate: v.launchDate,
                      lastGrnNumber: v.lastGrnNumber,
                      lastGrnDate: v.lastGrnDate,
                      lastLcNumber: v.lastLcNumber || v.lastGrnNumber,
                      lastLcDate: v.lastLcDate || v.lastGrnDate,
                      lastSaleDate: v.lastSaleDate,
                      lastSaleOutletBreakdown: v.lastSaleOutletBreakdown,
                      depth: 5,
                      totals: {
                        ...v.totals,
                        totalQty: Number(v.totals?.totalQty) || 0,
                      },
                    });
                  }
                }

                if (variantRows.length > 0 || prodTotals.beginning > 0 || prodTotals.netSales > 0 || prodTotals.totalQty > 0) {
                  addTotals(catTotals, prodTotals);

                  if (groupingLevels.article) {
                    const firstSize = prod.sizes?.[0];
                    catRows.push({
                      id: prodNodeId,
                      nodeId: prodNodeId,
                      type: "article",
                      label: `${prod.sku} - ${prod.description || prod.itemName || "Item"}`,
                      sku: prod.sku,
                      itemName: prod.description || prod.itemName,
                      discountPercent: prod.discountPercent ?? firstSize?.discountPercent,
                      rirRp: prod.rirRp ?? firstSize?.rirRp,
                      currentRp: prod.currentRp ?? firstSize?.currentRp,
                      fob: prod.fob ?? firstSize?.fob,
                      launchDate: prod.launchDate ?? firstSize?.launchDate,
                      lastGrnNumber: prod.lastGrnNumber ?? firstSize?.lastGrnNumber,
                      lastGrnDate: prod.lastGrnDate ?? firstSize?.lastGrnDate,
                      lastLcNumber: prod.lastLcNumber ?? firstSize?.lastLcNumber ?? firstSize?.lastGrnNumber,
                      lastLcDate: prod.lastLcDate ?? firstSize?.lastLcDate ?? firstSize?.lastGrnDate,
                      lastSaleDate: prod.lastSaleDate ?? firstSize?.lastSaleDate,
                      lastSaleOutletBreakdown: prod.lastSaleOutletBreakdown ?? firstSize?.lastSaleOutletBreakdown,
                      depth: 4,
                      hasChildren: variantRows.length > 0,
                      isExpanded: !isProdCollapsed,
                      totals: prodTotals,
                    });

                    if (!isProdCollapsed && groupingLevels.variant) {
                      catRows.push(...variantRows);
                    }
                  } else if (groupingLevels.variant) {
                    catRows.push(...variantRows);
                  }
                }
              }

              if (catRows.length > 0) {
                addTotals(genTotals, catRows.length > 0 ? catTotals : createEmptyTotals());

                if (groupingLevels.category) {
                  genRows.push({
                    id: catNodeId,
                    nodeId: catNodeId,
                    type: "category",
                    label: cat.categoryName || "All Categories",
                    productCategory: cat.categoryName,
                    depth: 3,
                    hasChildren: catRows.length > 0,
                    isExpanded: !isCatCollapsed,
                    totals: catTotals,
                  });

                  if (!isCatCollapsed) {
                    genRows.push(...catRows);
                  }
                } else {
                  genRows.push(...catRows);
                }
              }
            }

            if (genRows.length > 0) {
              addTotals(divTotals, genTotals);

              if (groupingLevels.gender) {
                divRows.push({
                  id: genNodeId,
                  nodeId: genNodeId,
                  type: "gender",
                  label: gen.genderName || "All Genders",
                  gender: gen.genderName,
                  depth: 2,
                  hasChildren: genRows.length > 0,
                  isExpanded: !isGenCollapsed,
                  totals: genTotals,
                });

                if (!isGenCollapsed) {
                  divRows.push(...genRows);
                }
              } else {
                divRows.push(...genRows);
              }
            }
          }
        } else if ((div as any).categories?.length > 0) {
          // Fallback if categories are nested directly under division
          for (const cat of (div as any).categories) {
            if (filterCategories.size > 0 && !filterCategories.has(cat.categoryName)) continue;

            const catNodeId = `cat-${brand.brandName}-${div.divisionName}-${cat.categoryName}`;
            const isCatCollapsed = collapsedNodes.has(catNodeId);
            const catTotals = createEmptyTotals();
            const catRows: StockPositionTableRow[] = [];

            const gendersUnderCat = cat.genders || [{ genderName: "All Genders", products: cat.products || [] }];
            for (const gen of gendersUnderCat) {
              if (filterGenders.size > 0 && !filterGenders.has(gen.genderName)) continue;

              const genNodeId = `gen-${brand.brandName}-${div.divisionName}-${cat.categoryName}-${gen.genderName}`;
              const isGenCollapsed = collapsedNodes.has(genNodeId);
              const genTotals = createEmptyTotals();
              const genRows: StockPositionTableRow[] = [];

              for (const prod of gen.products || []) {
                const prodNodeId = `prod-${brand.brandName}-${div.divisionName}-${cat.categoryName}-${gen.genderName}-${prod.sku}`;
                const isProdCollapsed = collapsedNodes.has(prodNodeId);
                const prodTotals = createEmptyTotals();
                const variantRows: StockPositionTableRow[] = [];

                for (const v of prod.sizes || []) {
                  if (!variantPasses(v)) continue;
                  addTotals(prodTotals, v.totals);
                  if (groupingLevels.variant) {
                    variantRows.push({
                      id: `var-${v.id}`,
                      type: "variant",
                      brand: brand.brandName,
                      sku: v.sku,
                      itemName: prod.description || prod.itemName || prod.sku,
                      barCode: v.barCode,
                      size: v.size,
                      color: v.color,
                      division: v.division,
                      department: v.department,
                      productCategory: v.productCategory,
                      silhouette: v.silhouette,
                      class: v.class,
                      subclass: v.subclass,
                      season: v.season,
                      oldSeason: v.oldSeason,
                      gender: v.gender,
                      case: v.case,
                      band: v.band,
                      movementType: v.movementType,
                      heelHeight: v.heelHeight,
                      width: v.width,
                      channelClass: v.channelClass,
                      discountPercent: v.discountPercent,
                      rirRp: v.rirRp,
                      currentRp: v.currentRp,
                      fob: v.fob,
                      launchDate: v.launchDate,
                      lastGrnNumber: v.lastGrnNumber,
                      lastGrnDate: v.lastGrnDate,
                      lastSaleDate: v.lastSaleDate,
                      depth: 5,
                      totals: {
                        ...v.totals,
                        totalQty: Number(v.totals?.totalQty) || 0,
                      },
                    });
                  }
                }

                if (variantRows.length > 0 || prodTotals.beginning > 0 || prodTotals.netSales > 0 || prodTotals.totalQty > 0) {
                  addTotals(genTotals, prodTotals);
                  if (groupingLevels.article) {
                    const firstSize = prod.sizes?.[0];
                    genRows.push({
                      id: prodNodeId,
                      nodeId: prodNodeId,
                      type: "article",
                      label: `${prod.sku} - ${prod.description || prod.itemName || "Item"}`,
                      sku: prod.sku,
                      itemName: prod.description || prod.itemName,
                      discountPercent: prod.discountPercent ?? firstSize?.discountPercent,
                      rirRp: prod.rirRp ?? firstSize?.rirRp,
                      currentRp: prod.currentRp ?? firstSize?.currentRp,
                      fob: prod.fob ?? firstSize?.fob,
                      depth: 4,
                      hasChildren: variantRows.length > 0,
                      isExpanded: !isProdCollapsed,
                      totals: prodTotals,
                    });
                    if (!isProdCollapsed && groupingLevels.variant) genRows.push(...variantRows);
                  } else if (groupingLevels.variant) {
                    genRows.push(...variantRows);
                  }
                }
              }

              if (genRows.length > 0) {
                addTotals(catTotals, genTotals);
                if (groupingLevels.gender) {
                  catRows.push({
                    id: genNodeId,
                    nodeId: genNodeId,
                    type: "gender",
                    label: gen.genderName || "All Genders",
                    gender: gen.genderName,
                    depth: 3,
                    hasChildren: genRows.length > 0,
                    isExpanded: !isGenCollapsed,
                    totals: genTotals,
                  });
                  if (!isGenCollapsed) catRows.push(...genRows);
                } else {
                  catRows.push(...genRows);
                }
              }
            }

            if (catRows.length > 0) {
              addTotals(divTotals, catTotals);
              if (groupingLevels.category) {
                divRows.push({
                  id: catNodeId,
                  nodeId: catNodeId,
                  type: "category",
                  label: cat.categoryName || "All Categories",
                  productCategory: cat.categoryName,
                  depth: 2,
                  hasChildren: catRows.length > 0,
                  isExpanded: !isCatCollapsed,
                  totals: catTotals,
                });
                if (!isCatCollapsed) divRows.push(...catRows);
              } else {
                divRows.push(...catRows);
              }
            }
          }
        }

        if (divRows.length > 0) {
          addTotals(brandTotals, divTotals);

          if (groupingLevels.division) {
            brandRows.push({
              id: divNodeId,
              nodeId: divNodeId,
              type: "division",
              label: div.divisionName || "All Divisions",
              division: div.divisionName,
              depth: 1,
              hasChildren: divRows.length > 0,
              isExpanded: !isDivCollapsed,
              totals: divTotals,
            });

            if (!isDivCollapsed) {
              brandRows.push(...divRows);
            }
          } else {
            brandRows.push(...divRows);
          }
        }
      }

      if (brandRows.length > 0) {
        if (groupingLevels.brand) {
          rows.push({
            id: brandNodeId,
            nodeId: brandNodeId,
            type: "brand",
            label: brand.brandName || "All Brands",
            brand: brand.brandName,
            depth: 0,
            hasChildren: brandRows.length > 0,
            isExpanded: !isBrandCollapsed,
            totals: brandTotals,
          });

          if (!isBrandCollapsed) {
            rows.push(...brandRows);
          }
        } else {
          rows.push(...brandRows);
        }
      }
    }

    return rows;
  }, [
    viewMode,
    reportData?.brands,
    searchQuery,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
    filterSeasons,
    collapsedNodes,
    groupingLevels,
  ]);

  // Convert flat filtered items to TableRow items when viewMode === "flat"
  const flatRows = useMemo(() => {
    if (viewMode !== "flat") return [];

    return flatFilteredItems.map((item, idx) => ({
      id: `flat-${item.sku}-${item.barCode || idx}`,
      type: "variant" as const,
      brand: item.brand,
      sku: item.sku,
      itemName: item.itemName,
      barCode: item.barCode,
      size: item.size,
      color: item.color,
      division: item.division,
      department: item.department,
      productCategory: item.productCategory,
      silhouette: item.silhouette,
      class: item.class,
      subclass: item.subclass,
      season: item.season,
      oldSeason: item.oldSeason,
      gender: item.gender,
      case: item.case,
      band: item.band,
      movementType: item.movementType,
      heelHeight: item.heelHeight,
      width: item.width,
      channelClass: item.channelClass,
      discountPercent: item.discountPercent,
      rirRp: item.rirRp,
      currentRp: item.currentRp,
      fob: item.fob,
      launchDate: item.launchDate,
      lastGrnNumber: item.lastGrnNumber,
      lastGrnDate: item.lastGrnDate,
      lastLcNumber: item.lastLcNumber || item.lastGrnNumber,
      lastLcDate: item.lastLcDate || item.lastGrnDate,
      lastSaleDate: item.lastSaleDate,
      lastSaleOutletBreakdown: item.lastSaleOutletBreakdown,
      depth: 0,
      totals: {
        launchQty: Number(item.launchQty) || 0,
        beginning: Number(item.beginning) || 0,
        netSales: Number(item.netSales) || 0,
        end: Number(item.end) || 0,
        totalQty: Number(item.totalQty) || 0,
        sellThroughPercent: Number(item.sellThroughPercent) || 0,
        opening: 0,
        purchases: 0,
        purchaseReturns: 0,
        netPurchases: 0,
        positiveAdjustments: 0,
        negativeAdjustments: 0,
        netAdjustments: 0,
        sales: 0,
        salesReturns: 0,
      },
    }));
  }, [viewMode, flatFilteredItems]);

  const rows = viewMode === "tree" ? treeRows : flatRows;

  // Filter toggles
  const toggleBrand = useCallback((b: string) => {
    setFilterBrands((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }, []);

  const toggleDivision = useCallback((d: string) => {
    setFilterDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((c: string) => {
    setFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const toggleGender = useCallback((g: string) => {
    setFilterGenders((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }, []);

  const toggleSilhouette = useCallback((s: string) => {
    setFilterSilhouettes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const toggleSize = useCallback((s: string) => {
    setFilterSizes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const toggleColor = useCallback((c: string) => {
    setFilterColors((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const toggleSeason = useCallback((s: string) => {
    setFilterSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setFilterBrands(new Set());
    setFilterDivisions(new Set());
    setFilterCategories(new Set());
    setFilterGenders(new Set());
    setFilterSilhouettes(new Set());
    setFilterSizes(new Set());
    setFilterColors(new Set());
    setFilterSeasons(new Set());
  }, []);

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    filterBrands.size +
    filterDivisions.size +
    filterCategories.size +
    filterGenders.size +
    filterSilhouettes.size +
    filterSizes.size +
    filterColors.size +
    filterSeasons.size;

  return {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    groupingLevels,
    setGroupingLevels,
    rows,
    flatFilteredItems,
    grandTotals,
    filterOptions,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
    filterSeasons,
    toggleBrand,
    toggleDivision,
    toggleCategory,
    toggleGender,
    toggleSilhouette,
    toggleSize,
    toggleColor,
    toggleSeason,
    clearAllFilters,
    activeFiltersCount,
    collapsedNodes,
    toggleNode,
    expandAll,
    collapseAll,
  };
}
