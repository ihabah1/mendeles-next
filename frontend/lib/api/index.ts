/** Barrel export for the API service layer. */
export { default as api, extractApiError, setOnAuthFailure } from "./client";
export { API_BASE_URL, AUTH_ENDPOINTS } from "./config";
export { tokenStore } from "./tokens";
export { authService } from "./auth";
export { usersService } from "./users";
export { contentService } from "./content";
export { walletService } from "./wallet";
export { adminService } from "./admin";
export { lottoService } from "./lotto";
export { mapApiOrder, mapApiOrders, orderStatusLabel } from "./mappers";
export type { UiOrder, UiTransaction } from "./mappers";
export type * from "./types";
