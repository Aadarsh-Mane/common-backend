export const generateDischargeSummaryHTML = (
  patientHistory,
  admissionHistory,
  options = {}
) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1747566698/Bhosale_prescription_iyyjpw.png";
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
            }
            
            /* Patient Info Table */
            .patient-info {
                width: 100%;
                border: 1px solid #000;
                border-collapse: collapse;
                margin-bottom: 16px;
                font-size: 12px;
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            
            .patient-info th {
                background: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 15%;
            }
            
            .patient-info td {
                padding: 8px;
                border: 1px solid #000;
                width: 18%;
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
                <img src="${hospitalBanner}" alt="Hospital Banner" class="hospital-banner" onerror="this.style.display='none'">
                <div class="hospital-info">${hospitalAddress}</div>
                <div class="document-title">Medical Discharge Summary</div>
            </div>

            <!-- Patient Information Table -->
            <table class="patient-info">
                <tr>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age}Y / ${patientHistory.gender}</td>
                </tr>
                <tr>
                    <th>DOB</th>
                    <td>${patientHistory.dob || "Not specified"}</td>
                    <th>Contact</th>
                    <td>${patientHistory.contact}</td>
                    <th>Bed No.</th>
                    <td>${admissionHistory.bedNumber || "Not specified"}</td>
                </tr>
                <tr>
                    <th>Admission</th>
                    <td>${formatDate(admissionHistory.admissionDate)}</td>
                    <th>Discharge</th>
                    <td>${formatDate(admissionHistory.dischargeDate)}</td>
                    <th>LOS</th>
                    <td>${Math.ceil(
                      (new Date(admissionHistory.dischargeDate) -
                        new Date(admissionHistory.admissionDate)) /
                        (1000 * 60 * 60 * 24)
                    )} days</td>
                </tr>
                <tr>
                    <th>Doctor</th>
                    <td>${admissionHistory.doctor?.name || "Not specified"}</td>
                    <th>Department</th>
                    <td>${
                      admissionHistory.section?.name || "Not specified"
                    }</td>
                    <th>Condition</th>
                    <td><strong>${
                      admissionHistory.conditionAtDischarge
                    }</strong></td>
                </tr>
            </table>

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
                        <div>Date: ${formatDate(new Date())}</div>
                    </div>
                </div>
                <div class="signature-right">
                    <div class="signature-line">
                        <div><strong>Medical Records</strong></div>
                        <div>_______________</div>
                        <div>Date: ${formatDate(new Date())}</div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <div>Generated: ${formatDateTime(new Date())} | Patient ID: ${
    patientHistory.patientId
  }</div>
                <div>This document contains confidential medical information</div>
            </div>
        </div>
    </body>
    </html>
  `;
};
