"use server";

// client-side .update() 改完 bug 後，叫 Next.js 把 /bugs 列表的 RSC cache 失效。
// 不然從 detail 頁回列表 router cache 命中會看到舊 status / assignee。

import { revalidatePath } from "next/cache";

export async function revalidateBugList() {
  revalidatePath("/bugs");
}
