import { Router, type IRouter } from "express";
import { db, suppliersTable, messagesTable } from "@workspace/db";
import { sql, asc } from "drizzle-orm";
import { ListSuppliersResponseItem } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/suppliers", async (_req, res) => {
  const rows = await db
    .select({
      id: suppliersTable.id,
      name: suppliersTable.name,
      country: suppliersTable.country,
      threadCount: sql<number>`count(distinct ${messagesTable.shipmentId})::int`,
    })
    .from(suppliersTable)
    .leftJoin(messagesTable, sql`${messagesTable.supplierId} = ${suppliersTable.id}`)
    .groupBy(suppliersTable.id)
    .orderBy(asc(suppliersTable.name));
  res.json(rows.map(r => ListSuppliersResponseItem.parse(r)));
});

export default router;
