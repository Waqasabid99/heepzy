/**
 * Staff roles. Safe on client and server.
 *  - admin:   the owner. Everything, including staff accounts and the audit log.
 *  - manager: runs the store day to day (orders, customers, catalogue,
 *             inventory, offers, vouchers, content, settings), but can't manage
 *             staff or read the audit log.
 *  - user:    a customer.
 */
export const STAFF_ROLES = ["admin", "manager"];
export const ROLES = ["user", "manager", "admin"];

export const ROLE_LABELS = { user: "Customer", manager: "Manager", admin: "Admin (owner)" };

export const isStaff = (role) => STAFF_ROLES.includes(role);
export const isOwner = (role) => role === "admin";

/** Admin pages only the owner can open (also hidden from managers' navigation). */
export const OWNER_ONLY_PATHS = ["/admin/audit-log"];
