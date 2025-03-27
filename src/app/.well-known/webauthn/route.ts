import { NextResponse } from "next/server";
import { env } from "~/env";

export async function GET() {
  // List of origins that are allowed to use this domain's RP ID
  const origins = {
    origins: env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(",").filter(Boolean) ?? [],
  };

  // Return JSON with proper content-type header
  return NextResponse.json(origins, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
