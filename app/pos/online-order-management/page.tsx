import { OnlineOrderList } from "./online-order-list";

export const dynamic = "force-dynamic";

export default async function OnlineOrderManagementPage() {
    return (
        <div className="px-5 mx-auto py-10">
            <OnlineOrderList />
        </div>
    );
}
