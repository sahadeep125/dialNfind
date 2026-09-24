"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const ResultsMapLoader = dynamic(() => import("./results-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-2xl" />,
});
