"use client";

import React from "react";
import { OverallAvailableReservedStockView } from "@/components/reports/overall-available-reserved-stock/overall-available-reserved-stock-view";

export default function PosOverallAvailableReservedStockPage() {
    return (
        <OverallAvailableReservedStockView
            title="Overall Available & Reserved Stock Report (POS)"
            isPosLevel={true}
        />
    );
}
