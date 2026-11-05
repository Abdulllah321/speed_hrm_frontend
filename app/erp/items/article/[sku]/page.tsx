import { notFound } from "next/navigation";
import { getArticleBySku } from "@/lib/actions/items";
import { hasPermission } from "@/lib/auth";
import { AccessDenied } from "@/components/auth/access-denied";
import { ArticleMasterView } from "./article-master-view";

interface PageProps {
    params: Promise<{ sku: string }>;
}

export default async function ArticleDetailsPage({ params }: PageProps) {
    const { sku } = await params;
    const decodedSku = decodeURIComponent(sku);

    const result = await getArticleBySku(decodedSku);

    if (!result || !result.status || !result.data) {
        notFound();
    }

    return <ArticleMasterView article={result.data} />;
}

