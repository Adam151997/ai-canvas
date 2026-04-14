import { handlers } from "auth.js";
import { authConfig } from "@/lib/auth";

export const { GET, POST } = handlers(authConfig);