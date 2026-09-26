import { ANDROID_FINGERPRINTS, ANDROID_PACKAGE } from "@/lib/app-links";

export const dynamic = "force-static";

/** Android app links: proves the DialNFind app may open links to this site. */
export function GET() {
  return Response.json(
    ANDROID_FINGERPRINTS.length
      ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: ANDROID_FINGERPRINTS } }]
      : [],
  );
}
