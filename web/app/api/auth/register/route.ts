import { signInThroughApi } from "@/lib/auth-route";

export async function POST(request: Request) {
  return signInThroughApi(request, "/auth/register", await request.text(), (data) => ({ user: data.user }));
}
