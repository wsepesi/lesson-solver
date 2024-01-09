import type { NextApiRequest, NextApiResponse } from "next";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// import { test } from "lib/schema";

const connectionString = process.env.SUPABASE_CONN_STRING!;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // const client = postgres(connectionString, { prepare: false })
    // const db = drizzle(client)

    // const testData = await db.select().from(test)

    // res.status(200).json({ data: testData })
    res.status(200).json({ data: "hello" })
}