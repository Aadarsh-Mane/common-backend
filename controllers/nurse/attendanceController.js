// controllers/nurseAttendanceController.js

import NurseAttendance from "../../models/nurse/nurseAttendanceSchema.js";
import { generatePdf } from "../../services/pdfGenerator.js";
import { uploadToDrive } from "../../services/uploader.js";

/**
 * Get all nurse attendance records with filtering and pagination
 * @route GET /api/attendance/nurses
 * @access Private (Admin/HR)
 */
import mongoose from "mongoose";

export const getAllNurseAttendance = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      nurseId,
      status,
      sortBy = "date",
      sortOrder = "desc",
      search,
    } = req.query;

    // Build filter object
    const filter = {};

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.date.$lte = endDateTime;
      }
    }

    // Nurse ID filter - FIX: Convert string to ObjectId
    if (nurseId) {
      filter.nurseId = new mongoose.Types.ObjectId(nurseId);
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Build aggregation pipeline
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "nurses",
          localField: "nurseId",
          foreignField: "_id",
          as: "nurse",
        },
      },
      { $unwind: { path: "$nurse", preserveNullAndEmptyArrays: true } }, // FIX: Handle cases where nurse might not exist
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "nurse.nurseName": { $regex: search, $options: "i" } },
            { "nurse.email": { $regex: search, $options: "i" } },
            { "nurse.usertype": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Add sorting
    pipeline.push({ $sort: sortOptions });

    // Execute aggregation for total count
    const totalPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await NurseAttendance.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    // Add pagination to main pipeline
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    // Add projection to format response
    pipeline.push({
      $project: {
        _id: 1,
        nurseId: 1,
        date: 1,
        checkIn: 1,
        checkOut: 1,
        totalHours: 1,
        status: 1,
        notes: 1,
        nurse: {
          _id: "$nurse._id",
          name: "$nurse.nurseName",
          nurseName: "$nurse.nurseName",
          email: "$nurse.email",
          usertype: "$nurse.usertype",
          doctorId: "$nurse.doctorId",
        },
        createdAt: 1,
        updatedAt: 1,
      },
    });

    // Execute main aggregation
    const attendanceRecords = await NurseAttendance.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Calculate attendance statistics - FIX: Use same ObjectId conversion
    const statsFilter = { ...filter };
    delete statsFilter.nurseId; // Remove nurse filter for overall stats if you want global stats

    const attendanceStats = await NurseAttendance.aggregate([
      { $match: statsFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      total: total,
      present: attendanceStats.find((s) => s._id === "Present")?.count || 0,
      absent: attendanceStats.find((s) => s._id === "Absent")?.count || 0,
      late: attendanceStats.find((s) => s._id === "Late")?.count || 0,
      halfDay: attendanceStats.find((s) => s._id === "Half-Day")?.count || 0,
      presentPercentage:
        total > 0
          ? Math.round(
              ((attendanceStats.find((s) => s._id === "Present")?.count || 0) /
                total) *
                100
            )
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        attendanceRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: total,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit),
        },
        statistics: stats,
        filters: {
          startDate,
          endDate,
          nurseId,
          status,
          search,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching nurse attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nurse attendance records",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get attendance summary by date range
 * @route GET /api/attendance/nurses/summary
 * @access Private (Admin/HR)
 */
export const getNurseAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, nurseId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const filter = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      },
    };

    if (nurseId) {
      filter.nurseId = nurseId;
    }

    // Daily attendance summary
    const dailySummary = await NurseAttendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          statusCounts: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
          totalRecords: { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Nurse-wise summary
    const nurseSummary = await NurseAttendance.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "nurses",
          localField: "nurseId",
          foreignField: "_id",
          as: "nurse",
        },
      },
      { $unwind: "$nurse" },
      {
        $group: {
          _id: "$nurseId",
          nurse: { $first: "$nurse" },
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
          },
          lateDays: {
            $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] },
          },
          halfDays: {
            $sum: { $cond: [{ $eq: ["$status", "Half-Day"] }, 1, 0] },
          },
          totalHours: { $sum: "$totalHours" },
          avgHours: { $avg: "$totalHours" },
        },
      },
      {
        $project: {
          _id: 1,
          nurse: {
            _id: "$nurse._id",
            name: "$nurse.name",
            employeeId: "$nurse.employeeId",
            department: "$nurse.department",
          },
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          lateDays: 1,
          halfDays: 1,
          totalHours: { $round: ["$totalHours", 2] },
          avgHours: { $round: ["$avgHours", 2] },
          attendancePercentage: {
            $round: [
              { $multiply: [{ $divide: ["$presentDays", "$totalDays"] }, 100] },
              2,
            ],
          },
        },
      },
      { $sort: { "nurse.name": 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        dailySummary,
        nurseSummary,
        dateRange: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance summary",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get attendance for a specific nurse
 * @route GET /api/attendance/nurses/:nurseId
 * @access Private (Admin/HR/Nurse)
 */
export const getNurseAttendanceById = async (req, res) => {
  try {
    const { nurseId } = req.params;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      status,
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = { nurseId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.date.$lte = endDateTime;
      }
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { date: sortOrder === "asc" ? 1 : -1 };

    // Get attendance records
    const attendanceRecords = await NurseAttendance.find(filter)
      .populate("nurseId", "name employeeId email department designation")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await NurseAttendance.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get attendance statistics for this nurse
    const stats = await NurseAttendance.aggregate([
      { $match: { nurseId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalHours: { $sum: "$totalHours" },
        },
      },
    ]);

    const attendanceStats = {
      total: total,
      present: stats.find((s) => s._id === "Present")?.count || 0,
      absent: stats.find((s) => s._id === "Absent")?.count || 0,
      late: stats.find((s) => s._id === "Late")?.count || 0,
      halfDay: stats.find((s) => s._id === "Half-Day")?.count || 0,
      totalHours: stats.reduce((sum, s) => sum + (s.totalHours || 0), 0),
      avgHours:
        stats.length > 0
          ? stats.reduce((sum, s) => sum + (s.totalHours || 0), 0) /
            stats.length
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        attendanceRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit),
        },
        statistics: attendanceStats,
      },
    });
  } catch (error) {
    console.error("Error fetching nurse attendance by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nurse attendance",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Generate attendance report PDF
 * @route POST /api/attendance/nurses/report
 * @access Private (Admin/HR)
 */
export const generateAttendanceReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      nurseId,
      includeStats = true,
      folderId,
    } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const filter = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      },
    };

    if (nurseId) {
      filter.nurseId = nurseId;
    }

    // Fetch attendance data with proper population
    const attendanceData = await NurseAttendance.find(filter)
      .populate({
        path: "nurseId",
        select: "nurseName email usertype", // Use nurseName instead of name
        model: "Nurse",
      })
      .sort({ date: -1 })
      .lean();

    if (attendanceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for the specified date range",
      });
    }

    console.log(
      "Attendance Data Sample:",
      JSON.stringify(attendanceData[0], null, 2)
    );

    // Generate HTML content for PDF
    const htmlContent = generateAttendanceReportHTML(
      attendanceData,
      { startDate, endDate },
      includeStats
    );

    // Generate PDF
    const pdfBuffer = await generatePdf(htmlContent);

    // Generate file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const nurseFilter = nurseId ? `_Nurse_${nurseId}` : "_All_Nurses";
    const fileName = `Nurse_Attendance_Report_${startDate}_to_${endDate}${nurseFilter}_${timestamp}.pdf`;

    // Upload to Drive
    const driveLink = await uploadToDrive(
      pdfBuffer,
      fileName,
      "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"
    );

    // Calculate basic statistics for response
    const stats = {
      totalRecords: attendanceData.length,
      present: attendanceData.filter((a) => a.status === "Present").length,
      absent: attendanceData.filter((a) => a.status === "Absent").length,
      late: attendanceData.filter((a) => a.status === "Late").length,
      halfDay: attendanceData.filter((a) => a.status === "Half-Day").length,
      uniqueNurses: [
        ...new Set(attendanceData.map((a) => a.nurseId?._id?.toString())),
      ].length,
    };

    // Return success response with drive link
    res.status(200).json({
      success: true,
      message: "Attendance report generated successfully",
      data: {
        reportLink: driveLink,
        fileName: fileName,
        dateRange: {
          startDate,
          endDate,
        },
        statistics: stats,
        generatedAt: new Date().toISOString(),
        reportSize: `${Math.round(pdfBuffer.length / 1024)} KB`,
      },
    });
  } catch (error) {
    console.error("Error generating attendance report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate attendance report",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Get attendance dashboard data
 * @route GET /api/attendance/nurses/dashboard
 * @access Private (Admin/HR)
 */
export const getAttendanceDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's attendance
    const todayAttendance = await NurseAttendance.aggregate([
      {
        $match: {
          date: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // This week's attendance
    const weeklyAttendance = await NurseAttendance.aggregate([
      {
        $match: {
          date: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          statusCounts: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Monthly attendance trends
    const monthlyTrends = await NurseAttendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: {
            week: { $week: "$date" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.week",
          statusCounts: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top performers (highest attendance percentage)
    const topPerformers = await NurseAttendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
        },
      },
      {
        $lookup: {
          from: "nurses",
          localField: "nurseId",
          foreignField: "_id",
          as: "nurse",
        },
      },
      { $unwind: "$nurse" },
      {
        $group: {
          _id: "$nurseId",
          nurse: { $first: "$nurse" },
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          nurse: {
            name: "$nurse.name",
            employeeId: "$nurse.employeeId",
            department: "$nurse.department",
          },
          attendancePercentage: {
            $multiply: [{ $divide: ["$presentDays", "$totalDays"] }, 100],
          },
        },
      },
      { $sort: { attendancePercentage: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        todayAttendance,
        weeklyAttendance,
        monthlyTrends,
        topPerformers,
        dateRanges: {
          today: startOfToday,
          weekStart: startOfWeek,
          monthStart: startOfMonth,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching attendance dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function to generate HTML for PDF report
const generateAttendanceReportHTML = (
  attendanceData,
  dateRange,
  includeStats
) => {
  const { startDate, endDate } = dateRange;

  let statsHtml = "";
  if (includeStats) {
    const stats = {
      total: attendanceData.length,
      present: attendanceData.filter((a) => a.status === "Present").length,
      absent: attendanceData.filter((a) => a.status === "Absent").length,
      late: attendanceData.filter((a) => a.status === "Late").length,
      halfDay: attendanceData.filter((a) => a.status === "Half-Day").length,
    };

    const presentPercentage =
      stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    statsHtml = `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #007bff;">
        <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">📊 Attendance Summary</h3>
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div style="flex: 1; padding: 10px;">
            <div style="font-size: 24px; font-weight: bold; color: #007bff;">${stats.total}</div>
            <div style="color: #6c757d; font-size: 12px;">Total</div>
          </div>
          <div style="flex: 1; padding: 10px;">
            <div style="font-size: 24px; font-weight: bold; color: #28a745;">${stats.present}</div>
            <div style="color: #6c757d; font-size: 12px;">Present (${presentPercentage}%)</div>
          </div>
          <div style="flex: 1; padding: 10px;">
            <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${stats.absent}</div>
            <div style="color: #6c757d; font-size: 12px;">Absent</div>
          </div>
          <div style="flex: 1; padding: 10px;">
            <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${stats.late}</div>
            <div style="color: #6c757d; font-size: 12px;">Late</div>
          </div>
          <div style="flex: 1; padding: 10px;">
            <div style="font-size: 24px; font-weight: bold; color: #17a2b8;">${stats.halfDay}</div>
            <div style="color: #6c757d; font-size: 12px;">Half Day</div>
          </div>
        </div>
      </div>
    `;
  }

  // Pre-build table rows efficiently
  const tableRows = attendanceData
    .map((record, index) => {
      const nurseName =
        record.nurseId?.nurseName || record.nurseId?.email || "Unknown";
      const email = record.nurseId?.email || "N/A";
      const recordDate = record.date
        ? new Date(record.date).toLocaleDateString()
        : "N/A";
      const checkInTime = record.checkIn?.time
        ? new Date(record.checkIn.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      const checkOutTime = record.checkOut?.time
        ? new Date(record.checkOut.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      const totalHours = record.totalHours || 0;
      const notes =
        record.notes && record.notes.length > 50
          ? record.notes.substring(0, 50) + "..."
          : record.notes || "No notes";
      const statusColor = getStatusColor(record.status);
      const rowBg = index % 2 === 0 ? "#ffffff" : "#f8f9fc";

      return `<tr style="background-color: ${rowBg};">
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; font-size: 12px;">${recordDate}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; font-size: 12px; font-weight: 500;">${nurseName}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; font-size: 11px;">${email}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; text-align: center;">
          <span style="padding: 3px 8px; border-radius: 12px; color: white; font-size: 10px; background-color: ${statusColor};">${record.status}</span>
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; font-size: 11px;">${checkInTime}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; font-size: 11px;">${checkOutTime}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; font-size: 11px; text-align: center;">${totalHours}h</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #dee2e6; font-size: 10px; max-width: 120px;">${notes}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nurse Attendance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; font-size: 12px; }
    .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #007bff; }
    .header h1 { color: #007bff; margin: 0; font-size: 24px; }
    .header p { margin: 5px 0; color: #6c757d; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background-color: #007bff; color: white; padding: 12px 8px; text-align: left; font-weight: 600; font-size: 11px; }
    .footer { margin-top: 25px; text-align: center; font-size: 11px; color: #6c757d; padding-top: 15px; border-top: 1px solid #dee2e6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Nurse Attendance Report</h1>
    <p>Period: ${startDate} to ${endDate}</p>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>
  
  ${statsHtml}
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Nurse Name</th>
        <th>Email</th>
        <th>Status</th>
        <th>Check In</th>
        <th>Check Out</th>
        <th>Hours</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Hospital Management System | Total Records: ${attendanceData.length}</p>
  </div>
</body>
</html>`;
};

const getStatusColor = (status) => {
  switch (status) {
    case "Present":
      return "#28a745";
    case "Absent":
      return "#dc3545";
    case "Late":
      return "#ffc107";
    case "Half-Day":
      return "#17a2b8";
    default:
      return "#6c757d";
  }
};

// Helper function to get status color for badges
