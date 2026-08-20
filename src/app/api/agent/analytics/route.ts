import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent } from '@/lib/agent-auth'

// ── GET: Agent analytics dashboard ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // ── Parallel queries ──────────────────────────────────────────────────

    // 1. Total visits 7d & 30d (count of sessions with page_view events)
    const [totalVisits7d, totalVisits30d] = await Promise.all([
      db.visitorEvent.count({
        where: { agentId, createdAt: { gte: sevenDaysAgo } },
      }),
      db.visitorEvent.count({
        where: { agentId, createdAt: { gte: thirtyDaysAgo } },
      }),
    ])

    // 2. Visits per day (last 7 days)
    const sevenDaysAgoDate = sevenDaysAgo.toISOString().slice(0, 10)
    const visitsPerDayRaw = await db.$queryRawUnsafe<
      Array<{ date: string; count: bigint }>
    >(
      `SELECT date(createdAt) as date, COUNT(*) as count
       FROM VisitorEvent
       WHERE agentId = ? AND createdAt >= ?
       GROUP BY date(createdAt)
       ORDER BY date ASC`,
      agentId,
      sevenDaysAgoDate,
    )
    const visitsPerDay = visitsPerDayRaw.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }))

    // 3. Top visited properties (top 5 by property_view events)
    const topPropertiesRaw = await db.$queryRawUnsafe<
      Array<{ propertySlug: string; count: bigint; title: string }>
    >(
      `SELECT ve.propertySlug, COUNT(*) as count, p.title
       FROM VisitorEvent ve
       LEFT JOIN Property p ON p.slug = ve.propertySlug AND p.agentId = ve.agentId
       WHERE ve.agentId = ? AND ve.eventType = 'property_view'
       GROUP BY ve.propertySlug
       ORDER BY count DESC
       LIMIT 5`,
      agentId,
    )
    const topProperties = topPropertiesRaw
      .filter((r) => r.propertySlug)
      .map((r) => ({
        propertySlug: r.propertySlug,
        title: r.title,
        views: Number(r.count),
      }))

    // 4. Top clicked elements (top 10 by click events)
    const topClicksRaw = await db.$queryRawUnsafe<
      Array<{ elementId: string; elementText: string; count: bigint }>
    >(
      `SELECT
         COALESCE(elementId, 'unknown') as elementId,
         COALESCE(elementText, 'unknown') as elementText,
         COUNT(*) as count
       FROM VisitorEvent
       WHERE agentId = ? AND eventType = 'click'
       GROUP BY elementId, elementText
       ORDER BY count DESC
       LIMIT 10`,
      agentId,
    )
    const topClickedElements = topClicksRaw.map((r) => ({
      elementId: r.elementId,
      elementText: r.elementText,
      clicks: Number(r.count),
    }))

    // 5. Referrers breakdown
    const referrersRaw = await db.$queryRawUnsafe<
      Array<{ referrer: string; count: bigint }>
    >(
      `SELECT
         CASE
           WHEN referrer IS NULL OR referrer = '' THEN 'directo'
           ELSE SUBSTR(referrer, INSTR(referrer, '://') + 3,
                CASE WHEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') > 0
                  THEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') - 1
                  ELSE LENGTH(referrer)
                END)
         END as referrer,
         COUNT(*) as count
       FROM VisitorEvent
       WHERE agentId = ?
       GROUP BY referrer
       ORDER BY count DESC`,
      agentId,
    )
    const referrers = referrersRaw.map((r) => ({
      referrer: r.referrer,
      count: Number(r.count),
    }))

    // 6. Page views breakdown
    const pageViewsRaw = await db.$queryRawUnsafe<
      Array<{ page: string; count: bigint }>
    >(
      `SELECT COALESCE(page, 'unknown') as page, COUNT(*) as count
       FROM VisitorEvent
       WHERE agentId = ?
       GROUP BY page
       ORDER BY count DESC`,
      agentId,
    )
    const pageViews = pageViewsRaw.map((r) => ({
      page: r.page,
      views: Number(r.count),
    }))

    // 7. Average dwell time
    const dwellTimeRaw = await db.$queryRawUnsafe<
      Array<{ avgMs: number | null }>
    >(
      `SELECT AVG(dwellTimeMs) as avgMs
       FROM VisitorEvent
       WHERE agentId = ? AND dwellTimeMs IS NOT NULL AND dwellTimeMs > 0`,
      agentId,
    )
    const averageDwellTimeMs = dwellTimeRaw[0]?.avgMs ?? 0

    // 8. Recent inquiries count (last 7 days)
    const recentInquiriesCount = await db.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(*) as count
       FROM Inquiry i
       JOIN Property p ON p.id = i.propertyId
       WHERE p.agentId = ? AND i.createdAt >= ?`,
      agentId,
      sevenDaysAgo.toISOString(),
    )

    // 9. Conversion rate: inquiries (7d) / unique sessions (7d)
    const uniqueSessionsRaw = await db.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(DISTINCT sessionId) as count
       FROM VisitorEvent
       WHERE agentId = ? AND createdAt >= ? AND sessionId IS NOT NULL`,
      agentId,
      sevenDaysAgoDate,
    )
    const uniqueSessions = Number(uniqueSessionsRaw[0]?.count ?? 0)
    const inquiriesCount = Number(recentInquiriesCount[0]?.count ?? 0)
    const conversionRate =
      uniqueSessions > 0
        ? Number(((inquiriesCount / uniqueSessions) * 100).toFixed(2))
        : 0

    return NextResponse.json({
      totalVisits: { sevenDays: totalVisits7d, thirtyDays: totalVisits30d },
      visitsPerDay,
      topProperties,
      topClickedElements,
      referrers,
      pageViews,
      averageDwellTimeMs: Math.round(averageDwellTimeMs),
      recentInquiriesCount: inquiriesCount,
      conversionRate,
    })
  } catch (error) {
    console.error('Error al obtener analíticas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
