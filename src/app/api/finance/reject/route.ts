import {  } from "next/server";
import { POST as approveHandler } from "../approve/route";

export const POST = async (request: Request) => {
  const body = await request.json();
  const modifiedBody = { ...body, action: "reject" };
  const fakeReq = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(modifiedBody),
  });
  return approveHandler(fakeReq);
};
