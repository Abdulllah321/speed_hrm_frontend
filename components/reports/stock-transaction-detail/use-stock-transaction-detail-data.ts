import { useMemo } from "react";
import { FlatItemRecord, AttributeOptions, TransactionTotals } from "./types";

interface UseDataOptions {
    rawItems: FlatItemRecord[];
    searchQuery: string;
    filterBrands: Set<string>;
    filterDivisions: Set<string>;
    filterCategories: Set<string>;
    filterGenders: Set<string>;
    filterSilhouettes: Set<string>;
    filterSizes: Set<string>;
    filterColors: Set<string>;
}

export function useStockTransactionDetailData({
    rawItems,
    searchQuery,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
}: UseDataOptions) {
    // Extract available options for filter dropdowns
    const attributeOptions = useMemo<AttributeOptions>(() => {
        const brands = new Set<string>();
        const divisions = new Set<string>();
        const categories = new Set<string>();
        const genders = new Set<string>();
        const silhouettes = new Set<string>();
        const sizes = new Set<string>();
        const colors = new Set<string>();

        for (const item of rawItems) {
            if (item.brand) brands.add(item.brand);
            if (item.division) divisions.add(item.division);
            if (item.category) categories.add(item.category);
            if (item.gender) genders.add(item.gender);
            if (item.silhouette) silhouettes.add(item.silhouette);
            if (item.size) sizes.add(item.size);
            if (item.color) colors.add(item.color);
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
    }, [rawItems]);

    // Perform multi-attribute filtering & compute running transaction balances
    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        return rawItems.filter((item) => {
            if (filterBrands.size > 0 && !filterBrands.has(item.brand)) return false;
            if (filterDivisions.size > 0 && !filterDivisions.has(item.division)) return false;
            if (filterCategories.size > 0 && !filterCategories.has(item.category)) return false;
            if (filterGenders.size > 0 && !filterGenders.has(item.gender)) return false;
            if (filterSilhouettes.size > 0 && !filterSilhouettes.has(item.silhouette)) return false;
            if (filterSizes.size > 0 && !filterSizes.has(item.size)) return false;
            if (filterColors.size > 0 && !filterColors.has(item.color)) return false;

            if (q) {
                const matchItem =
                    item.sku.toLowerCase().includes(q) ||
                    item.articleName.toLowerCase().includes(q) ||
                    item.barCode.toLowerCase().includes(q) ||
                    item.brand.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q);

                if (matchItem) return true;

                // Also match inside transactions
                const matchTx = item.transactions?.some(
                    (tx) =>
                        tx.docRef?.toLowerCase().includes(q) ||
                        tx.docType?.toLowerCase().includes(q) ||
                        tx.remarks?.toLowerCase().includes(q)
                );

                if (!matchTx) return false;
            }

            return true;
        }).map((item) => {
            // Compute running balance for each transaction row
            let running = item.openingBalance || 0;
            let sumIn = 0;
            let sumOut = 0;
            let sumTransit = 0;

            const enrichedTxs = (item.transactions || []).map((tx) => {
                if (tx.isInTransit) {
                    sumTransit += tx.inQty;
                    return { ...tx, runningBalance: running };
                }
                sumIn += tx.inQty || 0;
                sumOut += tx.outQty || 0;
                running = running + (tx.inQty || 0) - (tx.outQty || 0);
                return { ...tx, runningBalance: running };
            });

            return {
                ...item,
                inQty: sumIn,
                outQty: sumOut,
                inTransitQty: sumTransit,
                closingBalance: running,
                transactions: enrichedTxs,
            };
        });
    }, [
        rawItems,
        searchQuery,
        filterBrands,
        filterDivisions,
        filterCategories,
        filterGenders,
        filterSilhouettes,
        filterSizes,
        filterColors,
    ]);

    // Calculate grand totals across all filtered items
    const grandTotals = useMemo<TransactionTotals>(() => {
        let openingBalance = 0;
        let totalInQty = 0;
        let totalOutQty = 0;
        let inTransitQty = 0;
        let closingBalance = 0;

        for (const item of filteredItems) {
            openingBalance += item.openingBalance || 0;
            totalInQty += item.inQty || 0;
            totalOutQty += item.outQty || 0;
            inTransitQty += item.inTransitQty || 0;
            closingBalance += item.closingBalance || 0;
        }

        return {
            totalItems: filteredItems.length,
            openingBalance,
            totalInQty,
            totalOutQty,
            inTransitQty,
            closingBalance,
        };
    }, [filteredItems]);

    return {
        attributeOptions,
        filteredItems,
        grandTotals,
    };
}
