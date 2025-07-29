const formatToIST = (dateString) => {
  if (!dateString || dateString === "N/A") return "N/A";

  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    return dateString;
  }
};

// Helper function to calculate surgery duration
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime || startTime === "N/A" || endTime === "N/A") {
    return "N/A";
  }

  try {
    const start = new Date(`1970-01-01 ${startTime}`);
    const end = new Date(`1970-01-01 ${endTime}`);
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  } catch (error) {
    return "N/A";
  }
};

// New function to generate surgical HTML report
export const generateSurgicalHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const surgicalNotes = latestRecord.surgicalNotes || [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Surgical Report - ${patientHistory.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            background: white;
            font-size: 14px;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #2c5aa0;
            padding-bottom: 15px;
        }
        
        .hospital-banner {
            width: 100%;
            max-height: 100px;
            object-fit: contain;
            margin-bottom: 10px;
        }
        
        .hospital-info {
            margin-bottom: 10px;
        }
        
        .hospital-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 5px;
        }
        
        .hospital-details {
            font-size: 12px;
            color: #666;
            line-height: 1.3;
        }
        
        .document-title {
            font-size: 22px;
            font-weight: bold;
            color: #2c5aa0;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 15px 0 5px 0;
        }
        
        .document-subtitle {
            font-size: 14px;
            color: #666;
            font-style: italic;
        }
        
        .patient-info {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .patient-info h3 {
            color: #2c5aa0;
            font-size: 16px;
            margin-bottom: 10px;
            text-align: center;
            text-transform: uppercase;
        }
        
        .info-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .info-table td {
            padding: 6px 10px;
            border: 1px solid #dee2e6;
            vertical-align: top;
        }
        
        .info-table .label {
            background: #e9ecef;
            font-weight: bold;
            width: 35%;
            color: #495057;
        }
        
        .info-table .value {
            background: white;
            width: 65%;
        }
        
        .surgery-separator {
            margin: 30px 0 20px 0;
            padding: 12px;
            background: linear-gradient(90deg, #2c5aa0, #4a90e2);
            color: white;
            text-align: center;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            page-break-before: auto;
        }
        
        .surgery-number {
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 3px;
        }
        
        .section-title {
            background: #2c5aa0;
            color: white;
            padding: 8px 15px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 15px 0 8px 0;
            border-radius: 4px;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .detail-item {
            background: #f8f9fa;
            border-left: 4px solid #2c5aa0;
            padding: 10px 12px;
            border-radius: 0 4px 4px 0;
        }
        
        .detail-label {
            font-weight: bold;
            color: #2c5aa0;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        
        .detail-value {
            color: #333;
            font-size: 12px;
            line-height: 1.3;
        }
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        .description-box {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            padding: 12px;
            margin: 12px 0;
        }
        
        .description-box .label {
            font-weight: bold;
            color: #2c5aa0;
            font-size: 12px;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        
        .description-box .content {
            color: #333;
            line-height: 1.4;
            font-size: 12px;
        }
        
        .summary-section {
            background: #e8f4f8;
            border: 2px solid #2c5aa0;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .summary-title {
            color: #2c5aa0;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 12px;
            text-transform: uppercase;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }
        
        .stat-item {
            text-align: center;
            background: white;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        
        .stat-number {
            font-size: 20px;
            font-weight: bold;
            color: #2c5aa0;
        }
        
        .stat-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
        }
        
        .no-surgeries {
            text-align: center;
            padding: 30px;
            color: #666;
            font-style: italic;
            background: #f8f9fa;
            border-radius: 8px;
            margin: 15px 0;
        }
        
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 15px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-successful {
            background: #d4edda;
            color: #155724;
        }
        
        .status-urgent {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-elective {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .status-emergency {
            background: #f8d7da;
            color: #721c24;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e9ecef;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        
        @media print {
            .container {
                margin: 0;
                padding: 10px;
            }
            
            .surgery-separator {
                page-break-before: always;
            }
            
            .surgery-separator:first-of-type {
                page-break-before: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${
              hospital.bannerImageUrl
            }" alt="Hospital Banner" class="hospital-banner">
            <div class="hospital-info">
                <div class="hospital-name">${hospital.name}</div>
                <div class="hospital-details">
                    ${hospital.address}<br>
                    Phone: ${hospital.phone} | Email: ${hospital.email}
                </div>
            </div>
            <div class="document-title">Surgical Report</div>
            <div class="document-subtitle">Complete Surgical Documentation</div>
        </div>

        <!-- Patient Information -->
        <div class="patient-info">
            <h3>Patient Information</h3>
            <table class="info-table">
                <tr>
                    <td class="label">Patient ID</td>
                    <td class="value">${patientHistory.patientId}</td>
                    <td class="label">Name</td>
                    <td class="value">${patientHistory.name}</td>
                </tr>
                <tr>
                    <td class="label">Age</td>
                    <td class="value">${patientHistory.age} years</td>
                    <td class="label">Gender</td>
                    <td class="value">${patientHistory.gender}</td>
                </tr>
                <tr>
                    <td class="label">Contact</td>
                    <td class="value">${patientHistory.contact}</td>
                    <td class="label">OPD Number</td>
                    <td class="value">${latestRecord.opdNumber || "N/A"}</td>
                </tr>
                <tr>
                    <td class="label">IPD Number</td>
                    <td class="value">${latestRecord.ipdNumber || "N/A"}</td>
                    <td class="label">Admission Date</td>
                    <td class="value">${formatToIST(
                      latestRecord.admissionDate
                    )}</td>
                </tr>
            </table>
        </div>

        <!-- Surgery Summary -->
        <div class="summary-section">
            <div class="summary-title">Surgical Procedures Summary</div>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-number">${surgicalNotes.length}</div>
                    <div class="stat-label">Total Surgeries</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${
                      surgicalNotes.filter(
                        (note) => note.urgency === "Emergency"
                      ).length
                    }</div>
                    <div class="stat-label">Emergency Cases</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${
                      surgicalNotes.filter(
                        (note) => note.procedureOutcome === "Successful"
                      ).length
                    }</div>
                    <div class="stat-label">Successful Outcomes</div>
                </div>
            </div>
        </div>

        ${
          surgicalNotes.length === 0
            ? `
        <div class="no-surgeries">
            <h3>No Surgical Procedures Found</h3>
            <p>No surgical notes are available for this patient's current admission.</p>
        </div>
        `
            : surgicalNotes
                .map(
                  (surgicalNote, index) => `
        
        <!-- Surgery ${index + 1} -->
        <div class="surgery-separator">
            <div class="surgery-number">Surgery ${index + 1} of ${
                    surgicalNotes.length
                  }</div>
            <div>${surgicalNote.surgicalProcedure || "Surgical Procedure"}</div>
        </div>

        <div class="section-title">Surgery Overview</div>
        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">Surgery Date</div>
                <div class="detail-value">${formatToIST(
                  surgicalNote.surgeryDate
                )}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Surgery Time</div>
                <div class="detail-value">${
                  surgicalNote.surgeryTime || "N/A"
                }</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Surgeon</div>
                <div class="detail-value">${
                  surgicalNote.surgeonName || "N/A"
                }</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Urgency</div>
                <div class="detail-value">
                    <span class="status-badge status-${(
                      surgicalNote.urgency || "elective"
                    ).toLowerCase()}">
                        ${surgicalNote.urgency || "Elective"}
                    </span>
                </div>
            </div>
        </div>

        <div class="description-box">
            <div class="label">Pre-Operative Diagnosis</div>
            <div class="content">${
              surgicalNote.preOperativeDiagnosis || "N/A"
            }</div>
        </div>
        
        <div class="description-box">
            <div class="label">Post-Operative Diagnosis</div>
            <div class="content">${
              surgicalNote.postOperativeDiagnosis || "N/A"
            }</div>
        </div>
        
        <div class="description-box">
            <div class="label">Procedure Description</div>
            <div class="content">${
              surgicalNote.procedureDescription || "N/A"
            }</div>
        </div>

        <div class="section-title">Surgical Details</div>
        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">Approach</div>
                <div class="detail-value">${
                  surgicalNote.surgicalApproach || "N/A"
                }</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Duration</div>
                <div class="detail-value">${
                  surgicalNote.surgeryDuration || "N/A"
                }</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Blood Loss</div>
                <div class="detail-value">${
                  surgicalNote.estimatedBloodLoss || "N/A"
                }</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Outcome</div>
                <div class="detail-value">
                    <span class="status-badge status-successful">
                        ${surgicalNote.procedureOutcome || "N/A"}
                    </span>
                </div>
            </div>
        </div>

        <div class="description-box">
            <div class="label">Post-Operative Instructions</div>
            <div class="content">${
              surgicalNote.postOperativeInstructions || "N/A"
            }</div>
        </div>

        `
                )
                .join("")
        }

        <!-- Footer -->
        <div class="footer">
            <div>Report Generated: ${formatToIST(new Date())}</div>
            <div>Patient ID: ${patientHistory.patientId} | Total Surgeries: ${
    surgicalNotes.length
  }</div>
        </div>
    </div>
</body>
</html>`;
};
