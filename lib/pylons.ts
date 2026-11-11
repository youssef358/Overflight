// Shared by the browser and the server: types and validation only, no database code here.
import { z } from "zod";

export const CONDITIONS = ["ok", "defect", "not_inspected"] as const;
export const conditionSchema = z.enum(CONDITIONS);
export type Condition = z.infer<typeof conditionSchema>;

export type Pylon = {
  id: number;
  lineCode: string;
  seq: number;
  code: string;
  lat: number;
  lng: number;
  condition: Condition;
  lastInspectedAt: string | null;
};

// GET /api/pylons?condition=defect&line=L-ESS-01
export const listQuerySchema = z.object({
  condition: conditionSchema.optional(),
  line: z.string().min(1).optional(),
});
export type PylonFilters = z.infer<typeof listQuerySchema>;

// PATCH /api/pylons/:id  body: { "condition": "defect" }
export const patchPylonSchema = z.object({ condition: conditionSchema });
