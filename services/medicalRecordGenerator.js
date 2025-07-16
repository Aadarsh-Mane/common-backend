// Professional PDF Templates - Hospital Style with Discharge Date

export const generateSymptomsHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalName = "BHOSALE HOSPITAL";
  const hospitalAddress =
    "Shete mala,Near Ganesh Temple Narayanwadi Road Narayangaon Tal Junnar Dist Pune Pin 410504";
  const hospitalPhone = "Phone No.9923537180";

  const formatDateWithTime = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Parse symptoms by doctor to extract symptom and date
  const parseSymptomEntry = (entry) => {
    const parts = entry.split(" - ");
    if (parts.length >= 2) {
      const symptom = parts[0];
      const dateTime = parts.slice(1).join(" - ");
      return { symptom, dateTime };
    }
    return { symptom: entry, dateTime: "N/A" };
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Symptoms Report - ${patientHistory.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                min-height: 297mm;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                page-break-after: avoid;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 5px;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
                color: #2c5aa0;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 11px;
                border: 2px solid #000;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 8px;
                border: 1px solid #000;
                width: 25%;
            }
            
            .content-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
            }
            
            .content-table th {
                background-color: #2c5aa0;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 14px;
            }
            
            .content-table td {
                padding: 12px;
                border: 1px solid #000;
                vertical-align: top;
                font-size: 12px;
            }

            .symptoms-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
                font-size: 11px;
            }

            .symptoms-table th {
                background-color: #28a745;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 12px;
            }

            .symptoms-table td {
                padding: 8px;
                border: 1px solid #000;
                text-align: left;
                font-size: 11px;
            }

            .symptom-text {
                font-weight: bold;
                color: #2c5aa0;
            }

            .symptom-date {
                color: #666;
                font-size: 10px;
            }
            
            .symptom-entry {
                margin-bottom: 8px;
                padding: 8px;
                background-color: #f9f9f9;
                border-left: 4px solid #28a745;
                border-radius: 3px;
            }
            
            .no-data {
                text-align: center;
                font-style: italic;
                color: #666;
                padding: 20px;
            }
            
            .footer {
                position: fixed;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                text-align: center;
                font-size: 10px;
                border-top: 1px solid #000;
                padding-top: 5px;
            }

            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                
                @page {
                    margin: 15mm 10mm;
                    size: A4;
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
                <div class="hospital-info">${hospitalPhone}</div>
                <div class="hospital-info">Date: ${formatDate(new Date())}</div>
                <div class="report-title">SYMPTOMS REPORT</div>
            </div>

            <!-- Patient Information -->
            <table class="patient-info-table">
                <tr>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                </tr>
                <tr>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age} Years / ${
    patientHistory.gender
  }</td>
                    <th>Contact</th>
                    <td>${patientHistory.contact || "N/A"}</td>
                </tr>
                <tr>
                    <th>Address</th>
                    <td colspan="3">${patientHistory.address || "N/A"}</td>
                </tr>
                <tr>
                    <th>OPD Number</th>
                    <td>${latestRecord.opdNumber || "N/A"}</td>
                    <th>IPD Number</th>
                    <td>${latestRecord.ipdNumber || "N/A"}</td>
                </tr>
                <tr>
                    <th>Admission Date</th>
                    <td>${
                      latestRecord.admissionDate
                        ? formatDateWithTime(latestRecord.admissionDate)
                        : "N/A"
                    }</td>
                    <th>Discharge Date</th>
                    <td>${
                      latestRecord.dischargeDate
                        ? formatDateWithTime(latestRecord.dischargeDate)
                        : "N/A"
                    }</td>
                </tr>
                <tr>
                    <th>Attending Doctor</th>
                    <td colspan="3">${latestRecord.doctor?.name || "N/A"}</td>
                </tr>
            </table>

            <!-- Initial Symptoms -->
            <table class="content-table">
                <thead>
                    <tr>
                        <th>INITIAL SYMPTOMS AT ADMISSION</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.symptoms
                                ? `<div class="symptom-entry">${latestRecord.symptoms}</div>`
                                : '<div class="no-data">No initial symptoms recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Symptoms by Doctor in Table Format -->
            <table class="symptoms-table">
                <thead>
                    <tr>
                        <th colspan="3">SYMPTOMS RECORDED BY DOCTOR</th>
                    </tr>
                    <tr>
                        <th style="width: 10%;">Sr. No.</th>
                        <th style="width: 60%;">Symptom</th>
                        <th style="width: 30%;">Date & Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      latestRecord.symptomsByDoctor &&
                      latestRecord.symptomsByDoctor.length > 0
                        ? latestRecord.symptomsByDoctor
                            .map((entry, index) => {
                              const { symptom, dateTime } =
                                parseSymptomEntry(entry);
                              return `
                                    <tr>
                                        <td style="text-align: center;">${
                                          index + 1
                                        }</td>
                                        <td class="symptom-text">${symptom}</td>
                                        <td class="symptom-date">${dateTime}</td>
                                    </tr>
                                `;
                            })
                            .join("")
                        : `
                            <tr>
                                <td colspan="3" class="no-data">No additional symptoms recorded by doctor</td>
                            </tr>
                        `
                    }
                </tbody>
            </table>

            <!-- Chief Complaints -->
            <table class="content-table">
                <thead>
                    <tr>
                        <th>CHIEF COMPLAINTS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.doctorConsulting &&
                              latestRecord.doctorConsulting.length > 0
                                ? latestRecord.doctorConsulting
                                    .map((consultation) =>
                                      consultation.cheifComplaint
                                        ? `<div class="symptom-entry"><strong>Chief Complaint:</strong> ${consultation.cheifComplaint}</div>`
                                        : ""
                                    )
                                    .join("") ||
                                  '<div class="no-data">No chief complaints recorded</div>'
                                : '<div class="no-data">No chief complaints recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                <p>Report generated on ${formatDate(
                  new Date()
                )} | This is a computer-generated document</p>
                <p><strong>Confidential Medical Record - For Healthcare Professionals Only</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const generateVitalsHTML = (patientHistory, latestRecord, hospital) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalAddress =
    "Shete mala,Near Ganesh Temple Narayanwadi Road Narayangaon Tal Junnar Dist Pune Pin 410504";
  const hospitalPhone = "Phone No.9923537180";

  const formatDateWithTime = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vital Signs Report - ${patientHistory.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                min-height: 297mm;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                page-break-after: avoid;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 5px;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
                color: #2c5aa0;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 11px;
                border: 2px solid #000;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 8px;
                border: 1px solid #000;
                width: 25%;
            }
            
            .vitals-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
            }
            
            .vitals-table th {
                background-color: #2c5aa0;
                color: white;
                padding: 8px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 11px;
            }
            
            .vitals-table td {
                padding: 8px;
                border: 1px solid #000;
                text-align: center;
                font-size: 11px;
            }
            
            .vital-record-header {
                background-color: #f8f9fa;
                font-weight: bold;
                text-align: left;
                padding: 10px;
            }
            
            .no-data {
                text-align: center;
                font-style: italic;
                color: #666;
                padding: 20px;
            }
            
            .footer {
                position: fixed;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                text-align: center;
                font-size: 10px;
                border-top: 1px solid #000;
                padding-top: 5px;
            }
            
            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                
                @page {
                    margin: 15mm 10mm;
                    size: A4;
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
                <div class="hospital-info">${hospitalPhone}</div>
                <div class="hospital-info">Date: ${formatDate(new Date())}</div>
                <div class="report-title">VITAL SIGNS REPORT</div>
            </div>

            <!-- Patient Information -->
            <table class="patient-info-table">
                <tr>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                </tr>
                <tr>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age} Years / ${
    patientHistory.gender
  }</td>
                    <th>Contact</th>
                    <td>${patientHistory.contact || "N/A"}</td>
                </tr>
                <tr>
                    <th>Weight</th>
                    <td>${
                      latestRecord.weight ? `${latestRecord.weight} kg` : "N/A"
                    }</td>
                    <th>Attending Doctor</th>
                    <td>${latestRecord.doctor?.name || "N/A"}</td>
                </tr>
                <tr>
                    <th>OPD Number</th>
                    <td>${latestRecord.opdNumber || "N/A"}</td>
                    <th>IPD Number</th>
                    <td>${latestRecord.ipdNumber || "N/A"}</td>
                </tr>
                <tr>
                    <th>Admission Date</th>
                    <td>${
                      latestRecord.admissionDate
                        ? formatDateWithTime(latestRecord.admissionDate)
                        : "N/A"
                    }</td>
                    <th>Discharge Date</th>
                    <td>${
                      latestRecord.dischargeDate
                        ? formatDateWithTime(latestRecord.dischargeDate)
                        : "N/A"
                    }</td>
                </tr>
            </table>

            <!-- Recorded Vital Signs -->
            <table class="vitals-table">
                <thead>
                    <tr>
                        <th colspan="6" style="background-color: #2c5aa0; color: white; font-size: 14px; padding: 10px;">
                            RECORDED VITAL SIGNS
                        </th>
                    </tr>
                    <tr>
                        <th>Record #</th>
                        <th>Temperature</th>
                        <th>Pulse</th>
                        <th>Blood Pressure</th>
                        <th>Blood Sugar</th>
                        <th>Recorded Date/Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      latestRecord.vitals && latestRecord.vitals.length > 0
                        ? latestRecord.vitals
                            .map(
                              (vital, index) =>
                                `<tr>
                                <td>${index + 1}</td>
                                <td>${vital.temperature || "-"}</td>
                                <td>${vital.pulse || "-"}</td>
                                <td>${vital.bloodPressure || "-"}</td>
                                <td>${vital.bloodSugarLevel || "-"}</td>
                                <td>${
                                  vital.recordedAt
                                    ? formatDateWithTime(vital.recordedAt)
                                    : "N/A"
                                }</td>
                            </tr>
                            ${
                              vital.other
                                ? `<tr><td colspan="6" style="background-color: #f8f9fa; font-style: italic;">Other: ${vital.other}</td></tr>`
                                : ""
                            }`
                            )
                            .join("")
                        : '<tr><td colspan="6" class="no-data">No vital signs recorded</td></tr>'
                    }
                </tbody>
            </table>

            <!-- Follow-up Vital Signs -->
            ${
              latestRecord.followUps && latestRecord.followUps.length > 0
                ? `
            <table class="vitals-table">
                <thead>
                    <tr>
                        <th colspan="8" style="background-color: #2c5aa0; color: white; font-size: 14px; padding: 10px;">
                            FOLLOW-UP VITAL SIGNS
                        </th>
                    </tr>
                    <tr>
                        <th>Follow-up #</th>
                        <th>Date</th>
                        <th>Temperature</th>
                        <th>Pulse</th>
                        <th>BP</th>
                        <th>Oxygen Sat.</th>
                        <th>Blood Sugar</th>
                        <th>Observations</th>
                    </tr>
                </thead>
                <tbody>
                    ${latestRecord.followUps
                      .map(
                        (followUp, index) =>
                          `<tr>
                            <td>${index + 1}</td>
                            <td>${followUp.date || "N/A"}</td>
                            <td>${followUp.temperature || "-"}</td>
                            <td>${followUp.pulse || "-"}</td>
                            <td>${followUp.bloodPressure || "-"}</td>
                            <td>${followUp.oxygenSaturation || "-"}</td>
                            <td>${followUp.bloodSugarLevel || "-"}</td>
                            <td>${followUp.observations || "-"}</td>
                        </tr>`
                      )
                      .join("")}
                </tbody>
            </table>
            `
                : ""
            }

            <div class="footer">
                <p>Report generated on ${formatDate(
                  new Date()
                )} | This is a computer-generated document</p>
                <p><strong>Confidential Medical Record - For Healthcare Professionals Only</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const generateDiagnosisHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalAddress =
    "Shete mala,Near Ganesh Temple Narayanwadi Road Narayangaon Tal Junnar Dist Pune Pin 410504";
  const hospitalPhone = "Phone No.9923537180";

  const formatDateWithTime = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Parse diagnosis entry to extract diagnosis and date
  const parseDiagnosisEntry = (entry) => {
    const dateParts = entry.split(" Date: ");
    if (dateParts.length >= 2) {
      const diagnosis = dateParts[0];
      const dateTime = dateParts[1];
      return { diagnosis, dateTime };
    }
    return { diagnosis: entry, dateTime: "N/A" };
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Diagnosis Report - ${patientHistory.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                min-height: 297mm;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                page-break-after: avoid;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 5px;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
                color: #2c5aa0;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 11px;
                border: 2px solid #000;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 8px;
                border: 1px solid #000;
                width: 25%;
            }
            
            .diagnosis-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
            }
            
            .diagnosis-table th {
                background-color: #2c5aa0;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 14px;
            }
            
            .diagnosis-table td {
                padding: 12px;
                border: 1px solid #000;
                vertical-align: top;
                font-size: 12px;
            }

            .diagnosis-records-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
                font-size: 11px;
            }

            .diagnosis-records-table th {
                background-color: #dc3545;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 12px;
            }

            .diagnosis-records-table td {
                padding: 8px;
                border: 1px solid #000;
                text-align: left;
                font-size: 11px;
                vertical-align: top;
            }

            .diagnosis-text {
                font-weight: bold;
                color: #2c5aa0;
                line-height: 1.3;
            }

            .diagnosis-date {
                color: #666;
                font-size: 10px;
            }
            
            .diagnosis-entry {
                margin-bottom: 8px;
                padding: 8px;
                background-color: #f9f9f9;
                border-left: 4px solid #dc3545;
                border-radius: 3px;
            }
            
            .initial-diagnosis {
                border-left-color: #ffc107;
                background-color: #fff3cd;
            }
            
            .no-data {
                text-align: center;
                font-style: italic;
                color: #666;
                padding: 20px;
            }
            
            .footer {
                position: fixed;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                text-align: center;
                font-size: 10px;
                border-top: 1px solid #000;
                padding-top: 5px;
            }
            
            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                
                @page {
                    margin: 15mm 10mm;
                    size: A4;
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
                <div class="hospital-info">${hospitalPhone}</div>
                <div class="hospital-info">Date: ${formatDate(new Date())}</div>
                <div class="report-title">DIAGNOSIS REPORT</div>
            </div>

            <!-- Patient Information -->
            <table class="patient-info-table">
                <tr>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                </tr>
                <tr>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age} Years / ${
    patientHistory.gender
  }</td>
                    <th>Contact</th>
                    <td>${patientHistory.contact || "N/A"}</td>
                </tr>
                <tr>
                    <th>Address</th>
                    <td colspan="3">${patientHistory.address || "N/A"}</td>
                </tr>
                <tr>
                    <th>OPD Number</th>
                    <td>${latestRecord.opdNumber || "N/A"}</td>
                    <th>IPD Number</th>
                    <td>${latestRecord.ipdNumber || "N/A"}</td>
                </tr>
                <tr>
                    <th>Admission Date</th>
                    <td>${
                      latestRecord.admissionDate
                        ? formatDateWithTime(latestRecord.admissionDate)
                        : "N/A"
                    }</td>
                    <th>Discharge Date</th>
                    <td>${
                      latestRecord.dischargeDate
                        ? formatDateWithTime(latestRecord.dischargeDate)
                        : "N/A"
                    }</td>
                </tr>
                <tr>
                    <th>Attending Doctor</th>
                    <td colspan="3">${latestRecord.doctor?.name || "N/A"}</td>
                </tr>
            </table>

            <!-- Initial Diagnosis -->
            <table class="diagnosis-table">
                <thead>
                    <tr>
                        <th>INITIAL DIAGNOSIS AT ADMISSION</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.initialDiagnosis
                                ? `<div class="diagnosis-entry initial-diagnosis">${latestRecord.initialDiagnosis}</div>`
                                : '<div class="no-data">No initial diagnosis recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Doctor's Diagnosis in Table Format -->
            <table class="diagnosis-records-table">
                <thead>
                    <tr>
                        <th colspan="3">DOCTOR'S DIAGNOSIS</th>
                    </tr>
                    <tr>
                        <th style="width: 10%;">Sr. No.</th>
                        <th style="width: 65%;">Diagnosis</th>
                        <th style="width: 25%;">Date & Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      latestRecord.diagnosisByDoctor &&
                      latestRecord.diagnosisByDoctor.length > 0
                        ? latestRecord.diagnosisByDoctor
                            .map((entry, index) => {
                              const { diagnosis, dateTime } =
                                parseDiagnosisEntry(entry);
                              return `
                                    <tr>
                                        <td style="text-align: center;">${
                                          index + 1
                                        }</td>
                                        <td class="diagnosis-text">${diagnosis}</td>
                                        <td class="diagnosis-date">${dateTime}</td>
                                    </tr>
                                `;
                            })
                            .join("")
                        : `
                            <tr>
                                <td colspan="3" class="no-data">No additional diagnosis recorded by doctor</td>
                            </tr>
                        `
                    }
                </tbody>
            </table>

            <!-- Medical History -->
            <table class="diagnosis-table">
                <thead>
                    <tr>
                        <th>MEDICAL HISTORY</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.doctorConsulting &&
                              latestRecord.doctorConsulting.length > 0
                                ? latestRecord.doctorConsulting
                                    .map((consultation) => {
                                      let content = "";
                                      if (
                                        consultation.historyOfPresentIllness
                                      ) {
                                        content += `<div class="diagnosis-entry"><strong>History of Present Illness:</strong><br>${consultation.historyOfPresentIllness}</div>`;
                                      }
                                      if (consultation.pastMedicalHistory) {
                                        content += `<div class="diagnosis-entry"><strong>Past Medical History:</strong><br>${consultation.pastMedicalHistory}</div>`;
                                      }
                                      if (consultation.familyHistory) {
                                        content += `<div class="diagnosis-entry"><strong>Family History:</strong><br>${consultation.familyHistory}</div>`;
                                      }
                                      return content;
                                    })
                                    .join("") ||
                                  '<div class="no-data">No medical history recorded</div>'
                                : '<div class="no-data">No medical history recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Condition at Discharge -->
            <table class="diagnosis-table">
                <thead>
                    <tr>
                        <th>CONDITION AT DISCHARGE</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.conditionAtDischarge
                                ? `<div class="diagnosis-entry"><strong>Status:</strong> ${latestRecord.conditionAtDischarge}</div>`
                                : '<div class="no-data">Discharge condition not recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                <p>Report generated on ${formatDate(
                  new Date()
                )} | This is a computer-generated document</p>
                <p><strong>Confidential Medical Record - For Healthcare Professionals Only</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const generatePrescriptionsHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalAddress =
    "Shete mala,Near Ganesh Temple Narayanwadi Road Narayangaon Tal Junnar Dist Pune Pin 410504";
  const hospitalPhone = "Phone No.9923537180";

  const formatDateWithTime = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prescriptions Report - ${patientHistory.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                min-height: 297mm;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                page-break-after: avoid;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 5px;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
                color: #2c5aa0;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 11px;
                border: 2px solid #000;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 8px;
                border: 1px solid #000;
                width: 25%;
            }
            
            .prescription-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
            }
            
            .prescription-table th {
                background-color: #2c5aa0;
                color: white;
                padding: 8px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 11px;
            }
            
            .prescription-table td {
                padding: 8px;
                border: 1px solid #000;
                text-align: center;
                font-size: 11px;
            }
            
            .medicine-name {
                text-align: left;
                font-weight: bold;
                color: #2c5aa0;
            }
            
            .comment-row {
                background-color: #fff3cd;
                font-style: italic;
            }
            
            .no-data {
                text-align: center;
                font-style: italic;
                color: #666;
                padding: 20px;
            }
            
            .footer {
                position: fixed;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                text-align: center;
                font-size: 10px;
                border-top: 1px solid #000;
                padding-top: 5px;
            }
            
            .section-header {
                background-color: #2c5aa0;
                color: white;
                font-size: 14px;
                padding: 10px;
                text-align: center;
                font-weight: bold;
            }
            
            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                
                @page {
                    margin: 15mm 10mm;
                    size: A4;
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
                <div class="hospital-info">${hospitalPhone}</div>
                <div class="hospital-info">Date: ${formatDate(new Date())}</div>
                <div class="report-title">PRESCRIPTIONS REPORT</div>
            </div>

            <!-- Patient Information -->
            <table class="patient-info-table">
                <tr>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                </tr>
                <tr>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age} Years / ${
    patientHistory.gender
  }</td>
                    <th>Contact</th>
                    <td>${patientHistory.contact || "N/A"}</td>
                </tr>
                <tr>
                    <th>Weight</th>
                    <td>${
                      latestRecord.weight ? `${latestRecord.weight} kg` : "N/A"
                    }</td>
                    <th>Attending Doctor</th>
                    <td>${latestRecord.doctor?.name || "N/A"}</td>
                </tr>
                <tr>
                    <th>OPD Number</th>
                    <td>${latestRecord.opdNumber || "N/A"}</td>
                    <th>IPD Number</th>
                    <td>${latestRecord.ipdNumber || "N/A"}</td>
                </tr>
                <tr>
                    <th>Admission Date</th>
                    <td>${
                      latestRecord.admissionDate
                        ? formatDateWithTime(latestRecord.admissionDate)
                        : "N/A"
                    }</td>
                    <th>Discharge Date</th>
                    <td>${
                      latestRecord.dischargeDate
                        ? formatDateWithTime(latestRecord.dischargeDate)
                        : "N/A"
                    }</td>
                </tr>
            </table>

            <!-- Doctor Prescriptions -->
            <table class="prescription-table">
                <thead>
                    <tr>
                        <th colspan="6" class="section-header">DOCTOR PRESCRIPTIONS</th>
                    </tr>
                    <tr>
                        <th style="width: 25%;">Medicine Name</th>
                        <th style="width: 15%;">Morning</th>
                        <th style="width: 15%;">Afternoon</th>
                        <th style="width: 15%;">Night</th>
                        <th style="width: 15%;">Prescribed Date</th>
                        <th style="width: 15%;">Instructions</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      latestRecord.doctorPrescriptions &&
                      latestRecord.doctorPrescriptions.length > 0
                        ? latestRecord.doctorPrescriptions
                            .map(
                              (prescription, index) =>
                                `<tr>
                                <td class="medicine-name">${
                                  prescription.medicine?.name ||
                                  "Medicine name not specified"
                                }</td>
                                <td>${
                                  prescription.medicine?.morning || "-"
                                }</td>
                                <td>${
                                  prescription.medicine?.afternoon || "-"
                                }</td>
                                <td>${prescription.medicine?.night || "-"}</td>
                                <td>${
                                  prescription.medicine?.date
                                    ? formatDate(prescription.medicine.date)
                                    : "N/A"
                                }</td>
                                <td>${
                                  prescription.medicine?.comment || "-"
                                }</td>
                            </tr>`
                            )
                            .join("")
                        : '<tr><td colspan="6" class="no-data">No prescriptions recorded</td></tr>'
                    }
                </tbody>
            </table>

            <!-- Additional Medications -->
            ${
              latestRecord.medications && latestRecord.medications.length > 0
                ? `
            <table class="prescription-table">
                <thead>
                    <tr>
                        <th colspan="5" class="section-header">ADDITIONAL MEDICATIONS</th>
                    </tr>
                    <tr>
                        <th style="width: 30%;">Medication Name</th>
                        <th style="width: 20%;">Dosage</th>
                        <th style="width: 15%;">Type</th>
                        <th style="width: 20%;">Date</th>
                        <th style="width: 15%;">Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${latestRecord.medications
                      .map(
                        (medication, index) =>
                          `<tr>
                            <td class="medicine-name">${medication.name}</td>
                            <td>${medication.dosage || "-"}</td>
                            <td>${medication.type || "-"}</td>
                            <td>${medication.date || "-"}</td>
                            <td>${medication.time || "-"}</td>
                        </tr>`
                      )
                      .join("")}
                </tbody>
            </table>
            `
                : ""
            }

            <!-- IV Fluids -->
            ${
              latestRecord.ivFluids && latestRecord.ivFluids.length > 0
                ? `
            <table class="prescription-table">
                <thead>
                    <tr>
                        <th colspan="5" class="section-header">IV FLUIDS</th>
                    </tr>
                    <tr>
                        <th style="width: 30%;">Fluid Name</th>
                        <th style="width: 20%;">Quantity</th>
                        <th style="width: 20%;">Duration</th>
                        <th style="width: 15%;">Date</th>
                        <th style="width: 15%;">Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${latestRecord.ivFluids
                      .map(
                        (ivFluid, index) =>
                          `<tr>
                            <td class="medicine-name">${ivFluid.name}</td>
                            <td>${ivFluid.quantity || "-"}</td>
                            <td>${ivFluid.duration || "-"}</td>
                            <td>${ivFluid.date || "-"}</td>
                            <td>${ivFluid.time || "-"}</td>
                        </tr>`
                      )
                      .join("")}
                </tbody>
            </table>
            `
                : ""
            }

            <div class="footer">
                <p>Report generated on ${formatDate(
                  new Date()
                )} | This is a computer-generated document</p>
                <p><strong>⚠️ This prescription is for reference only. Please consult your healthcare provider for any modifications.</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const generateConsultingHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalAddress =
    "Shete mala,Near Ganesh Temple Narayanwadi Road Narayangaon Tal Junnar Dist Pune Pin 410504";
  const hospitalPhone = "Phone No.9923537180";

  const formatDateWithTime = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consulting Report - ${patientHistory.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                min-height: 297mm;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                page-break-after: avoid;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 5px;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
                color: #2c5aa0;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 11px;
                border: 2px solid #000;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 8px;
                border: 1px solid #000;
                width: 25%;
            }
            
            .consultation-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
            }
            
            .consultation-table th {
                background-color: #2c5aa0;
                color: white;
                padding: 10px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 12px;
            }
            
            .consultation-table td {
                padding: 12px;
                border: 1px solid #000;
                vertical-align: top;
                font-size: 11px;
            }
            
            .field-label {
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 5px;
            }
            
            .field-content {
                margin-bottom: 10px;
                padding: 5px;
                background-color: #f9f9f9;
                border-left: 3px solid #17a2b8;
            }
            
            .no-data {
                text-align: center;
                font-style: italic;
                color: #666;
                padding: 20px;
            }
            
            .footer {
                position: fixed;
                bottom: 5mm;
                left: 15mm;
                right: 15mm;
                text-align: center;
                font-size: 10px;
                border-top: 1px solid #000;
                padding-top: 5px;
            }
            
            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                
                @page {
                    margin: 15mm 10mm;
                    size: A4;
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
                <div class="hospital-info">${hospitalPhone}</div>
                <div class="hospital-info">Date: ${formatDate(new Date())}</div>
                <div class="report-title">CONSULTING REPORT</div>
            </div>

            <!-- Patient Information -->
            <table class="patient-info-table">
                <tr>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                </tr>
                <tr>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age} Years / ${
    patientHistory.gender
  }</td>
                    <th>Contact</th>
                    <td>${patientHistory.contact || "N/A"}</td>
                </tr>
                <tr>
                    <th>Date of Birth</th>
                    <td>${patientHistory.dob || "N/A"}</td>
                    <th>Attending Doctor</th>
                    <td>${latestRecord.doctor?.name || "N/A"}</td>
                </tr>
                <tr>
                    <th>OPD Number</th>
                    <td>${latestRecord.opdNumber || "N/A"}</td>
                    <th>IPD Number</th>
                    <td>${latestRecord.ipdNumber || "N/A"}</td>
                </tr>
                <tr>
                    <th>Admission Date</th>
                    <td>${
                      latestRecord.admissionDate
                        ? formatDateWithTime(latestRecord.admissionDate)
                        : "N/A"
                    }</td>
                    <th>Discharge Date</th>
                    <td>${
                      latestRecord.dischargeDate
                        ? formatDateWithTime(latestRecord.dischargeDate)
                        : "N/A"
                    }</td>
                </tr>
            </table>

            <!-- Doctor Consultation Records -->
            ${
              latestRecord.doctorConsulting &&
              latestRecord.doctorConsulting.length > 0
                ? latestRecord.doctorConsulting
                    .map(
                      (consultation, index) =>
                        `<table class="consultation-table">
                        <thead>
                            <tr>
                                <th colspan="2">CONSULTATION RECORD #${
                                  index + 1
                                } - ${
                          consultation.date || "Date not recorded"
                        }</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              consultation.cheifComplaint
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Chief Complaint</td>
                                <td>${consultation.cheifComplaint}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.historyOfPresentIllness
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">History of Present Illness</td>
                                <td>${consultation.historyOfPresentIllness}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.pastMedicalHistory
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Past Medical History</td>
                                <td>${consultation.pastMedicalHistory}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.familyHistory
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Family History</td>
                                <td>${consultation.familyHistory}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.personalHabits
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Personal Habits</td>
                                <td>${consultation.personalHabits}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.menstrualHistory
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Menstrual History</td>
                                <td>${consultation.menstrualHistory}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.immunizationHistory
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Immunization History</td>
                                <td>${consultation.immunizationHistory}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.allergies
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Allergies</td>
                                <td>${consultation.allergies}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.describeAllergies
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Allergy Description</td>
                                <td>${consultation.describeAllergies}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.relevantPreviousInvestigations
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Previous Investigations</td>
                                <td>${consultation.relevantPreviousInvestigations}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.wongBaker
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Wong Baker Pain Scale</td>
                                <td>${consultation.wongBaker}</td>
                            </tr>`
                                : ""
                            }
                            
                            ${
                              consultation.visualAnalogue
                                ? `
                            <tr>
                                <td style="width: 25%; font-weight: bold; background-color: #f0f0f0;">Visual Analogue Scale</td>
                                <td>${consultation.visualAnalogue}</td>
                            </tr>`
                                : ""
                            }
                        </tbody>
                    </table>`
                    )
                    .join("")
                : `<table class="consultation-table">
                    <thead>
                        <tr>
                            <th>CONSULTATION RECORDS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="no-data">No consultation records found</td>
                        </tr>
                    </tbody>
                </table>`
            }

            <div class="footer">
                <p>Report generated on ${formatDate(
                  new Date()
                )} | This is a computer-generated document</p>
                <p><strong>Confidential Medical Record - For Healthcare Professionals Only</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const generateDoctorNotesHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalAddress =
    "Shete mala,Near Ganesh Temple Narayanwadi Road Narayangaon Tal Junnar Dist Pune Pin 410504";
  const hospitalPhone = "Phone No.9923537180";

  const formatDateWithTime = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Doctor Notes Report - ${patientHistory.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                min-height: 297mm;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                page-break-after: avoid;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 5px;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
                color: #2c5aa0;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 11px;
                border: 2px solid #000;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 8px;
                border: 1px solid #000;
                width: 25%;
            }
            
            .notes-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
            }
            
            .notes-table th {
                background-color: #2c5aa0;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 14px;
            }
            
            .notes-table td {
                padding: 12px;
                border: 1px solid #000;
                vertical-align: top;
                font-size: 11px;
            }
            
            .note-entry {
                margin-bottom: 15px;
                padding: 10px;
                background-color: #f9f9f9;
                border-left: 4px solid #6f42c1;
                border-radius: 3px;
            }
            
            .note-header {
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 5px;
                display: flex;
                justify-content: space-between;
            }
            
            .note-datetime {
                font-size: 10px;
                color: #666;
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 8px;
            }
            
            .procedure-entry {
                background-color: #e8f5e8;
                border-left-color: #28a745;
            }
            
            .instruction-entry {
                background-color: #fff3cd;
                border-left-color: #ffc107;
            }
            
            .no-data {
                text-align: center;
                font-style: italic;
                color: #666;
                padding: 20px;
            }
            
            .footer {
                position: fixed;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                text-align: center;
                font-size: 10px;
                border-top: 1px solid #000;
                padding-top: 5px;
            }
            
            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                
                @page {
                    margin: 15mm 10mm;
                    size: A4;
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
                <div class="hospital-info">${hospitalPhone}</div>
                <div class="hospital-info">Date: ${formatDate(new Date())}</div>
                <div class="report-title">DOCTOR NOTES REPORT</div>
            </div>

            <!-- Patient Information -->
            <table class="patient-info-table">
                <tr>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                </tr>
                <tr>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age} Years / ${
    patientHistory.gender
  }</td>
                    <th>Contact</th>
                    <td>${patientHistory.contact || "N/A"}</td>
                </tr>
                <tr>
                    <th>Section</th>
                    <td>${latestRecord.section?.name || "N/A"}</td>
                    <th>Attending Doctor</th>
                    <td>${latestRecord.doctor?.name || "N/A"}</td>
                </tr>
                <tr>
                    <th>OPD Number</th>
                    <td>${latestRecord.opdNumber || "N/A"}</td>
                    <th>IPD Number</th>
                    <td>${latestRecord.ipdNumber || "N/A"}</td>
                </tr>
                <tr>
                    <th>Admission Date</th>
                    <td>${
                      latestRecord.admissionDate
                        ? formatDateWithTime(latestRecord.admissionDate)
                        : "N/A"
                    }</td>
                    <th>Discharge Date</th>
                    <td>${
                      latestRecord.dischargeDate
                        ? formatDateWithTime(latestRecord.dischargeDate)
                        : "N/A"
                    }</td>
                </tr>
            </table>

            <!-- Doctor's Clinical Notes -->
            <table class="notes-table">
                <thead>
                    <tr>
                        <th>DOCTOR'S CLINICAL NOTES</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.doctorNotes &&
                              latestRecord.doctorNotes.length > 0
                                ? latestRecord.doctorNotes
                                    .map(
                                      (note, index) =>
                                        `<div class="note-entry">
                                        <div class="note-header">
                                            <span>Dr. ${
                                              note.doctorName || "Doctor"
                                            }</span>
                                            <span class="note-datetime">${
                                              note.date || "Date not recorded"
                                            } ${
                                          note.time ? `at ${note.time}` : ""
                                        }</span>
                                        </div>
                                        <div>${
                                          note.text || "No note content"
                                        }</div>
                                    </div>`
                                    )
                                    .join("")
                                : '<div class="no-data">No doctor notes recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Admission Notes -->
            <table class="notes-table">
                <thead>
                    <tr>
                        <th>ADMISSION NOTES</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.admitNotes
                                ? `<div class="note-entry">${latestRecord.admitNotes}</div>`
                                : '<div class="no-data">No admission notes recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Procedures -->
            <table class="notes-table">
                <thead>
                    <tr>
                        <th>PROCEDURES PERFORMED</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.procedures &&
                              latestRecord.procedures.length > 0
                                ? latestRecord.procedures
                                    .map(
                                      (procedure, index) =>
                                        `<div class="note-entry procedure-entry">
                                        <div class="note-header">
                                            <span><strong>${
                                              procedure.name
                                            }</strong></span>
                                            <span class="note-datetime">${
                                              procedure.date ||
                                              "Date not specified"
                                            } ${
                                          procedure.time
                                            ? `at ${procedure.time}`
                                            : ""
                                        }</span>
                                        </div>
                                        ${
                                          procedure.frequency
                                            ? `<div><strong>Frequency:</strong> ${procedure.frequency}</div>`
                                            : ""
                                        }
                                    </div>`
                                    )
                                    .join("")
                                : '<div class="no-data">No procedures recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Special Instructions -->
            <table class="notes-table">
                <thead>
                    <tr>
                        <th>SPECIAL INSTRUCTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${
                              latestRecord.specialInstructions &&
                              latestRecord.specialInstructions.length > 0
                                ? latestRecord.specialInstructions
                                    .map(
                                      (instruction, index) =>
                                        `<div class="note-entry instruction-entry">
                                        <div class="note-header">
                                            <span>Special Instruction #${
                                              index + 1
                                            }</span>
                                            <span class="note-datetime">${
                                              instruction.date ||
                                              "Date not specified"
                                            } ${
                                          instruction.time
                                            ? `at ${instruction.time}`
                                            : ""
                                        }</span>
                                        </div>
                                        <div>${instruction.instruction}</div>
                                    </div>`
                                    )
                                    .join("")
                                : '<div class="no-data">No special instructions recorded</div>'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                <p>Report generated on ${formatDate(
                  new Date()
                )} | This is a computer-generated document</p>
                <p><strong>Confidential Medical Record - For Healthcare Professionals Only</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};
