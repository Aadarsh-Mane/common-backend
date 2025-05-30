// ===============================
// BILLING ANALYTICS DASHBOARD CONTROLLER
// ===============================

import BillingRecord from "../models/hospitalSchema.js";

// ===============================
// MAIN ANALYTICS DASHBOARD
// ===============================
// ===============================
// BILLING ANALYTICS DASHBOARD CONTROLLER
// ===============================

// ===============================
// MAIN ANALYTICS DASHBOARD
// ===============================
// ===============================
// OPTIMIZED BILLING ANALYTICS DASHBOARD CONTROLLER
// ===============================

// ===============================
// MAIN ANALYTICS DASHBOARD WITH CACHING & PAGINATION
// ===============================
export const getBillingAnalyticsDashboard = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      timeframe = "month",
      department,
      paymentMethod,
      useCache = true,
      limit = 1000000, // Default high limit for dashboard
    } = req.query;

    // Validate date range to prevent excessive queries
    const dateRange = validateAndSetDateRange(startDate, endDate);
    if (!dateRange.isValid) {
      return res.status(400).json({
        message: dateRange.error,
      });
    }

    // Build optimized filter
    const filters = buildOptimizedFilters({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      department,
      paymentMethod,
      limit: parseInt(limit),
    });

    // Check cache first (if implementing Redis)
    const cacheKey = generateCacheKey("dashboard", filters, timeframe);
    if (useCache === "true") {
      // Implement cache check here if using Redis
      // const cachedResult = await getFromCache(cacheKey);
      // if (cachedResult) return res.json(cachedResult);
    }

    // Execute optimized parallel queries with error handling
    const analyticsData = await executeAnalyticsQueries(filters, timeframe);

    // Cache the result (if implementing Redis)
    if (useCache === "true") {
      // await setCache(cacheKey, analyticsData, 300); // 5-minute cache
    }

    return res.status(200).json({
      message: "Billing analytics dashboard data retrieved successfully.",
      dateRange: {
        startDate: dateRange.startDate.toISOString().split("T")[0],
        endDate: dateRange.endDate.toISOString().split("T")[0],
      },
      queryStats: {
        recordsProcessed: analyticsData.recordCount,
        queryTime: Date.now() - (req.startTime || Date.now()),
        useCache: useCache === "true",
      },
      ...analyticsData.results,
    });
  } catch (error) {
    console.error("Error getting billing analytics dashboard:", error);

    // Enhanced error response
    return res.status(500).json({
      message: "An error occurred while retrieving billing analytics.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// ===============================
// OPTIMIZED PARALLEL QUERY EXECUTION
// ===============================
const executeAnalyticsQueries = async (filters, timeframe) => {
  const startTime = Date.now();

  try {
    // Execute all queries in parallel with proper error handling
    const results = await Promise.allSettled([
      getRevenueMetricsOptimized(filters),
      getCollectionMetricsOptimized(filters),
      getPaymentAnalysisOptimized(filters),
      getTrendAnalysisOptimized(filters, timeframe),
      getDepartmentAnalysisOptimized(filters),
      getPatientAnalysisOptimized(filters),
      getAccountsReceivableAnalysisOptimized(filters),
      getKPISummaryOptimized(filters),
    ]);

    // Handle any failed queries
    const [
      revenueMetrics,
      collectionMetrics,
      paymentAnalysis,
      trendAnalysis,
      departmentAnalysis,
      patientAnalysis,
      arAnalysis,
      kpiSummary,
    ] = results.map((result, index) => {
      if (result.status === "rejected") {
        console.error(`Query ${index} failed:`, result.reason);
        return getDefaultResult(index);
      }
      return result.value;
    });

    // Get record count for stats
    const recordCount = await BillingRecord.countDocuments(filters.match);

    return {
      recordCount,
      queryTime: Date.now() - startTime,
      results: {
        kpiSummary,
        revenueMetrics,
        collectionMetrics,
        paymentAnalysis,
        trendAnalysis,
        departmentAnalysis,
        patientAnalysis,
        arAnalysis,
      },
    };
  } catch (error) {
    console.error("Error in parallel query execution:", error);
    throw error;
  }
};

// ===============================
// OPTIMIZED REVENUE METRICS WITH INDEXING
// ===============================
const getRevenueMetricsOptimized = async (filters) => {
  const pipeline = [
    { $match: filters.match },

    // Use $facet for multiple calculations in single pass
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalBilledAmount: { $sum: "$billingAmount" },
              totalCollectedAmount: { $sum: "$amountPaid" },
              totalOutstandingAmount: { $sum: "$remainingAmount" },
              totalTransactions: { $sum: 1 },
            },
          },
        ],
        stats: [
          {
            $group: {
              _id: null,
              averageBillAmount: { $avg: "$billingAmount" },
              maxBillAmount: { $max: "$billingAmount" },
              minBillAmount: { $min: "$billingAmount" },
            },
          },
        ],
      },
    },

    // Combine results
    {
      $project: {
        totalBilledAmount: { $arrayElemAt: ["$totals.totalBilledAmount", 0] },
        totalCollectedAmount: {
          $arrayElemAt: ["$totals.totalCollectedAmount", 0],
        },
        totalOutstandingAmount: {
          $arrayElemAt: ["$totals.totalOutstandingAmount", 0],
        },
        totalTransactions: { $arrayElemAt: ["$totals.totalTransactions", 0] },
        averageBillAmount: { $arrayElemAt: ["$stats.averageBillAmount", 0] },
        maxBillAmount: { $arrayElemAt: ["$stats.maxBillAmount", 0] },
        minBillAmount: { $arrayElemAt: ["$stats.minBillAmount", 0] },
      },
    },

    // Calculate rates
    {
      $addFields: {
        collectionRate: {
          $cond: {
            if: { $gt: ["$totalBilledAmount", 0] },
            then: {
              $multiply: [
                { $divide: ["$totalCollectedAmount", "$totalBilledAmount"] },
                100,
              ],
            },
            else: 0,
          },
        },
        outstandingRate: {
          $cond: {
            if: { $gt: ["$totalBilledAmount", 0] },
            then: {
              $multiply: [
                { $divide: ["$totalOutstandingAmount", "$totalBilledAmount"] },
                100,
              ],
            },
            else: 0,
          },
        },
      },
    },
  ];

  const result = await BillingRecord.aggregate(pipeline).allowDiskUse(true);
  return result[0] || getDefaultRevenueMetrics();
};

