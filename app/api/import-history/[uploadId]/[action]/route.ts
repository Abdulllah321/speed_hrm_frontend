import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string; action: string }> }
) {
  try {
    const { uploadId, action } = await params;
    const token = await getAccessToken();

    if (!token) {
      return NextResponse.json(
        { status: false, message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    const validActions = ["download", "error-report", "success-report"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { status: false, message: "Invalid download action requested" },
        { status: 400 }
      );
    }

    const backendUrl = `${API_URL}/import-history/${uploadId}/${action}`;

    const backendRes = await fetch(backendUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!backendRes.ok) {
      let errorBody = "File download failed";
      try {
        const json = await backendRes.json();
        errorBody = json.message || errorBody;
      } catch {}
      return NextResponse.json(
        { status: false, message: errorBody },
        { status: backendRes.status }
      );
    }

    const contentType =
      backendRes.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      backendRes.headers.get("content-disposition") ||
      `attachment; filename="import-${action}-${uploadId}"`;

    return new Response(backendRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
