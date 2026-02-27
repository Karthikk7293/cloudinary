import { errorResponse } from "@/lib/errors";

export async function POST() {
  return errorResponse(
    "This endpoint has been retired. Use /api/ugc/sign and /api/ugc/confirm instead.",
    410
  );
}
