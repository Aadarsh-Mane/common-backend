// Dialysis Registration PDF Template
export const generateDialysisRegistrationPDF = (registration, patient) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Dialysis Patient Registration</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .hospital-name {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        .document-title {
          font-size: 18px;
          margin-top: 10px;
          color: #34495e;
        }
        .patient-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-section {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16px;
          color: #2c3e50;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .label {
          font-weight: bold;
          width: 150px;
          color: #555;
        }
        .value {
          flex: 1;
          color: #333;
        }
        .schedule-info {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-top: 15px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
        }
        .signature-box {
          text-align: center;
          border-top: 1px solid #333;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hospital-name">HOSPITAL MANAGEMENT SYSTEM</div>
        <div class="document-title">DIALYSIS PATIENT REGISTRATION</div>
      </div>

      <div class="patient-info">
        <div class="info-section">
          <div class="section-title">Patient Information</div>
          <div class="info-row">
            <span class="label">Patient ID:</span>
            <span class="value">${patient.patientId}</span>
          </div>
          <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">${patient.name}</span>
          </div>
          <div class="info-row">
            <span class="label">Age:</span>
            <span class="value">${patient.age} years</span>
          </div>
          <div class="info-row">
            <span class="label">Gender:</span>
            <span class="value">${patient.gender}</span>
          </div>
          <div class="info-row">
            <span class="label">Contact:</span>
            <span class="value">${patient.contact}</span>
          </div>
          <div class="info-row">
            <span class="label">Address:</span>
            <span class="value">${patient.address || "Not provided"}</span>
          </div>
        </div>

        <div class="info-section">
          <div class="section-title">Dialysis Information</div>
          <div class="info-row">
            <span class="label">Dialysis Patient ID:</span>
            <span class="value">${registration.dialysisPatientId}</span>
          </div>
          <div class="info-row">
            <span class="label">Dialysis Type:</span>
            <span class="value">${registration.dialysisType}</span>
          </div>
          <div class="info-row">
            <span class="label">Access Type:</span>
            <span class="value">${registration.accessType}</span>
          </div>
          <div class="info-row">
            <span class="label">Nephrologist:</span>
            <span class="value">${registration.nephrologist.name}</span>
          </div>
          <div class="info-row">
            <span class="label">Start Date:</span>
            <span class="value">${new Date(
              registration.dialysisStartDate
            ).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="label">Status:</span>
            <span class="value">${registration.dialysisStatus}</span>
          </div>
        </div>
      </div>

      <div class="schedule-info">
        <div class="section-title">Dialysis Schedule</div>
        <div class="info-row">
          <span class="label">Days:</span>
          <span class="value">${registration.dialysisSchedule.days.join(
            ", "
          )}</span>
        </div>
        <div class="info-row">
          <span class="label">Time:</span>
          <span class="value">${registration.dialysisSchedule.time}</span>
        </div>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div>Registered By</div>
          <div style="margin-top: 20px; font-weight: bold;">Doctor Signature</div>
        </div>
        <div class="signature-box">
          <div>Date: ${new Date().toLocaleDateString()}</div>
          <div style="margin-top: 20px; font-weight: bold;">Hospital Seal</div>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated document. Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

// Dialysis Session PDF Template
export const generateDialysisSessionPDF = (session) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Dialysis Session Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .hospital-name {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        .document-title {
          font-size: 18px;
          margin-top: 10px;
          color: #34495e;
        }
        .session-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-section {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16px;
          color: #2c3e50;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .label {
          font-weight: bold;
          width: 150px;
          color: #555;
        }
        .value {
          flex: 1;
          color: #333;
        }
        .vitals-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .vitals-table th,
        .vitals-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .vitals-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .adverse-events {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin-top: 15px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hospital-name">HOSPITAL MANAGEMENT SYSTEM</div>
        <div class="document-title">DIALYSIS SESSION REPORT</div>
      </div>

      <div class="session-info">
        <div class="info-section">
          <div class="section-title">Session Details</div>
          <div class="info-row">
            <span class="label">Patient ID:</span>
            <span class="value">${session.dialysisPatientId}</span>
          </div>
          <div class="info-row">
            <span class="label">Session Date:</span>
            <span class="value">${new Date(
              session.sessionDate
            ).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="label">Machine ID:</span>
            <span class="value">${session.machineId}</span>
          </div>
          <div class="info-row">
            <span class="label">Dialyzer Type:</span>
            <span class="value">${session.dialyzerType}</span>
          </div>
          <div class="info-row">
            <span class="label">Start Time:</span>
            <span class="value">${new Date(
              session.sessionStartTime
            ).toLocaleTimeString()}</span>
          </div>
          <div class="info-row">
            <span class="label">End Time:</span>
            <span class="value">${
              session.sessionEndTime
                ? new Date(session.sessionEndTime).toLocaleTimeString()
                : "Ongoing"
            }</span>
          </div>
          <div class="info-row">
            <span class="label">Duration:</span>
            <span class="value">${
              session.duration
                ? Math.floor(session.duration / 60) +
                  "h " +
                  (session.duration % 60) +
                  "m"
                : "Ongoing"
            }</span>
          </div>
        </div>

        <div class="info-section">
          <div class="section-title">Technical Parameters</div>
          <div class="info-row">
            <span class="label">Dry Weight:</span>
            <span class="value">${session.dryWeight} kg</span>
          </div>
          <div class="info-row">
            <span class="label">Blood Flow Rate:</span>
            <span class="value">${session.bloodFlowRate} ml/min</span>
          </div>
          <div class="info-row">
            <span class="label">Dialysate Flow:</span>
            <span class="value">${session.dialysateFlowRate} ml/min</span>
          </div>
          <div class="info-row">
            <span class="label">Heparin Dosage:</span>
            <span class="value">${session.heparinDosage} units</span>
          </div>
          <div class="info-row">
            <span class="label">UF Volume:</span>
            <span class="value">${
              session.ultrafiltrationVolume || "N/A"
            } ml</span>
          </div>
          <div class="info-row">
            <span class="label">Conductivity:</span>
            <span class="value">${session.conductivity} mS/cm</span>
          </div>
          <div class="info-row">
            <span class="label">Temperature:</span>
            <span class="value">${session.dialysateTemperature}°C</span>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">Vital Signs Monitoring</div>
        <table class="vitals-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Pre-Dialysis</th>
              <th>Post-Dialysis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Weight</td>
              <td>${session.preDialysisAssessment?.preWeight || "N/A"} kg</td>
              <td>${session.postDialysisMonitoring?.postWeight || "N/A"} kg</td>
            </tr>
            <tr>
              <td>Blood Pressure</td>
              <td>${
                session.preDialysisAssessment?.preBloodPressure || "N/A"
              }</td>
              <td>${
                session.postDialysisMonitoring?.postBloodPressure || "N/A"
              }</td>
            </tr>
            <tr>
              <td>Pulse</td>
              <td>${session.preDialysisAssessment?.pulse || "N/A"} bpm</td>
              <td>${session.postDialysisMonitoring?.postPulse || "N/A"} bpm</td>
            </tr>
            <tr>
              <td>Temperature</td>
              <td>${session.preDialysisAssessment?.temperature || "N/A"}°C</td>
              <td>${
                session.postDialysisMonitoring?.postTemperature || "N/A"
              }°C</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${
        session.adverseEvents && session.adverseEvents.length > 0
          ? `
        <div class="adverse-events">
          <div class="section-title" style="color: #856404;">Adverse Events</div>
          ${session.adverseEvents
            .map(
              (event) => `
            <div class="info-row">
              <span class="label">Event:</span>
              <span class="value">${event.event}</span>
            </div>
            <div class="info-row">
              <span class="label">Time:</span>
              <span class="value">${new Date(
                event.time
              ).toLocaleTimeString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Action:</span>
              <span class="value">${event.action}</span>
            </div>
            <hr style="margin: 10px 0;">
          `
            )
            .join("")}
        </div>
      `
          : ""
      }

      <div class="info-section" style="margin-top: 20px;">
        <div class="section-title">Staff Information</div>
        <div class="info-row">
          <span class="label">Technician/Nurse:</span>
          <span class="value">${session.technicianNurse?.name || "N/A"}</span>
        </div>
        <div class="info-row">
          <span class="label">Access Site Condition:</span>
          <span class="value">${
            session.preDialysisAssessment?.accessSiteCondition || "N/A"
          }</span>
        </div>
        <div class="info-row">
          <span class="label">Post Access Check:</span>
          <span class="value">${
            session.postDialysisMonitoring?.accessSiteCheck || "N/A"
          }</span>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated document. Generated on ${new Date().toLocaleString()}</p>
        <p>Session Status: ${session.sessionStatus}</p>
      </div>
    </body>
    </html>
  `;
};

// Dialysis History PDF Template
export const generateDialysisHistoryPDF = (sessions, dialysisPatientId) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Dialysis History Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .hospital-name {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        .document-title {
          font-size: 18px;
          margin-top: 10px;
          color: #34495e;
        }
        .summary-section {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .sessions-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .sessions-table th,
        .sessions-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }
        .sessions-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .sessions-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .label {
          font-weight: bold;
          width: 150px;
          color: #555;
        }
        .value {
          flex: 1;
          color: #333;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hospital-name">HOSPITAL MANAGEMENT SYSTEM</div>
        <div class="document-title">DIALYSIS HISTORY REPORT</div>
        <div style="margin-top: 10px; font-size: 14px;">Patient ID: ${dialysisPatientId}</div>
      </div>

      <div class="summary-section">
        <h3>Summary</h3>
        <div class="info-row">
          <span class="label">Total Sessions:</span>
          <span class="value">${sessions.length}</span>
        </div>
        <div class="info-row">
          <span class="label">Report Generated:</span>
          <span class="value">${new Date().toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="label">Date Range:</span>
          <span class="value">
            ${
              sessions.length > 0
                ? `${new Date(
                    sessions[sessions.length - 1].sessionDate
                  ).toLocaleDateString()} to ${new Date(
                    sessions[0].sessionDate
                  ).toLocaleDateString()}`
                : "No sessions found"
            }
          </span>
        </div>
      </div>

      ${
        sessions.length > 0
          ? `
        <table class="sessions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Machine</th>
              <th>Duration</th>
              <th>Pre Weight</th>
              <th>Post Weight</th>
              <th>UF Volume</th>
              <th>Pre BP</th>
              <th>Post BP</th>
              <th>Complications</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sessions
              .map(
                (session) => `
              <tr>
                <td>${new Date(session.sessionDate).toLocaleDateString()}</td>
                <td>${session.machineId || "N/A"}</td>
                <td>${
                  session.duration
                    ? Math.floor(session.duration / 60) +
                      "h " +
                      (session.duration % 60) +
                      "m"
                    : "N/A"
                }</td>
                <td>${session.preDialysisAssessment?.preWeight || "N/A"}</td>
                <td>${session.postDialysisMonitoring?.postWeight || "N/A"}</td>
                <td>${session.ultrafiltrationVolume || "N/A"}</td>
                <td>${
                  session.preDialysisAssessment?.preBloodPressure || "N/A"
                }</td>
                <td>${
                  session.postDialysisMonitoring?.postBloodPressure || "N/A"
                }</td>
                <td>${
                  session.adverseEvents?.length > 0 ||
                  session.postDialysisMonitoring?.complications?.length > 0
                    ? "Yes"
                    : "No"
                }</td>
                <td>${session.sessionStatus}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
          : "<p>No dialysis sessions found for the specified criteria.</p>"
      }

      <div class="footer">
        <p>This is a computer-generated document. Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

// Dialysis Billing PDF Template
export const generateDialysisBillingPDF = (billing) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Dialysis Billing Invoice</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .hospital-name {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        .document-title {
          font-size: 18px;
          margin-top: 10px;
          color: #34495e;
        }
        .billing-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-section {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16px;
          color: #2c3e50;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .label {
          font-weight: bold;
          width: 150px;
          color: #555;
        }
        .value {
          flex: 1;
          color: #333;
        }
        .consumables-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .consumables-table th,
        .consumables-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .consumables-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .total-section {
          background-color: #e8f5e8;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
          text-align: right;
        }
        .total-amount {
          font-size: 20px;
          font-weight: bold;
          color: #27ae60;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hospital-name">HOSPITAL MANAGEMENT SYSTEM</div>
        <div class="document-title">DIALYSIS BILLING INVOICE</div>
        <div style="margin-top: 10px; font-size: 14px;">Invoice #: ${
          billing._id
        }</div>
      </div>

      <div class="billing-info">
        <div class="info-section">
          <div class="section-title">Patient Information</div>
          <div class="info-row">
            <span class="label">Patient ID:</span>
            <span class="value">${billing.dialysisPatientId}</span>
          </div>
          <div class="info-row">
            <span class="label">Session ID:</span>
            <span class="value">${billing.sessionId}</span>
          </div>
          <div class="info-row">
            <span class="label">Billing Date:</span>
            <span class="value">${new Date(
              billing.billingDate
            ).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="label">Package Type:</span>
            <span class="value">${billing.packageType}</span>
          </div>
        </div>

        <div class="info-section">
          <div class="section-title">Payment Information</div>
          <div class="info-row">
            <span class="label">Payment Method:</span>
            <span class="value">${billing.paymentMethod}</span>
          </div>
          ${
            billing.insuranceDetails?.provider
              ? `
            <div class="info-row">
              <span class="label">Insurance Provider:</span>
              <span class="value">${billing.insuranceDetails.provider}</span>
            </div>
            <div class="info-row">
              <span class="label">Policy Number:</span>
              <span class="value">${billing.insuranceDetails.policyNumber}</span>
            </div>
          `
              : ""
          }
          <div class="info-row">
            <span class="label">Billing Status:</span>
            <span class="value">${billing.billingStatus}</span>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">Service Charges</div>
        <div class="info-row">
          <span class="label">Dialysis Session:</span>
          <span class="value">₹${billing.sessionCharges}</span>
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">Consumables Used</div>
        <table class="consumables-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            ${billing.consumables
              .map(
                (item) => `
              <tr>
                <td>${item.item}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unitCost}</td>
                <td>₹${item.totalCost}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="total-section">
        <div class="info-row">
          <span class="label">Session Charges:</span>
          <span class="value">₹${billing.sessionCharges}</span>
        </div>
        <div class="info-row">
          <span class="label">Consumables Total:</span>
          <span class="value">₹${billing.consumables.reduce(
            (sum, item) => sum + item.totalCost,
            0
          )}</span>
        </div>
        <hr style="margin: 10px 0;">
        <div class="total-amount">
          Total Amount: ₹${billing.totalAmount}
        </div>
        <div class="info-row" style="margin-top: 10px;">
          <span class="label">Paid Amount:</span>
          <span class="value">₹${billing.paidAmount}</span>
        </div>
        <div class="info-row">
          <span class="label">Balance Amount:</span>
          <span class="value">₹${billing.balanceAmount}</span>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated document. Generated on ${new Date().toLocaleString()}</p>
        <p>Thank you for choosing our dialysis services!</p>
      </div>
    </body>
    </html>
  `;
};
