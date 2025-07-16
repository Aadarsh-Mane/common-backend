export const generateDischargeSummaryHTML = (
  patientHistory,
  admissionHistory,
  options = {}
) => {
  // Fix timezone issue by creating IST time functions
  const getCurrentIST = () => {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utc + istOffset);
    return istTime;
  };

  const convertToIST = (date) => {
    if (!date) return null;
    const inputDate = new Date(date);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = inputDate.getTime() + inputDate.getTimezoneOffset() * 60000;
    return new Date(utc + istOffset);
  };

  const formatDate = (date) => {
    const istDate = convertToIST(date);
    if (!istDate) return "Not specified";
    return istDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    const istDate = convertToIST(date);
    if (!istDate) return "Not specified";
    return istDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const currentIST = getCurrentIST();

  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalAddress =
    process.env.HOSPITAL_ADDRESS ||
    "Pune, City, Maharashtra | Phone: +91 91454 81414";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Discharge Summary - ${patientHistory.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                line-height: 1.5;
                color: #333;
                font-size: 13px;
                background: #fff;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 12mm;
            }
            
            /* Header */
            .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 12px;
                margin-bottom: 16px;
                page-break-after: avoid;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 60px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 8px;
            }
            
            .document-title {
                font-size: 18px;
                font-weight: bold;
                text-transform: uppercase;
                text-decoration: underline;
                margin-top: 12px;
                padding: 8px 0;
                background: #f8f8f8;
                border: 2px solid #000;
            }
            
            /* Patient Info Table */
            .patient-info-section {
              margin: 20px 0;
              page-break-inside: avoid;
            }
            
            .patient-info-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000;
              font-size: 13px;
              table-layout: fixed;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            
            .patient-info-table td {
              padding: 6px 4px;
              border: 1px solid #000;
              vertical-align: middle;
              word-wrap: break-word;
            }
            
            .patient-info-table .label {
              font-weight: bold;
              background-color: #f5f5f5;
              width: 80px;
              text-align: left;
              font-size: 12px;
            }
            
            .patient-info-table .value {
              background-color: #fff;
              text-align: left;
            }
            
            .patient-info-table .label-small {
              font-weight: bold;
              background-color: #f5f5f5;
              width: 60px;
              text-align: left;
              font-size: 12px;
            }
            
            .patient-info-table .value-small {
              background-color: #fff;
              width: 80px;
              text-align: left;
            }
            
            /* Section Dividers */
            .section-divider {
                width: 100%;
                height: 1px;
                background: #000;
                margin: 12px 0;
            }
            
            .section-header {
                background: #000;
                color: white;
                padding: 8px 12px;
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                margin: 12px 0 10px 0;
                page-break-after: avoid;
            }
            
            /* Main Layout */
            .content-row {
                display: table;
                width: 100%;
                margin-bottom: 12px;
                page-break-inside: avoid;
            }
            
            .content-left {
                display: table-cell;
                width: 50%;
                vertical-align: top;
                padding-right: 12px;
            }
            
            .content-right {
                display: table-cell;
                width: 50%;
                vertical-align: top;
                padding-left: 12px;
            }
            
            .content-full {
                width: 100%;
                margin-bottom: 12px;
                page-break-inside: avoid;
            }
            
            /* Field Layout */
            .field {
                margin-bottom: 10px;
                page-break-inside: avoid;
            }
            
            .field-label {
                font-weight: bold;
                font-size: 12px;
                margin-bottom: 4px;
                color: #000;
            }
            
            .field-value {
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 6px;
            }
            
            /* Section Groups */
            .section-group {
                page-break-inside: avoid;
                margin-bottom: 15px;
            }
            
            /* Lists */
            .simple-list {
                margin: 6px 0;
                padding-left: 20px;
            }
            
            .simple-list li {
                margin-bottom: 4px;
                font-size: 13px;
                line-height: 1.4;
            }
            
            /* Tables */
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
                font-size: 12px;
                page-break-inside: avoid;
            }
            
            .data-table th {
                background: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #666;
            }
            
            .data-table td {
                padding: 8px;
                border: 1px solid #666;
                vertical-align: top;
                line-height: 1.4;
            }
            
            .data-table tr:nth-child(even) {
                background: #f9f9f9;
            }
            
            /* Large tables that can break */
            .breakable-table {
                page-break-inside: auto;
            }
            
            .breakable-table thead {
                display: table-header-group;
            }
            
            .breakable-table tbody tr {
                page-break-inside: avoid;
            }
            
            /* Vital Signs Grid */
            .vitals-grid {
                display: table;
                width: 100%;
                margin: 10px 0;
                page-break-inside: avoid;
            }
            
            .vitals-row {
                display: table-row;
            }
            
            .vitals-cell {
                display: table-cell;
                width: 25%;
                padding: 8px;
                border: 1px solid #ccc;
                text-align: center;
                font-size: 12px;
            }
            
            .vitals-label {
                font-weight: bold;
                font-size: 11px;
                margin-bottom: 4px;
            }
            
            /* Highlight Boxes */
            .highlight-box {
                background: #f5f5f5;
                border: 1px solid #ccc;
                padding: 10px;
                margin: 8px 0;
                font-size: 13px;
                page-break-inside: avoid;
            }
            
            .urgent-box {
                background: #ffe6e6;
                border: 1px solid #ff9999;
                padding: 10px;
                margin: 8px 0;
                font-size: 13px;
                page-break-inside: avoid;
            }
            
            .info-box {
                background: #e6f3ff;
                border: 1px solid #99ccff;
                padding: 10px;
                margin: 8px 0;
                font-size: 13px;
                page-break-inside: avoid;
            }
            
            /* Signatures */
            .signature-section {
                margin-top: 30px;
                display: table;
                width: 100%;
                page-break-inside: avoid;
            }
            
            .signature-left {
                display: table-cell;
                width: 50%;
                text-align: center;
                padding-right: 15px;
            }
            
            .signature-right {
                display: table-cell;
                width: 50%;
                text-align: center;
                padding-left: 15px;
            }
            
            .signature-line {
                border-top: 1px solid #000;
                margin-top: 40px;
                padding-top: 8px;
                font-size: 12px;
            }
            
            /* Footer */
            .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 11px;
                color: #000;
                border-top: 1px solid #000;
                padding-top: 10px;
                page-break-inside: avoid;
            }
            
            /* Page Break Controls */
            .page-break-before {
                page-break-before: always;
            }
            
            .page-break-after {
                page-break-after: always;
            }
            
            .avoid-break {
                page-break-inside: avoid;
            }
            
            /* Print Styles */
            @media print {
                .container { 
                    padding: 8mm; 
                    max-width: none;
                }
                body { 
                    font-size: 12px; 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .section-header {
                    page-break-after: avoid;
                }
                
                .field {
                    page-break-inside: avoid;
                }
                
                .data-table {
                    page-break-inside: avoid;
                }
                
                .data-table thead {
                    display: table-header-group;
                }
                
                /* Force break before medications if it's getting crowded */
                .medications-section {
                    page-break-before: auto;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png" alt="Hospital Banner" class="hospital-banner" onerror="this.style.display='none'">
                <div class="hospital-info">${hospitalAddress}</div>
                <div class="document-title"> Discharge Summary</div>
            </div>

            <!-- Patient Information Table -->
            <div class="patient-info-section">
              <table class="patient-info-table">
                <tr>
                  <td class="label">Patient Name :</td>
                  <td class="value" colspan="3">${
                    patientHistory.name || "N/A"
                  }</td>
                  <td class="label">Age/Sex :</td>
                  <td class="value">${patientHistory.age || "N/A"} / ${
    patientHistory.gender || "N/A"
  }</td>
                  <td class="label">IPD No :</td>
                  <td class="value">${admissionHistory.ipdNumber || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Address :</td>
                  <td class="value" colspan="5">${
                    patientHistory.address || "N/A"
                  }</td>
                  <td class="label">OPD No :</td>
                  <td class="value">${admissionHistory.opdNumber || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Consultant :</td>
                  <td class="value" colspan="7">${
                    admissionHistory.doctor?.name || "N/A"
                  }</td>
                </tr>
                <tr>
                  <td class="label-small">D.O.A. :</td>
                  <td class="value-small">${formatDate(
                    admissionHistory.admissionDate
                  )}</td>
                  <td class="label-small">Time :</td>
                  <td class="value-small">${
                    convertToIST(
                      admissionHistory.admissionDate
                    )?.toLocaleTimeString("en-IN", {
                      hour12: true,
                      hour: "2-digit",
                      minute: "2-digit",
                    }) || "N/A"
                  }</td>
                  <td class="label-small">D.O.D. :</td>
                  <td class="value-small">${formatDate(
                    admissionHistory.dischargeDate
                  )}</td>
                  <td class="label-small">Time :</td>
                  <td class="value-small">${
                    convertToIST(
                      admissionHistory.dischargeDate
                    )?.toLocaleTimeString("en-IN", {
                      hour12: true,
                      hour: "2-digit",
                      minute: "2-digit",
                    }) || "N/A"
                  }</td>
                </tr>
              </table>
            </div>

            <!-- Main Content in Two Columns -->
            <div class="content-row">
                <div class="content-left">
                    <!-- Admission Details -->
                    <div class="section-group">
                        <div class="section-header">Admission Details</div>
                        
                        <div class="field">
                            <div class="field-label">Chief Complaint:</div>
                            <div class="field-value">${
                              admissionHistory.doctorConsulting?.[0]
                                ?.cheifComplaint || "Not documented"
                            }</div>
                        </div>
                        
                        <div class="field">
                            <div class="field-label">Reason for Admission:</div>
                            <div class="field-value">${
                              admissionHistory.reasonForAdmission ||
                              "Not specified"
                            }</div>
                        </div>
                        
                        <div class="field">
                            <div class="field-label">Initial Symptoms:</div>
                            <div class="field-value">${
                              admissionHistory.symptoms || "Not documented"
                            }</div>
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <!-- Medical History -->
                    <div class="section-group">
                        <div class="section-header">Medical History</div>
                        
                        <div class="field">
                            <div class="field-label">History of Present Illness:</div>
                            <div class="field-value">${
                              admissionHistory.doctorConsulting?.[0]
                                ?.historyOfPresentIllness || "Not documented"
                            }</div>
                        </div>
                        
                        <div class="field">
                            <div class="field-label">Past Medical History:</div>
                            <div class="field-value">${
                              admissionHistory.doctorConsulting?.[0]
                                ?.pastMedicalHistory || "Not significant"
                            }</div>
                        </div>
                        
                        <div class="field">
                            <div class="field-label">Family History:</div>
                            <div class="field-value">${
                              admissionHistory.doctorConsulting?.[0]
                                ?.familyHistory || "Not significant"
                            }</div>
                        </div>
                        
                        <div class="field">
                            <div class="field-label">Allergies:</div>
                            <div class="field-value ${
                              admissionHistory.doctorConsulting?.[0]?.allergies
                                ? "urgent-box"
                                : ""
                            }" style="${
    admissionHistory.doctorConsulting?.[0]?.allergies
      ? "font-weight: bold; color: #d63384;"
      : ""
  }">
                                ${
                                  admissionHistory.doctorConsulting?.[0]
                                    ?.allergies ||
                                  "NKDA (No Known Drug Allergies)"
                                }
                            </div>
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <!-- Diagnosis -->
                    <div class="section-group">
                        <div class="section-header">Diagnosis</div>
                        
                        <div class="field">
                            <div class="field-label">Initial Diagnosis:</div>
                            <div class="field-value">${
                              admissionHistory.initialDiagnosis ||
                              "Not specified"
                            }</div>
                        </div>
                        
                        ${
                          admissionHistory.diagnosisByDoctor?.length > 0
                            ? `
                            <div class="field">
                                <div class="field-label">Final Diagnosis:</div>
                                <div class="highlight-box">
                                    <ul class="simple-list">
                                        ${admissionHistory.diagnosisByDoctor
                                          .map(
                                            (diagnosis) =>
                                              `<li>${diagnosis}</li>`
                                          )
                                          .join("")}
                                    </ul>
                                </div>
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>

                <div class="content-right">
                    <!-- Vital Signs -->
                    <div class="section-group">
                        <div class="section-header">Vital Signs on Admission</div>
                        
                        ${
                          admissionHistory.vitals?.length > 0
                            ? `
                            <div class="vitals-grid">
                                <div class="vitals-row">
                                    <div class="vitals-cell">
                                        <div class="vitals-label">Temperature</div>
                                        <div>${
                                          admissionHistory.vitals[0]
                                            .temperature || "N/A"
                                        }</div>
                                    </div>
                                    <div class="vitals-cell">
                                        <div class="vitals-label">Pulse</div>
                                        <div>${
                                          admissionHistory.vitals[0].pulse ||
                                          "N/A"
                                        }</div>
                                    </div>
                                    <div class="vitals-cell">
                                        <div class="vitals-label">Blood Pressure</div>
                                        <div>${
                                          admissionHistory.vitals[0]
                                            .bloodPressure || "N/A"
                                        }</div>
                                    </div>
                                    <div class="vitals-cell">
                                        <div class="vitals-label">Blood Sugar</div>
                                        <div>${
                                          admissionHistory.vitals[0]
                                            .bloodSugarLevel || "N/A"
                                        }</div>
                                    </div>
                                </div>
                            </div>
                        `
                            : '<div class="field-value">Vital signs not recorded</div>'
                        }
                    </div>

                    <div class="section-divider"></div>

                    <!-- Procedures -->
                    ${
                      admissionHistory.procedures?.length > 0
                        ? `
                        <div class="section-group">
                            <div class="section-header">Procedures Performed</div>
                            <ul class="simple-list">
                                ${admissionHistory.procedures
                                  .map(
                                    (proc) => `
                                    <li><strong>${proc.name}</strong> - ${
                                      proc.frequency || "Once"
                                    } ${proc.date ? `(${proc.date})` : ""}</li>
                                `
                                  )
                                  .join("")}
                            </ul>
                        </div>
                        <div class="section-divider"></div>
                    `
                        : ""
                    }

                    <!-- Lab Results -->
                    ${
                      admissionHistory.labReports?.length > 0
                        ? `
                        <div class="section-group">
                            <div class="section-header">Laboratory Results</div>
                            ${admissionHistory.labReports
                              .map(
                                (labGroup) => `
                                <div class="field">
                                    <div class="field-label">${
                                      labGroup.labTestNameGivenByDoctor
                                    }:</div>
                                    <ul class="simple-list">
                                        ${labGroup.reports
                                          .map(
                                            (report) => `
                                            <li>${report.labTestName} (${report.labType})</li>
                                        `
                                          )
                                          .join("")}
                                    </ul>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                        <div class="section-divider"></div>
                    `
                        : ""
                    }

                    <!-- Discharge Information -->
                    <div class="section-group">
                        <div class="section-header">Discharge Information</div>
                        
                        <div class="field">
                            <div class="field-label">Condition at Discharge:</div>
                            <div class="field-value highlight-box"><strong>${
                              admissionHistory.conditionAtDischarge
                            }</strong></div>
                        </div>
                        
                        <div class="field">
                            <div class="field-label">Patient Weight:</div>
                            <div class="field-value">${
                              admissionHistory.weight
                                ? `${admissionHistory.weight} kg`
                                : "Not recorded"
                            }</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section-divider"></div>

            <!-- Full Width Sections -->
            ${
              admissionHistory.doctorPrescriptions?.length > 0
                ? `
                <div class="content-full medications-section">
                    <div class="section-header">Discharge Medications</div>
                    <table class="data-table ${
                      admissionHistory.doctorPrescriptions.length > 5
                        ? "breakable-table"
                        : ""
                    }">
                        <thead>
                            <tr>
                                <th style="width: 30%;">Medication</th>
                                <th style="width: 15%;">Morning</th>
                                <th style="width: 15%;">Afternoon</th>
                                <th style="width: 15%;">Night</th>
                                <th style="width: 25%;">Instructions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${admissionHistory.doctorPrescriptions
                              .map(
                                (prescription) => `
                                <tr>
                                    <td><strong>${
                                      prescription.medicine?.name ||
                                      "Not specified"
                                    }</strong></td>
                                    <td>${
                                      prescription.medicine?.morning || "-"
                                    }</td>
                                    <td>${
                                      prescription.medicine?.afternoon || "-"
                                    }</td>
                                    <td>${
                                      prescription.medicine?.night || "-"
                                    }</td>
                                    <td>${
                                      prescription.medicine?.comment || "-"
                                    }</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
                <div class="section-divider"></div>
            `
                : ""
            }

            ${
              admissionHistory.specialInstructions?.length > 0
                ? `
                <div class="content-full">
                    <div class="section-header">Discharge Instructions</div>
                    <div class="info-box">
                        <ul class="simple-list">
                            ${admissionHistory.specialInstructions
                              .map(
                                (instruction) => `
                                <li>${instruction.instruction} ${
                                  instruction.date
                                    ? `(${instruction.date})`
                                    : ""
                                }</li>
                            `
                              )
                              .join("")}
                        </ul>
                    </div>
                </div>
                <div class="section-divider"></div>
            `
                : ""
            }

            <!-- Follow-up Care -->
            <div class="content-full">
                <div class="section-header">Follow-up Care Instructions</div>
                <div class="info-box">
                    <ul class="simple-list">
                        <li>Follow up with ${
                          admissionHistory.doctor?.name || "attending physician"
                        } in 1-2 weeks</li>
                        <li>Return to hospital immediately if symptoms worsen</li>
                        <li>Continue prescribed medications as directed</li>
                        <li>Schedule any recommended specialist appointments</li>
                        <li>Maintain all scheduled follow-up appointments</li>
                    </ul>
                </div>
            </div>

            <!-- Signatures -->
            <div class="signature-section">
                <div class="signature-left">
                    <div class="signature-line">
                        <div><strong>Attending Physician</strong></div>
                        <div>Dr. ${
                          admissionHistory.doctor?.name || "_______________"
                        }</div>
                        <div>Date: ${formatDate(currentIST)}</div>
                    </div>
                </div>
                <div class="signature-right">
                    <div class="signature-line">
                        <div><strong>Medical Records</strong></div>
                        <div>_______________</div>
                        <div>Date: ${formatDate(currentIST)}</div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <div>Generated: ${formatDateTime(currentIST)} | Patient ID: ${
    patientHistory.patientId
  }</div>
                <div>This document contains confidential medical information</div>
            </div>
        </div>
    </body>
    </html>
  `;
};
export const generateManualDischargeSummaryHTML = (
  data,
  bannerImageUrl = "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png"
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Discharge Summary - ${data.patientName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13px;
          line-height: 1.3;
          color: #000;
          background: #fff;
          padding: 15px;
        }
        
        .container {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          min-height: 297mm;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 3px solid #000;
          page-break-inside: avoid;
        }
        
        .banner-image {
          width: 100%;
          max-height: 150px;
          object-fit: contain;
          margin-bottom: 10px;
          border: 1px solid #ddd;
        }
        
        .hospital-name {
          font-size: 22px;
          font-weight: bold;
          margin: 8px 0;
          color: #000;
          text-transform: uppercase;
        }
        
        .hospital-details {
          font-size: 13px;
          margin-bottom: 12px;
          color: #333;
        }
        
        .document-title {
          font-size: 20px;
          font-weight: bold;
          text-decoration: underline;
          margin-top: 12px;
          padding: 8px 0;
          background: #f8f8f8;
          border: 2px solid #000;
        }
        
        .patient-info-section {
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .patient-info-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
          font-size: 13px;
          table-layout: fixed;
        }
        
        .patient-info-table td {
          padding: 7px 4px;
          border: 1px solid #000;
          vertical-align: middle;
          word-wrap: break-word;
        }
        
        .patient-info-table .label {
          font-weight: bold;  


          background-color: #f5f5f5;
          width: 90px;
          text-align: left;
          font-size: 12px;
            white-space: nowrap;  /* Prevent text wrapping */

        }
        
        .patient-info-table .value {
          background-color: #fff;
          text-align: left;
        }
        
        .patient-info-table .label-small {
          font-weight: bold;

          background-color: #f5f5f5;
          width: 70px;
          text-align: left;
          font-size: 12px;
        }
        
        .patient-info-table .value-small {
          background-color: #fff;
          width: 80px;
          text-align: left;
        }
        
        .clinical-content {
          margin-top: 25px;
        }
        
        .content-section {
          margin: 12px 0;
          page-break-inside: avoid;
          min-height: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        
        .content-section.page-break-before {
          page-break-before: always;
          margin-top: 30px;
        }
        
        .section-row {
          display: table;
          width: 100%;
          margin-bottom: 8px;
        }
        
        .section-label {
          display: table-cell;
          font-weight: bold;
          font-size: 13px;
          width: 120px;
          vertical-align: top;
          padding-right: 10px;
          padding-bottom: 3px;
        }
        
        .section-content {
          display: table-cell;
          vertical-align: top;
          line-height: 1.4;
          text-align: justify;
          white-space: pre-line;
          word-wrap: break-word;
          padding-left: 5px;
          padding-bottom: 3px;
        }
        
        .signature-section {
          margin-top: 60px;
          text-align: right;
          padding-right: 80px;
          page-break-inside: avoid;
        }
        
        .signature-box {
          display: inline-block;
          text-align: center;
          margin-top: 50px;
        }
        
        .signature-line {
          width: 220px;
          border-top: 2px solid #000;
          margin-bottom: 8px;
        }
        
        .signature-label {
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .consultant-details {
          font-size: 12px;
          line-height: 1.3;
        }
        
  .footer {
          margin-top: 30px;
          font-size: 9px;
          color: #000;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 10px;
          page-break-inside: avoid;
        }
        
        /* Print-specific styles */
        @media print {
          body { 
            padding: 0;
            font-size: 11px;
          }
          
          .container {
            max-width: none;
            margin: 0;
            padding: 15mm;
          }
          
          .page-break-before {
            page-break-before: always !important;
          }
          
          .header {
            margin-bottom: 15px;
          }
          
          .signature-section {
            margin-top: 40px;
          }
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 768px) {
          .container {
            padding: 10px;
          }
          
          .patient-info-table {
            font-size: 10px;
          }
          
          .section-label {
            width: 120px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Hospital Header with Banner -->
        <div class="header">
          ${
            bannerImageUrl
              ? `<img src="${bannerImageUrl}" alt="Hospital Banner" class="banner-image" onerror="this.style.display='none'">`
              : ""
          }
      
          <div class="document-title">DISCHARGE SUMMARY</div>
        </div>

        <!-- Patient Information Table -->
        <div class="patient-info-section">
          <table class="patient-info-table">
            <tr>
              <td class="label">Patient Name :</td>
              <td class="value" colspan="3">${data.patientName || "N/A"}</td>
              <td class="label">Age/Sex :</td>
              <td class="value">${data.age || "N/A"} / ${data.sex || "N/A"}</td>
              <td class="label">IPD No :</td>
              <td class="value">${data.ipdNo || "N/A"}</td>
            </tr>
            <tr>
              <td class="label">Address :</td>
              <td class="value" colspan="5">${data.address || "N/A"}</td>
              <td class="label">OPD No :</td>
              <td class="value">${data.opdNo || "N/A"}</td>
            </tr>
            <tr>
              <td class="label">Consultant :</td>
              <td class="value" colspan="7">${data.consultant || "N/A"}</td>
            </tr>
            <tr>
              <td class="label-small">D.O.A. :</td>
              <td class="value-small">${data.admissionDate || "N/A"}</td>
              <td class="label-small">Time :</td>
              <td class="value-small">${data.admissionTime || "N/A"}</td>
              <td class="label-small">D.O.D. :</td>
              <td class="value-small">${data.dischargeDate || "N/A"}</td>
              <td class="label-small">Time :</td>
              <td class="value-small">${data.dischargeTime || "N/A"}</td>
            </tr>
          </table>
        </div>

        <!-- Clinical Information -->
        <div class="clinical-content">
          <div class="content-section">
            <div class="section-row">
              <div class="section-label">Final Diagnosis :</div>
              <div class="section-content">${data.finalDiagnosis || "N/A"}</div>
            </div>
          </div>

          <div class="content-section">
            <div class="section-row">
              <div class="section-label">Complaints :</div>
              <div class="section-content">${data.complaints || "N/A"}</div>
            </div>
          </div>

          <div class="content-section">
            <div class="section-row">
              <div class="section-label">Past History :</div>
              <div class="section-content">${
                data.pastHistory || "NO H/O - ANY DRUG ALLERGY"
              }</div>
            </div>
          </div>

          <div class="content-section">
            <div class="section-row">
              <div class="section-label">Exam Findings :</div>
              <div class="section-content">${data.examFindings || "N/A"}</div>
            </div>
          </div>

          ${
            data.generalExam && data.generalExam !== "N/A"
              ? `
          <div class="content-section">
            <div class="section-row">
              <div class="section-label">General Exam :</div>
              <div class="section-content">${data.generalExam}</div>
            </div>
          </div>
          `
              : ""
          }

          ${
            data.radiology && data.radiology !== "N/A"
              ? `
          <div class="content-section">
            <div class="section-row">
              <div class="section-label">Radiology :</div>
              <div class="section-content">${data.radiology}</div>
            </div>
          </div>
          `
              : ""
          }

          ${
            data.pathology && data.pathology !== "N/A"
              ? `
          <div class="content-section">
            <div class="section-row">
              <div class="section-label">Pathology :</div>
              <div class="section-content">${data.pathology}</div>
            </div>
          </div>
          `
              : ""
          }

          ${
            data.operation && data.operation !== "N/A"
              ? `
          <div class="content-section ${
            data.operation.length > 500 ? "page-break-before" : ""
          }">
            <div class="section-row">
              <div class="section-label">Operation :</div>
              <div class="section-content">${data.operation}</div>
            </div>
          </div>
          `
              : ""
          }

          ${
            data.treatmentGiven && data.treatmentGiven !== "N/A"
              ? `
          <div class="content-section ${
            data.treatmentGiven.length > 400 ? "page-break-before" : ""
          }">
            <div class="section-row">
              <div class="section-label">Treatment Given :</div>
              <div class="section-content">${data.treatmentGiven}</div>
            </div>
          </div>
          `
              : ""
          }

          <div class="content-section">
            <div class="section-row">
              <div class="section-label">Condition on Discharge :</div>
              <div class="section-content">${
                data.conditionOnDischarge || "N/A"
              }</div>
            </div>
          </div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Authorised Signatory</div>
            <div class="consultant-details">
              <strong>${data.consultant || "N/A"}</strong><br>
              Consultant<br>
              ${
                data.generatedAt
                  ? data.generatedAt.toLocaleDateString("en-GB")
                  : ""
              }
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          Generated on: ${
            data.generatedAt ? data.generatedAt.toLocaleString("en-IN") : "N/A"
          } | 
          Manual Entry | Patient Data from History | 
          Document ID: ${
            data.patientName
              ? data.patientName.replace(/[^a-zA-Z0-9]/g, "")
              : "N/A"
          }_${data.generatedAt ? data.generatedAt.getTime() : "N/A"}
        </div>
      </div>
    </body>
    </html>
  `;
};
