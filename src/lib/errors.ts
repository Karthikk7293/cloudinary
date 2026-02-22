import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(
  message: string,
  status: number = 500
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}
