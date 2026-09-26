import { APP_LINK_PATHS, IOS_APP_ID } from "@/lib/app-links";

export const dynamic = "force-static";

/** iOS universal links: which paths the DialNFind app may open. Served as JSON without a file extension. */
export function GET() {
  return Response.json({
    applinks: {
      details: [{ appIDs: [IOS_APP_ID], components: APP_LINK_PATHS.map((path) => ({ "/": path })) }],
    },
  });
}
