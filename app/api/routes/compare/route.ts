import { ROUTE_COMPARISON } from "@/lib/content/routeComparison";
import { api } from "@/server/http";

export const GET = api(async () => ROUTE_COMPARISON);
