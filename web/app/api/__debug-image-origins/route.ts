import { IMAGE_ORIGINS, isOptimizableImage } from "@/lib/image-hosts";

export async function GET() {
  return Response.json({
    IMAGE_ORIGINS,
    env: process.env.NEXT_PUBLIC_IMAGE_ORIGINS ?? null,
    testUrl: "http://localhost:4000/uploads/covers/2026/09/f1b3cff4-5848-4ad2-a7e6-e50a686117f6.jpg",
    isOptimizable: isOptimizableImage("http://localhost:4000/uploads/covers/2026/09/f1b3cff4-5848-4ad2-a7e6-e50a686117f6.jpg"),
  });
}
