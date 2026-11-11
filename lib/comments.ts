// Shared by the browser and the server: types and validation only, no database code here.
import { z } from "zod";

export type Comment = {
  id: number;
  body: string;
  createdAt: string;
  authorEmail: string;
};

// POST /api/photos/:id/comments  body: { "body": "..." }
// Trimmed first, so "   " is empty and refused; same limits as the database check.
export const commentBodySchema = z.object({ body: z.string().trim().min(1).max(1000) });
