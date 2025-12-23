/**
 * Permission system for admin portal
 * Maps menu items and routes to required auth_levels
 */

export enum AuthLevel {
  SUPER_ADMIN = 1,
  ADMIN = 2,
  MANAGER = 3,
}

export interface MenuPermission {
  // Minimum auth_level required to see this menu item
  minAuthLevel?: number
  // Specific auth_levels that can access (if specified, minAuthLevel is ignored)
  allowedAuthLevels?: number[]
  // Permission key from database (if using granular permissions)
  permissionKey?: string
}

/**
 * Menu item permissions mapping
 * Each menu item can specify who can see it
 */
export const MENU_PERMISSIONS: Record<string, MenuPermission> = {
  // Dashboard - everyone can see (including Managers)
  '/': {},

  // Quotes - Admin and above (Managers cannot see)
  '/quotes': {
    minAuthLevel: AuthLevel.ADMIN,
  },

  // Orders - Admin and above (Managers cannot see)
  '/orders': {
    minAuthLevel: AuthLevel.ADMIN,
  },

  // Customer section - Admin and above
  '/customers': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/companies': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/departments': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/feedbacks': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/coupons': {
    minAuthLevel: AuthLevel.ADMIN,
  },

  // Subscriptions - Admin and above
  '/subscriptions': {
    minAuthLevel: AuthLevel.ADMIN,
  },

  // Admin section items
  '/admin/settings': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/users': {
    minAuthLevel: AuthLevel.ADMIN, // Only Admin and Super Admin
  },
  '/admin/roles': {
    minAuthLevel: AuthLevel.ADMIN, // Only Admin and Super Admin
  },
  '/admin/locations': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/categories': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/products': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/options': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/blogs': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/reviews': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/payments': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/admin/reports': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/contact-inquiries': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/wholesale-enquiries': {
    minAuthLevel: AuthLevel.ADMIN,
  },
  '/history': {
    minAuthLevel: AuthLevel.ADMIN,
  },
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(userAuthLevel: number | undefined, route: string): boolean {
  if (!userAuthLevel) {
    return false
  }

  const permission = MENU_PERMISSIONS[route]

  // If no permission defined, allow access (backward compatibility)
  if (!permission) {
    return true
  }

  // Check specific allowed levels
  if (permission.allowedAuthLevels) {
    return permission.allowedAuthLevels.includes(userAuthLevel)
  }

  // Check minimum auth level
  if (permission.minAuthLevel !== undefined) {
    return userAuthLevel <= permission.minAuthLevel
  }

  // Default: allow access
  return true
}

/**
 * Filter navigation items based on user permissions
 */
export function filterNavigationByPermissions(
  navigation: Array<{ name: string; href: string; hasDropdown?: boolean; items?: Array<{ name: string; href: string }> }>,
  userAuthLevel: number | undefined
): typeof navigation {
  if (!userAuthLevel) {
    return []
  }

  return navigation
    .map((item) => {
      // Check if parent item is accessible
      const canAccessParent = canAccessRoute(userAuthLevel, item.href)

      if (!canAccessParent) {
        return null
      }

      // If has dropdown, filter sub-items
      if (item.hasDropdown && item.items) {
        const filteredItems = item.items.filter((subItem) =>
          canAccessRoute(userAuthLevel, subItem.href)
        )

        // If no sub-items are accessible, hide parent too
        if (filteredItems.length === 0) {
          return null
        }

        return {
          ...item,
          items: filteredItems,
        }
      }

      return item
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

/**
 * Get role name from auth_level
 */
export function getRoleName(authLevel: number): string {
  switch (authLevel) {
    case AuthLevel.SUPER_ADMIN:
      return 'Super Admin'
    case AuthLevel.ADMIN:
      return 'Admin'
    case AuthLevel.MANAGER:
      return 'Manager'
    default:
      return 'User'
  }
}

