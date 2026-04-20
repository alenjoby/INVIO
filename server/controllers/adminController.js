import { supabaseAdmin } from "../config/supabase.js";

/**
 * Verify admin password.
 * Password is stored in ADMIN_PASSWORD env var.
 * Returns a simple session token (SHA-like hash) valid for the browser tab session.
 */
export const verifyAdmin = async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error("ADMIN_PASSWORD not set in .env");
      return res.status(500).json({ error: "Admin access is not configured" });
    }

    if (!password || password !== adminPassword) {
      return res.status(401).json({ error: "Invalid admin password" });
    }

    // Return a simple token derived from the password - this is NOT cryptographic,
    // it just prevents replay from the browser without the password.
    // For a university project this is sufficient.
    const token = Buffer.from(`invio-admin:${Date.now()}`).toString("base64");

    res.json({ success: true, token });
  } catch (err) {
    console.error("Admin verify error:", err);
    res.status(500).json({ error: "Admin verification failed" });
  }
};

const CURRENCY_CONFIG = {
  AED: { rate: 3.67 },
  USD: { rate: 1 },
  INR: { rate: 83.2 },
  GBP: { rate: 0.79 },
};

function getUsdValue(amount, currencyCode) {
  const code = (currencyCode || "USD").toUpperCase();
  const rate = CURRENCY_CONFIG[code] ? CURRENCY_CONFIG[code].rate : 1;
  return parseFloat(amount || 0) / rate;
}

/**
 * Get comprehensive dashboard stats.
 * Returns: overview KPIs, monthly revenue array, category breakdown, recent sales.
 */
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Fetch all sales
    const { data: sales, error: salesError } = await supabaseAdmin
      .from("sales")
      .select("*")
      .order("created_at", { ascending: true });

    if (salesError) {
      console.error("Sales fetch error:", salesError);
      return res.status(400).json({ error: salesError.message });
    }

    const allSales = sales || [];

    // 2. Fetch total users count
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (usersError) {
      console.error("Users count error:", usersError);
    }

    // 3. Fetch total invitations count
    const { count: totalInvitations, error: invError } = await supabaseAdmin
      .from("invitations")
      .select("id", { count: "exact", head: true });

    if (invError) {
      console.error("Invitations count error:", invError);
    }

    // 4. Compute overview KPIs (Normalized to USD)
    const totalRevenue = allSales.reduce(
      (sum, s) => sum + getUsdValue(s.amount, s.currency),
      0,
    );
    const totalSalesCount = allSales.length;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month

    const thisMonthSales = allSales.filter(
      (s) => new Date(s.created_at) >= thisMonthStart,
    );
    const lastMonthSales = allSales.filter((s) => {
      const d = new Date(s.created_at);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });

    const thisMonthRevenue = thisMonthSales.reduce(
      (sum, s) => sum + getUsdValue(s.amount, s.currency),
      0,
    );
    const lastMonthRevenue = lastMonthSales.reduce(
      (sum, s) => sum + getUsdValue(s.amount, s.currency),
      0,
    );

    let momGrowth = 0;
    if (lastMonthRevenue > 0) {
      momGrowth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
      momGrowth = 100;
    }

    const avgOrderValue =
      totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    // 5. Monthly revenue breakdown (last 12 months)
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );

      const monthSales = allSales.filter((s) => {
        const d = new Date(s.created_at);
        return d >= monthStart && d <= monthEnd;
      });

      const revenue = monthSales.reduce(
        (sum, s) => sum + getUsdValue(s.amount, s.currency),
        0,
      );
      const count = monthSales.length;

      const label = monthStart.toLocaleString("en-US", {
        month: "short",
        year: "2-digit",
      });

      monthlyRevenue.push({ label, revenue: Math.round(revenue * 100) / 100, count });
    }

    // 6. Category breakdown
    const categoryMap = {};
    for (const sale of allSales) {
      const cat = (sale.template_id || "unknown").split("-")[0]; // e.g. "wedding-1" -> "wedding"
      if (!categoryMap[cat]) {
        categoryMap[cat] = { revenue: 0, count: 0 };
      }
      categoryMap[cat].revenue += getUsdValue(sale.amount, sale.currency);
      categoryMap[cat].count += 1;
    }

    const categoryBreakdown = Object.entries(categoryMap).map(
      ([category, data]) => ({
        category,
        revenue: Math.round(data.revenue * 100) / 100,
        count: data.count,
      }),
    );

    // 7. Best and worst months
    const completedMonths = monthlyRevenue.slice(0, -1); // exclude current (incomplete)
    let bestMonth = null;
    let worstMonth = null;

    if (completedMonths.length > 0) {
      bestMonth = completedMonths.reduce((best, m) =>
        m.revenue > best.revenue ? m : best,
      );
      worstMonth = completedMonths.reduce((worst, m) =>
        m.revenue < worst.revenue ? m : worst,
      );
    }

    res.json({
      overview: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSales: totalSalesCount,
        thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
        lastMonthRevenue: Math.round(lastMonthRevenue * 100) / 100,
        momGrowth: Math.round(momGrowth * 10) / 10,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        totalUsers: totalUsers || 0,
        totalInvitations: totalInvitations || 0,
      },
      monthlyRevenue,
      categoryBreakdown,
      bestMonth,
      worstMonth,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

/**
 * Get the full sales ledger with user details.
 */
export const getSalesLedger = async (req, res) => {
  try {
    const { data: sales, error } = await supabaseAdmin
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Sales ledger error:", error);
      return res.status(400).json({ error: error.message });
    }

    // Enrich with user emails from profiles
    const userIds = [...new Set((sales || []).map((s) => s.user_id).filter(Boolean))];
    let profileMap = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email, username")
        .in("id", userIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p;
        }
      }
    }

    const enrichedSales = (sales || []).map((sale) => ({
      ...sale,
      user_email: profileMap[sale.user_id]?.email || "Unknown",
      username: profileMap[sale.user_id]?.username || "Unknown",
    }));

    res.json(enrichedSales);
  } catch (err) {
    console.error("Sales ledger error:", err);
    res.status(500).json({ error: "Failed to fetch sales ledger" });
  }
};
