import { requireAuth } from "@/lib/api/auth-guard";
import { POST as approveHandler } from "../approve/route";

export const POST = requireAuth(async (request: Request, session: any) => {
  const body = await request.json();
  const modifiedBody = { ...body, action: "reject" };
  const fakeReq = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(modifiedBody),
  });
  return approveHandler(fakeReq, session);
});
