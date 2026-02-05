/**
 * Client-safe route permission logic. No Node/bcrypt/Prisma imports.
 */

export function canAccessRoute(role: string, pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/admin"

  const adminOnly = [
    "/admin/settings",
    "/admin/donors",
    "/admin/documents",
    "/admin/audit",
    "/admin/analytics",
  ]
  if (adminOnly.some((p) => path === p || path.startsWith(p + "/"))) {
    return role === "ADMIN"
  }

  const viewerHidden = [
    "/admin/masjids",
    "/admin/donors",
    "/admin/documents",
    "/admin/audit",
    "/admin/analytics",
    "/admin/settings",
  ]
  if (role === "VIEWER" && viewerHidden.some((p) => path === p || path.startsWith(p + "/"))) {
    return false
  }

  const staffHidden = [
    "/admin/appeals",
    "/admin/documents",
    "/admin/donations",
    "/admin/recurring",
    "/admin/analytics",
    "/admin/reports",
    "/admin/settings",
  ]
  if (role === "STAFF" && staffHidden.some((p) => path === p || path.startsWith(p + "/"))) {
    return false
  }

  // Staff cannot access "Manage Projects" pages (exact paths only - they can still access pumps, wells, orphans, etc.)
  const staffManageProjectsBlocked = ["/admin/water-projects", "/admin/sponsorships"]
  if (role === "STAFF" && staffManageProjectsBlocked.some((p) => path === p)) {
    return false
  }

  const viewerNoCreate = [
    "/admin/collections/new",
    "/admin/appeals/new",
    "/admin/masjids/new",
    "/admin/water-projects/new",
    "/admin/sponsorships/new",
  ]
  if (role === "VIEWER" && viewerNoCreate.some((p) => path === p || path.startsWith(p + "/"))) {
    return false
  }

  return true
}