// ===============================
// OPTIMIZED COLLECTION METRICS
// ===============================
const getCollectionMetricsOptimized = async (filters) => {
  const pipeline = [
    { $match: filters.match },

    // Add computed fields efficiently
    {
      $addFields: {
        daysToPay: {
          $cond: {
            if: { $and: ["$paymentDate", "$billingDate"] },
            then: {
              $divide: [
                { $subtract: ["$paymentDate", "$billingDate"] },
                86400000, // 1000 * 60 * 60 * 24 - Convert milliseconds to days
              ],
            },
            else: null,
          },
        },
        paymentCategory: {
          $switch: {
            branches: [
              { case: { $eq: ["$remainingAmount", 0] }, then: "fully_paid" },
              {
                case: {
                  $and: [
                    { $gt: ["$amountPaid", 0] },
                    { $gt: ["$remainingAmount", 0] },
                  ],
                },
                then: "partially_paid",
              },
            ],
            default: "unpaid",
          },
        },
      },
    },

    // Use facet for multiple groupings
    {
      $facet: {
        paymentStats: [
          {
            $group: {
              _id: null,
              averageDaysToPay: { $avg: "$daysToPay" },
              fastestCollection: { $min: "$daysToPay" },
              slowestCollection: { $max: "$daysToPay" },
              totalRecords: { $sum: 1 },
            },
          },
        ],
        categoryCounts: [
          {
            $group: {
              _id: "$paymentCategory",
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ];

  const result = await BillingRecord.aggregate(pipeline).allowDiskUse(true);

  if (!result[0]) return getDefaultCollectionMetrics();

  const paymentStats = result[0].paymentStats[0] || {};
  const categoryCounts = result[0].categoryCounts || [];

  // Process category counts
  const categoryMap = categoryCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const totalRecords = paymentStats.totalRecords || 0;

  return {
    averageDaysToPay: paymentStats.averageDaysToPay || 0,
    fullyPaidCount: categoryMap.fully_paid || 0,
    partiallyPaidCount: categoryMap.partially_paid || 0,
    unpaidCount: categoryMap.unpaid || 0,
    totalRecords,
    fullyPaidPercentage:
      totalRecords > 0
        ? ((categoryMap.fully_paid || 0) / totalRecords) * 100
        : 0,
    partiallyPaidPercentage:
      totalRecords > 0
        ? ((categoryMap.partially_paid || 0) / totalRecords) * 100
        : 0,
    unpaidPercentage:
      totalRecords > 0 ? ((categoryMap.unpaid || 0) / totalRecords) * 100 : 0,
    fastestCollection: paymentStats.fastestCollection || 0,
    slowestCollection: paymentStats.slowestCollection || 0,
  };
};

// ===============================
// OPTIMIZED PAYMENT ANALYSIS
// ===============================
const getPaymentAnalysisOptimized = async (filters) => {
  const pipeline = [
    { $match: filters.match },

    {
      $facet: {
        paymentMethods: [
          {
            $group: {
              _id: { $ifNull: ["$paymentMethod", "Not Specified"] },
              totalAmount: { $sum: "$amountPaid" },
              transactionCount: { $sum: 1 },
              averageAmount: { $avg: "$amountPaid" },
            },
          },
          { $sort: { totalAmount: -1 } },
          { $limit: 20 }, // Limit to top 20 payment methods
        ],

        paymentStatus: [
          {
            $addFields: {
              paymentStatus: {
                $cond: {
                  if: { $eq: ["$remainingAmount", 0] },
                  then: "Fully Paid",
                  else: {
                    $cond: {
                      if: { $gt: ["$amountPaid", 0] },
                      then: "Partially Paid",
                      else: "Unpaid",
                    },
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: "$paymentStatus",
              totalBilled: { $sum: "$billingAmount" },
              totalCollected: { $sum: "$amountPaid" },
              totalOutstanding: { $sum: "$remainingAmount" },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ];

  const result = await BillingRecord.aggregate(pipeline).allowDiskUse(true);

  return {
    paymentMethodBreakdown: result[0]?.paymentMethods || [],
    paymentStatusBreakdown: result[0]?.paymentStatus || [],
  };
};

// ===============================
// OPTIMIZED TREND ANALYSIS WITH SAMPLING
// ===============================
const getTrendAnalysisOptimized = async (filters, timeframe) => {
  // For large datasets, consider sampling
  const shouldSample =
    (await BillingRecord.countDocuments(filters.match)) > 100000;

  const pipeline = [
    { $match: filters.match },

    // Add sampling for very large datasets
    ...(shouldSample ? [{ $sample: { size: 50000 } }] : []),

    {
      $group: {
        _id: getGroupByTimeframeOptimized(timeframe),
        totalBilled: { $sum: "$billingAmount" },
        totalCollected: { $sum: "$amountPaid" },
        totalOutstanding: { $sum: "$remainingAmount" },
        transactionCount: { $sum: 1 },
        averageBillAmount: { $avg: "$billingAmount" },
      },
    },
    {
      $addFields: {
        collectionRate: {
          $cond: {
            if: { $gt: ["$totalBilled", 0] },
            then: {
              $multiply: [
                { $divide: ["$totalCollected", "$totalBilled"] },
                100,
              ],
            },
            else: 0,
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 100 }, // Reasonable limit for trends
  ];

  const trends = await BillingRecord.aggregate(pipeline).allowDiskUse(true);

  return {
    timeframe,
    samplingUsed: shouldSample,
    dataPoints: trends.length,
    data: trends.map((item) => ({
      period: formatPeriodOptimized(item._id, timeframe),
      totalBilled: item.totalBilled,
      totalCollected: item.totalCollected,
      totalOutstanding: item.totalOutstanding,
      transactionCount: item.transactionCount,
      averageBillAmount: Math.round(item.averageBillAmount * 100) / 100,
      collectionRate: Math.round(item.collectionRate * 100) / 100,
    })),
  };
};

// ===============================
// OPTIMIZED HELPER FUNCTIONS
// ===============================
const validateAndSetDateRange = (startDate, endDate) => {
  const maxRangeMonths = 24; // Maximum 24 months range

  // Create default dates properly
  let start, end;

  if (startDate) {
    start = new Date(startDate);
  } else {
    // Default to 30 days ago
    start = new Date();
    start.setDate(start.getDate() - 30);
  }

  if (endDate) {
    end = new Date(endDate);
  } else {
    // Default to today
    end = new Date();
  }

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      error: "Invalid date format. Use YYYY-MM-DD format.",
    };
  }

  if (start > end) {
    return { isValid: false, error: "Start date cannot be after end date" };
  }

  // Check date range
  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (monthsDiff > maxRangeMonths) {
    return {
      isValid: false,
      error: `Date range cannot exceed ${maxRangeMonths} months`,
    };
  }

  return { isValid: true, startDate: start, endDate: end };
};

const buildOptimizedFilters = ({
  startDate,
  endDate,
  department,
  paymentMethod,
  limit,
}) => {
  const match = {};

  // Date filter
  if (startDate || endDate) {
    match.billingDate = {};
    if (startDate) match.billingDate.$gte = startDate;
    if (endDate) match.billingDate.$lte = endDate;
  }

  // Additional filters
  if (department && department !== "all") match.department = department;
  if (paymentMethod && paymentMethod !== "all")
    match.paymentMethod = paymentMethod;

  return { match, limit };
};

const generateCacheKey = (type, filters, timeframe) => {
  const filterHash = JSON.stringify(filters);
  return `billing_analytics:${type}:${timeframe}:${Buffer.from(filterHash)
    .toString("base64")
    .slice(0, 20)}`;
};

const getGroupByTimeframeOptimized = (timeframe) => {
  // Optimized grouping with better performance
  switch (timeframe) {
    case "day":
      return {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$billingDate",
        },
      };
    case "week":
      return {
        $dateToString: {
          format: "%Y-W%U",
          date: "$billingDate",
        },
      };
    case "month":
      return {
        $dateToString: {
          format: "%Y-%m",
          date: "$billingDate",
        },
      };
    case "quarter":
      return {
        year: { $year: "$billingDate" },
        quarter: {
          $ceil: { $divide: [{ $month: "$billingDate" }, 3] },
        },
      };
    case "year":
      return { $year: "$billingDate" };
    default:
      return {
        $dateToString: {
          format: "%Y-%m",
          date: "$billingDate",
        },
      };
  }
};

const formatPeriodOptimized = (period, timeframe) => {
  if (typeof period === "string") return period;

  switch (timeframe) {
    case "quarter":
      return `${period.year}-Q${period.quarter}`;
    case "year":
      return period.toString();
    default:
      return period.toString();
  }
};

// ===============================
// DEFAULT RESULT HANDLERS
// ===============================
const getDefaultResult = (index) => {
  const defaults = [
    getDefaultRevenueMetrics(),
    getDefaultCollectionMetrics(),
    { paymentMethodBreakdown: [], paymentStatusBreakdown: [] },
    { timeframe: "month", data: [] },
    {
      departmentPerformance: [],
      topPerformingDepartment: null,
      totalDepartments: 0,
    },
    {
      topPatientsByOutstanding: [],
      uniquePatientCount: 0,
      averagePatientBill: 0,
    },
    {
      agingAnalysis: [],
      totalAccountsReceivable: 0,
      totalOutstandingBills: 0,
      averageOutstandingAmount: 0,
    },
    getDefaultKPISummary(),
  ];
  return defaults[index] || {};
};

const getDefaultRevenueMetrics = () => ({
  totalBilledAmount: 0,
  totalCollectedAmount: 0,
  totalOutstandingAmount: 0,
  averageBillAmount: 0,
  totalTransactions: 0,
  collectionRate: 0,
  outstandingRate: 0,
  maxBillAmount: 0,
  minBillAmount: 0,
});

const getDefaultCollectionMetrics = () => ({
  averageDaysToPay: 0,
  fullyPaidCount: 0,
  partiallyPaidCount: 0,
  unpaidCount: 0,
  fullyPaidPercentage: 0,
  partiallyPaidPercentage: 0,
  unpaidPercentage: 0,
  fastestCollection: 0,
  slowestCollection: 0,
});

const getDefaultKPISummary = () => ({
  totalRevenue: 0,
  totalCollected: 0,
  totalOutstanding: 0,
  totalBills: 0,
  uniquePatientCount: 0,
  collectionRate: 0,
  outstandingRate: 0,
  averageTicketSize: 0,
  averageCollectionAmount: 0,
  averageBillsPerPatient: 0,
});

// ===============================
// IMPLEMENT REMAINING OPTIMIZED FUNCTIONS
// ===============================

const getDepartmentAnalysisOptimized = async (filters) => {
  const pipeline = [
    { $match: filters.match },
    {
      $group: {
        _id: { $ifNull: ["$department", "Not Specified"] },
        totalBilled: { $sum: "$billingAmount" },
        totalCollected: { $sum: "$amountPaid" },
        totalOutstanding: { $sum: "$remainingAmount" },
        transactionCount: { $sum: 1 },
        averageBillAmount: { $avg: "$billingAmount" },
      },
    },
    {
      $addFields: {
        collectionRate: {
          $cond: {
            if: { $gt: ["$totalBilled", 0] },
            then: {
              $multiply: [
                { $divide: ["$totalCollected", "$totalBilled"] },
                100,
              ],
            },
            else: 0,
          },
        },
        departmentName: "$_id",
      },
    },
    { $sort: { totalBilled: -1 } },
    { $limit: 50 }, // Limit departments
  ];

  const departments = await BillingRecord.aggregate(pipeline).allowDiskUse(
    true
  );

  return {
    departmentPerformance: departments,
    topPerformingDepartment: departments[0] || null,
    totalDepartments: departments.length,
  };
};

const getPatientAnalysisOptimized = async (filters) => {
  const pipeline = [
    { $match: filters.match },
    {
      $group: {
        _id: "$patientId",
        totalBilled: { $sum: "$billingAmount" },
        totalPaid: { $sum: "$amountPaid" },
        totalOutstanding: { $sum: "$remainingAmount" },
        billCount: { $sum: 1 },
        lastBillingDate: { $max: "$billingDate" },
        firstBillingDate: { $min: "$billingDate" },
      },
    },
    {
      $addFields: {
        averageBillAmount: { $divide: ["$totalBilled", "$billCount"] },
        paymentRate: {
          $cond: {
            if: { $gt: ["$totalBilled", 0] },
            then: {
              $multiply: [{ $divide: ["$totalPaid", "$totalBilled"] }, 100],
            },
            else: 0,
          },
        },
      },
    },
    { $sort: { totalOutstanding: -1 } },
    { $limit: 20 }, // Limit to top 20 patients
  ];

  const patientData = await BillingRecord.aggregate(pipeline).allowDiskUse(
    true
  );

  // Count unique patients separately for better performance
  const uniquePatientCount = await BillingRecord.distinct(
    "patientId",
    filters.match
  );

  return {
    topPatientsByOutstanding: patientData,
    uniquePatientCount: uniquePatientCount.length,
    averagePatientBill:
      patientData.length > 0
        ? Math.round(
            (patientData.reduce((sum, p) => sum + p.averageBillAmount, 0) /
              patientData.length) *
              100
          ) / 100
        : 0,
  };
};

const getAccountsReceivableAnalysisOptimized = async (filters) => {
  const arFilters = {
    ...filters.match,
    remainingAmount: { $gt: 0 },
  };

  const pipeline = [
    { $match: arFilters },
    {
      $addFields: {
        daysOutstanding: {
          $divide: [
            { $subtract: [new Date(), "$billingDate"] },
            86400000, // Convert to days
          ],
        },
      },
    },
    {
      $addFields: {
        agingCategory: {
          $switch: {
            branches: [
              { case: { $lte: ["$daysOutstanding", 30] }, then: "0-30 days" },
              { case: { $lte: ["$daysOutstanding", 60] }, then: "31-60 days" },
              { case: { $lte: ["$daysOutstanding", 90] }, then: "61-90 days" },
              {
                case: { $lte: ["$daysOutstanding", 120] },
                then: "91-120 days",
              },
            ],
            default: "120+ days",
          },
        },
      },
    },
    {
      $facet: {
        agingAnalysis: [
          {
            $group: {
              _id: "$agingCategory",
              totalOutstanding: { $sum: "$remainingAmount" },
              count: { $sum: 1 },
              averageDaysOutstanding: { $avg: "$daysOutstanding" },
            },
          },
          { $sort: { _id: 1 } },
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalAR: { $sum: "$remainingAmount" },
              totalCount: { $sum: 1 },
              averageOutstanding: { $avg: "$remainingAmount" },
            },
          },
        ],
      },
    },
  ];

  const result = await BillingRecord.aggregate(pipeline).allowDiskUse(true);
  const totals = result[0]?.totals[0] || {};

  return {
    agingAnalysis: result[0]?.agingAnalysis || [],
    totalAccountsReceivable: totals.totalAR || 0,
    totalOutstandingBills: totals.totalCount || 0,
    averageOutstandingAmount:
      Math.round((totals.averageOutstanding || 0) * 100) / 100,
  };
};

const getKPISummaryOptimized = async (filters) => {
  const pipeline = [
    { $match: filters.match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$billingAmount" },
        totalCollected: { $sum: "$amountPaid" },
        totalOutstanding: { $sum: "$remainingAmount" },
        totalBills: { $sum: 1 },
        uniquePatients: { $addToSet: "$patientId" },
        averageTicketSize: { $avg: "$billingAmount" },
        averageCollectionAmount: { $avg: "$amountPaid" },
      },
    },
    {
      $addFields: {
        uniquePatientCount: { $size: "$uniquePatients" },
        collectionRate: {
          $cond: {
            if: { $gt: ["$totalRevenue", 0] },
            then: {
              $multiply: [
                { $divide: ["$totalCollected", "$totalRevenue"] },
                100,
              ],
            },
            else: 0,
          },
        },
        outstandingRate: {
          $cond: {
            if: { $gt: ["$totalRevenue", 0] },
            then: {
              $multiply: [
                { $divide: ["$totalOutstanding", "$totalRevenue"] },
                100,
              ],
            },
            else: 0,
          },
        },
        averageBillsPerPatient: {
          $cond: {
            if: { $gt: [{ $size: "$uniquePatients" }, 0] },
            then: { $divide: ["$totalBills", { $size: "$uniquePatients" }] },
            else: 0,
          },
        },
      },
    },
    {
      $project: {
        uniquePatients: 0, // Remove large array from output
      },
    },
  ];

  const result = await BillingRecord.aggregate(pipeline).allowDiskUse(true);
  const data = result[0] || {};

  // Round numerical values
  return {
    totalRevenue: data.totalRevenue || 0,
    totalCollected: data.totalCollected || 0,
    totalOutstanding: data.totalOutstanding || 0,
    totalBills: data.totalBills || 0,
    uniquePatientCount: data.uniquePatientCount || 0,
    collectionRate: Math.round((data.collectionRate || 0) * 100) / 100,
    outstandingRate: Math.round((data.outstandingRate || 0) * 100) / 100,
    averageTicketSize: Math.round((data.averageTicketSize || 0) * 100) / 100,
    averageCollectionAmount:
      Math.round((data.averageCollectionAmount || 0) * 100) / 100,
    averageBillsPerPatient:
      Math.round((data.averageBillsPerPatient || 0) * 100) / 100,
  };
};
