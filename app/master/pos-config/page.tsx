import { getPromos, getCoupons, getAlliances } from "@/lib/actions/pos-config";
import { getLocations } from "@/lib/actions/location";
import { PosConfigPage } from "./pos-config-page";

export default async function PosConfigMasterPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const sp = await searchParams;
    const [promosRes, couponsRes, alliancesRes, locationsRes] = await Promise.all([
        getPromos(),
        getCoupons(),
        getAlliances(),
        getLocations(),
    ]);

    return (
        <PosConfigPage
            promos={promosRes.data || []}
            coupons={couponsRes.data || []}
            alliances={alliancesRes.data || []}
            locations={locationsRes.data || []}
            defaultTab={sp.tab}
        />
    );
}
