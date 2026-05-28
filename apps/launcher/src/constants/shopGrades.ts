export const SHOP_GRADE_ORDER = ['Kaigen', 'Raijin', 'Oni', 'Shogun', 'Archon'] as const
export type ShopGrade = typeof SHOP_GRADE_ORDER[number]

export const SHOP_GRADE_CONFIG: Record<ShopGrade, { color: string; bgX: string }> = {
  Kaigen: { color: '#55FFFF', bgX: '0%'   },
  Raijin: { color: '#FFFF55', bgX: '25%'  },
  Oni:    { color: '#FF5555', bgX: '50%'  },
  Shogun: { color: '#AA00AA', bgX: '75%'  },
  Archon: { color: '#FFAA00', bgX: '100%' },
}
