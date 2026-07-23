/**
 * Tests for lib/nav-structure.ts — product resolution from a pathname.
 */
import {
  productForPath,
  PRODUCTS,
  PRODUCT_SECTIONS,
  type ProductId,
} from '../nav-structure'

describe('productForPath', () => {
  it('resolves the root path to home', () => {
    expect(productForPath('/')).toBe('home')
  })

  it('does not treat every path as home just because it starts with "/"', () => {
    expect(productForPath('/settings')).not.toBe('home')
  })

  it.each([
    ['/trade-journal', 'journal'],
    ['/diary', 'journal'],
    ['/diary/pre-session', 'journal'],
    ['/missed-trades', 'journal'],
    ['/progress-tracker', 'journal'],
    ['/analytics', 'analytics'],
    ['/analytics/compare', 'analytics'],
    ['/chart-lab/equity', 'analytics'],
    ['/history', 'analytics'],
    ['/strategies', 'manage'],
    ['/wallet-management', 'manage'],
    ['/settings', 'manage'],
  ])('resolves %s to %s', (path, expected) => {
    expect(productForPath(path)).toBe(expected as ProductId)
  })

  it('matches on a path segment boundary, not a bare prefix', () => {
    // '/diaryX' must not match the '/diary' product.
    expect(productForPath('/diaryX')).toBe('home')
  })

  it('falls back to home for an unknown path', () => {
    expect(productForPath('/nonexistent')).toBe('home')
  })
})

describe('structure integrity', () => {
  it('defines a section list for every product', () => {
    for (const p of PRODUCTS) {
      expect(PRODUCT_SECTIONS[p.id]).toBeDefined()
      expect(PRODUCT_SECTIONS[p.id].length).toBeGreaterThan(0)
    }
  })

  it("routes every section link to the product that owns it", () => {
    // A link that resolves elsewhere would make the rail flicker to another
    // product when clicked — the bug this test exists to prevent.
    for (const p of PRODUCTS) {
      for (const item of PRODUCT_SECTIONS[p.id]) {
        const links = [item.href, ...(item.children?.map((c) => c.href) ?? [])]
        for (const href of links) {
          const path = href.split('?')[0]
          expect(productForPath(path)).toBe(p.id)
        }
      }
    }
  })

  it('has a landing href that belongs to its own product', () => {
    for (const p of PRODUCTS) {
      expect(productForPath(p.href)).toBe(p.id)
    }
  })
})
