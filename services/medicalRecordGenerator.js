// Professional PDF Templates - Hospital Style with Discharge Date

import { HOSPITAL_CONFIG } from "../utils/constants.js";

export const generateSymptomsHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const hospitalBanner = `${HOSPITAL_CONFIG.bannerUrl}`;
  const hospitalName = `${HOSPITAL_CONFIG.name}`;
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
  const hospitalBanner = `${HOSPITAL_CONFIG.bannerUrl}`;
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
  const hospitalBanner = `${HOSPITAL_CONFIG.bannerUrl}`;
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
  const hospitalBanner = `${HOSPITAL_CONFIG.bannerUrl}`;
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
  const hospitalBanner = `${HOSPITAL_CONFIG.bannerUrl}`;
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
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                line-height: 1.4;
                color: #000;
                background: white;
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
                font-size: 10px;
                margin-bottom: 3px;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                color: #2c5aa0;
                text-transform: uppercase;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 10px;
                border: 2px solid #000;
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 6px 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 6px 8px;
                border: 1px solid #000;
                width: 25%;
                vertical-align: top;
            }
            
            .consultation-container {
                margin-bottom: 20px;
                page-break-inside: avoid;
                border: 2px solid #000;
                break-inside: avoid;
            }
            
            .consultation-container:first-of-type {
                page-break-before: avoid;
            }
            
            .consultation-header {
                background-color: #2c5aa0;
                color: white;
                font-weight: bold;
                padding: 8px 10px;
                text-align: center;
                font-size: 12px;
                text-transform: uppercase;
                page-break-after: avoid;
            }
            
            .section-grid {
                display: table;
                width: 100%;
                table-layout: fixed;
                page-break-inside: avoid;
            }
            
            .section-row {
                display: table-row;
                page-break-inside: avoid;
            }
            
            .section-column {
                display: table-cell;
                width: 50%;
                border-right: 1px solid #000;
                vertical-align: top;
                page-break-inside: avoid;
            }
            
            .section-column:last-child {
                border-right: none;
            }
            
            .section-header {
                background-color: #e9ecef;
                font-weight: bold;
                padding: 6px 8px;
                text-align: center;
                font-size: 10px;
                border-bottom: 1px solid #000;
                text-transform: uppercase;
                page-break-after: avoid;
            }
            
            .field-table {
                width: 100%;
                border-collapse: collapse;
                page-break-inside: auto;
            }
            
            .field-row {
                border-bottom: 1px solid #ddd;
                page-break-inside: avoid;
            }
            
            .field-row:last-child {
                border-bottom: none;
            }
            
            .field-label {
                font-weight: bold;
                color: #000;
                background-color: #f8f9fa;
                padding: 6px 8px;
                border-right: 1px solid #ddd;
                width: 40%;
                vertical-align: top;
                font-size: 10px;
            }
            
            .field-content {
                padding: 6px 8px;
                background-color: #fff;
                vertical-align: top;
                font-size: 10px;
                line-height: 1.4;
                word-wrap: break-word;
                width: 60%;
            }
            
            .full-width-section {
                border-top: 1px solid #000;
                margin-top: 8px;
                page-break-inside: avoid;
            }
            
            .pain-assessment-table {
                width: 100%;
                border-collapse: collapse;
                page-break-inside: avoid;
            }
            
            .pain-assessment-table .field-label {
                width: 20%;
            }
            
            .pain-assessment-table .field-content {
                width: 30%;
            }
            
            .no-data {
                text-align: center;
                font-style: italic;
                color: #666;
                padding: 20px;
                background: #f8f9fa;
            }
            
            .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 9px;
                border-top: 1px solid #000;
                padding-top: 10px;
                page-break-inside: avoid;
            }
            
            /* Prevent orphans and widows */
            .consultation-container {
                orphans: 3;
                widows: 3;
            }
            
            /* Ensure content flows properly */
            .content-section {
                page-break-before: avoid;
            }
            
            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                
                @page {
                    margin: 12mm 8mm;
                    size: A4;
                }
                
                .patient-info-table {
                    page-break-after: avoid;
                    page-break-inside: avoid;
                }
                
                .consultation-container {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                .consultation-container:first-of-type {
                    page-break-before: avoid;
                }
                
                .section-grid {
                    page-break-inside: avoid;
                }
                
                .field-row {
                    page-break-inside: avoid;
                }
                
                .section-row {
                    page-break-inside: avoid;
                }
                
                /* Avoid breaking after headers */
                .consultation-header,
                .section-header {
                    page-break-after: avoid;
                }
                
                /* Keep related content together */
                .header {
                    page-break-after: avoid;
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
            <div class="content-section">
                ${
                  latestRecord.doctorConsulting &&
                  latestRecord.doctorConsulting.length > 0
                    ? latestRecord.doctorConsulting
                        .map(
                          (consultation, index) =>
                            `
                            <div class="consultation-container">
                                <div class="consultation-header">
                                    CONSULTATION RECORD #${index + 1} - ${
                              consultation.date || "Date not recorded"
                            }
                                </div>
                                
                                <!-- Patient History & Vital Signs Section -->
                                <div class="section-grid">
                                    <div class="section-row">
                                        <div class="section-column">
                                            <div class="section-header">PATIENT HISTORY & SYMPTOMS</div>
                                            <table class="field-table">
                                                ${
                                                  consultation.cheifComplaint
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Chief Complaint</td>
                                                    <td class="field-content">${consultation.cheifComplaint}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.historyOfPresentIllness
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Present Illness History</td>
                                                    <td class="field-content">${consultation.historyOfPresentIllness}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.pastMedicalHistory
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Past Medical History</td>
                                                    <td class="field-content">${consultation.pastMedicalHistory}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.familyHistory
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Family History</td>
                                                    <td class="field-content">${consultation.familyHistory}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.personalHabits
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Personal Habits</td>
                                                    <td class="field-content">${consultation.personalHabits}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.menstrualHistory
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Menstrual History</td>
                                                    <td class="field-content">${consultation.menstrualHistory}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.immunizationHistory
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Immunization History</td>
                                                    <td class="field-content">${consultation.immunizationHistory}</td>
                                                </tr>`
                                                    : ""
                                                }
                                            </table>
                                        </div>
                                        
                                        <div class="section-column">
                                            <div class="section-header">VITAL SIGNS & EXAMINATION</div>
                                            <table class="field-table">
                                                ${
                                                  consultation.pulse
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Pulse Rate</td>
                                                    <td class="field-content">${consultation.pulse}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.bloodPressure
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Blood Pressure</td>
                                                    <td class="field-content">${consultation.bloodPressure}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.temperature
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Temperature</td>
                                                    <td class="field-content">${consultation.temperature}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.oxygenSaturation
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Oxygen Saturation</td>
                                                    <td class="field-content">${consultation.oxygenSaturation}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.respiratorySystem
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Respiratory System</td>
                                                    <td class="field-content">${consultation.respiratorySystem}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.cardiovascularSystem
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Cardiovascular System</td>
                                                    <td class="field-content">${consultation.cardiovascularSystem}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.gastrointestinalSystem
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Gastrointestinal System</td>
                                                    <td class="field-content">${consultation.gastrointestinalSystem}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.genitourinarySystem
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Genitourinary System</td>
                                                    <td class="field-content">${consultation.genitourinarySystem}</td>
                                                </tr>`
                                                    : ""
                                                }
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Neurological & Clinical Assessment Section -->
                                <div class="section-grid" style="border-top: 1px solid #000;">
                                    <div class="section-row">
                                        <div class="section-column">
                                            <div class="section-header">NEUROLOGICAL & MUSCULOSKELETAL</div>
                                            <table class="field-table">
                                                ${
                                                  consultation.neurologicalSystem
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Neurological System</td>
                                                    <td class="field-content">${consultation.neurologicalSystem}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.musculoskeletalSystem
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Musculoskeletal System</td>
                                                    <td class="field-content">${consultation.musculoskeletalSystem}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.endocrineSystem
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Endocrine System</td>
                                                    <td class="field-content">${consultation.endocrineSystem}</td>
                                                </tr>`
                                                    : ""
                                                }
                                            </table>
                                        </div>
                                        
                                        <div class="section-column">
                                            <div class="section-header">ALLERGIES & CLINICAL ASSESSMENT</div>
                                            <table class="field-table">
                                                ${
                                                  consultation.allergies
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Known Allergies</td>
                                                    <td class="field-content">${consultation.allergies}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.describeAllergies
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Allergy Description</td>
                                                    <td class="field-content">${consultation.describeAllergies}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.clinicalDiagnosis
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Clinical Diagnosis</td>
                                                    <td class="field-content">${consultation.clinicalDiagnosis}</td>
                                                </tr>`
                                                    : ""
                                                }
                                                
                                                ${
                                                  consultation.relevantPreviousInvestigations
                                                    ? `
                                                <tr class="field-row">
                                                    <td class="field-label">Previous Investigations</td>
                                                    <td class="field-content">${consultation.relevantPreviousInvestigations}</td>
                                                </tr>`
                                                    : ""
                                                }
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pain Assessment Section -->
                                ${
                                  consultation.wongBaker ||
                                  consultation.visualAnalogue
                                    ? `
                                <div class="full-width-section">
                                    <div class="section-header">PAIN ASSESSMENT</div>
                                    <table class="pain-assessment-table">
                                        <tr class="field-row">
                                            ${
                                              consultation.wongBaker
                                                ? `
                                            <td class="field-label">Wong Baker Pain Scale</td>
                                            <td class="field-content">${consultation.wongBaker}</td>`
                                                : ""
                                            }
                                            
                                            ${
                                              consultation.visualAnalogue
                                                ? `
                                            <td class="field-label">Visual Analogue Scale</td>
                                            <td class="field-content">${consultation.visualAnalogue}</td>`
                                                : ""
                                            }
                                        </tr>
                                    </table>
                                </div>
                                `
                                    : ""
                                }
                            </div>
                            `
                        )
                        .join("")
                    : `<div class="consultation-container">
                        <div class="consultation-header">CONSULTATION RECORDS</div>
                        <div class="no-data">
                            <strong>No consultation records found</strong><br>
                            <small>No consultation data has been recorded for this patient's admission.</small>
                        </div>
                    </div>`
                }
            </div>

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
  const hospitalBanner = `${HOSPITAL_CONFIG.bannerUrl}`;
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

const formatDateToIST = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString || "Not recorded";
  }
};

export const generate2HrFollowUpHTML = (patient, admission, bannerImageUrl) => {
  const patientInfo = generatePatientInfoTable(patient, admission);

  let content = "";

  // Add header and patient info only once
  content += `
    <div class="banner">
      <img src="${HOSPITAL_CONFIG.bannerUrl}" alt="Hospital Banner" />
    </div>
    <h1 class="main-title">2-Hour Follow-Up Report</h1>
    ${patientInfo}
  `;

  // Add each follow-up record
  admission.followUps.forEach((followUp, index) => {
    // Add page break only if not the first record
    const pageBreak = index > 0 ? "page-break-before: always;" : "";

    content += `
      <div class="follow-up-record" style="${pageBreak}">
      <div class="section-header">
        <h2>Follow-Up Record ${index + 1} - 2HR</h2>
        <span class="record-date">${
          followUp.date ? formatDateToIST(followUp.date) : "Not recorded"
        } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
      </div>

      <table class="data-table">
        <thead>
        <tr>
          <th colspan="4" class="section-title">Vital Signs</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><strong>Temperature:</strong></td>
          <td>${followUp.temperature || "N/A"}</td>
          <td><strong>Pulse:</strong></td>
          <td>${followUp.pulse || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Respiration Rate:</strong></td>
          <td>${followUp.respirationRate || "N/A"}</td>
          <td><strong>Blood Pressure:</strong></td>
          <td>${followUp.bloodPressure || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Oxygen Saturation:</strong></td>
          <td>${followUp.oxygenSaturation || "N/A"}</td>
          <td><strong>Blood Sugar Level:</strong></td>
          <td>${followUp.bloodSugarLevel || "N/A"}</td>
        </tr>
        ${
          followUp.otherVitals
            ? `
        <tr>
          <td><strong>Other Vitals:</strong></td>
          <td colspan="3">${followUp.otherVitals}</td>
        </tr>
        `
            : ""
        }
        </tbody>
      </table>

      <table class="data-table">
        <thead>
        <tr>
          <th colspan="4" class="section-title">Intake & Output Data</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><strong>IV Fluid:</strong></td>
          <td>${followUp.ivFluid || "N/A"}</td>
          <td><strong>Urine:</strong></td>
          <td>${followUp.urine || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Nasogastric:</strong></td>
          <td>${followUp.nasogastric || "N/A"}</td>
          <td><strong>Stool:</strong></td>
          <td>${followUp.stool || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>RT Feed/Oral:</strong></td>
          <td>${followUp.rtFeedOral || "N/A"}</td>
          <td><strong>RT Aspirate:</strong></td>
          <td>${followUp.rtAspirate || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Total Intake:</strong></td>
          <td class="highlight">${followUp.totalIntake || "N/A"}</td>
          <td><strong>Other Output:</strong></td>
          <td>${followUp.otherOutput || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>CVP:</strong></td>
          <td colspan="3">${followUp.cvp || "N/A"}</td>
        </tr>
        </tbody>
      </table>

      <table class="data-table">
        <thead>
        <tr>
          <th colspan="4" class="section-title">Ventilator Data</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><strong>Mode:</strong></td>
          <td>${followUp.ventyMode || "N/A"}</td>
          <td><strong>Set Rate:</strong></td>
          <td>${followUp.setRate || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>FiO2:</strong></td>
          <td>${followUp.fiO2 || "N/A"}</td>
          <td><strong>PIP:</strong></td>
          <td>${followUp.pip || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>PEEP/CPAP:</strong></td>
          <td>${followUp.peepCpap || "N/A"}</td>
          <td><strong>I:E Ratio:</strong></td>
          <td>${followUp.ieRatio || "N/A"}</td>
        </tr>
        ${
          followUp.otherVentilator
            ? `
        <tr>
          <td><strong>Other:</strong></td>
          <td colspan="3">${followUp.otherVentilator}</td>
        </tr>
        `
            : ""
        }
        </tbody>
      </table>

      ${
        followUp.notes || followUp.observations
          ? `
      <table class="data-table">
        <thead>
        <tr>
          <th colspan="2" class="section-title">Clinical Notes & Observations</th>
        </tr>
        </thead>
        <tbody>
        ${
          followUp.notes
            ? `
        <tr>
          <td width="20%"><strong>Notes:</strong></td>
          <td>${followUp.notes}</td>
        </tr>
        `
            : ""
        }
        ${
          followUp.observations
            ? `
        <tr>
          <td width="20%"><strong>Observations:</strong></td>
          <td>${followUp.observations}</td>
        </tr>
        `
            : ""
        }
        </tbody>
      </table>
      `
          : ""
      }
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>2-Hour Follow-Up Report</title>
      <style>
        ${getCompactStyles()}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
};

export const generate4HrFollowUpHTML = (patient, admission, bannerImageUrl) => {
  const patientInfo = generatePatientInfoTable(patient, admission);

  let content = "";

  // Add header and patient info only once
  content += `
    <div class="banner">
      <img src="${HOSPITAL_CONFIG.bannerUrl}" alt="Hospital Banner" />
    </div>
    <h1 class="main-title">4-Hour Follow-Up Report</h1>
    ${patientInfo}
  `;

  // Add each follow-up record
  admission.fourHrFollowUpSchema.forEach((followUp, index) => {
    const pageBreak = index > 0 ? "page-break-before: always;" : "";

    content += `
      <div class="follow-up-record" style="${pageBreak}">
        <div class="section-header">
          <h2>4-Hour Follow-Up Record ${index + 1}</h2>
          <span class="record-date">${
            formatDateToIST(followUp.date) || "Not recorded"
          } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th colspan="4" class="section-title">4-Hour Vital Signs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Pulse:</strong></td>
              <td>${followUp.fourhrpulse || "N/A"}</td>
              <td><strong>Blood Pressure:</strong></td>
              <td>${followUp.fourhrbloodPressure || "N/A"}</td>
            </tr>
            <tr>
              <td><strong>Temperature:</strong></td>
              <td>${followUp.fourhrTemperature || "N/A"}</td>
              <td><strong>Oxygen Saturation:</strong></td>
              <td>${followUp.fourhroxygenSaturation || "N/A"}</td>
            </tr>
            <tr>
              <td><strong>Blood Sugar Level:</strong></td>
              <td>${followUp.fourhrbloodSugarLevel || "N/A"}</td>
              <td><strong>Other Vitals:</strong></td>
              <td>${followUp.fourhrotherVitals || "N/A"}</td>
            </tr>
          </tbody>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th colspan="4" class="section-title">Fluid Management</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>IV Fluid (Input):</strong></td>
              <td>${followUp.fourhrivFluid || "N/A"}</td>
              <td><strong>Urine (Output):</strong></td>
              <td>${followUp.fourhrurine || "N/A"}</td>
            </tr>
          </tbody>
        </table>

        ${
          followUp.notes || followUp.observations
            ? `
        <table class="data-table">
          <thead>
            <tr>
              <th colspan="2" class="section-title">Clinical Notes & Observations</th>
            </tr>
          </thead>
          <tbody>
            ${
              followUp.notes
                ? `
            <tr>
              <td width="20%"><strong>Notes:</strong></td>
              <td>${followUp.notes}</td>
            </tr>
            `
                : ""
            }
            ${
              followUp.observations
                ? `
            <tr>
              <td width="20%"><strong>Observations:</strong></td>
              <td>${followUp.observations}</td>
            </tr>
            `
                : ""
            }
          </tbody>
        </table>
        `
            : ""
        }
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>4-Hour Follow-Up Report</title>
      <style>
        ${getCompactStyles()}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
};

export const generateCombinedFollowUpHTML = (
  patient,
  admission,
  bannerImageUrl
) => {
  const patientInfo = generatePatientInfoTable(patient, admission);

  let content = `
    <div class="banner">
      <img src="${HOSPITAL_CONFIG.bannerUrl}" alt="Hospital Banner" />
    </div>
    <h1 class="main-title">Complete Follow-Up Report</h1>
    ${patientInfo}
  `;

  let recordCount = 0;

  // Add 2-hour follow-ups
  if (admission.followUps && admission.followUps.length > 0) {
    admission.followUps.forEach((followUp, index) => {
      const pageBreak = recordCount > 0 ? "page-break-before: always;" : "";
      recordCount++;

      content += `
        <div class="follow-up-record" style="${pageBreak}">
          <div class="section-header">
            <h2>2-Hour Follow-Up Record ${index + 1}</h2>
            <span class="record-date">${
              formatDateToIST(followUp.date) || "Not recorded"
            } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">Vital Signs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Temperature:</strong></td>
                <td>${followUp.temperature || "N/A"}</td>
                <td><strong>Pulse:</strong></td>
                <td>${followUp.pulse || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Respiration Rate:</strong></td>
                <td>${followUp.respirationRate || "N/A"}</td>
                <td><strong>Blood Pressure:</strong></td>
                <td>${followUp.bloodPressure || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Oxygen Saturation:</strong></td>
                <td>${followUp.oxygenSaturation || "N/A"}</td>
                <td><strong>Blood Sugar Level:</strong></td>
                <td>${followUp.bloodSugarLevel || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">Intake & Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>IV Fluid:</strong></td>
                <td>${followUp.ivFluid || "N/A"}</td>
                <td><strong>Urine:</strong></td>
                <td>${followUp.urine || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Nasogastric:</strong></td>
                <td>${followUp.nasogastric || "N/A"}</td>
                <td><strong>Stool:</strong></td>
                <td>${followUp.stool || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Total Intake:</strong></td>
                <td class="highlight">${followUp.totalIntake || "N/A"}</td>
                <td><strong>RT Aspirate:</strong></td>
                <td>${followUp.rtAspirate || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          ${
            followUp.notes || followUp.observations
              ? `
          <table class="data-table">
            <thead>
              <tr>
                <th colspan="2" class="section-title">Notes & Observations</th>
              </tr>
            </thead>
            <tbody>
              ${
                followUp.notes
                  ? `<tr><td width="20%"><strong>Notes:</strong></td><td>${followUp.notes}</td></tr>`
                  : ""
              }
              ${
                followUp.observations
                  ? `<tr><td width="20%"><strong>Observations:</strong></td><td>${followUp.observations}</td></tr>`
                  : ""
              }
            </tbody>
          </table>
          `
              : ""
          }
        </div>
      `;
    });
  }

  // Add 4-hour follow-ups
  if (
    admission.fourHrFollowUpSchema &&
    admission.fourHrFollowUpSchema.length > 0
  ) {
    admission.fourHrFollowUpSchema.forEach((followUp, index) => {
      const pageBreak = recordCount > 0 ? "page-break-before: always;" : "";
      recordCount++;

      content += `
        <div class="follow-up-record" style="${pageBreak}">
          <div class="section-header">
            <h2>4-Hour Follow-Up Record ${index + 1}</h2>
            <span class="record-date">${
              followUp.date || "Not recorded"
            } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">4-Hour Vital Signs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Pulse:</strong></td>
                <td>${followUp.fourhrpulse || "N/A"}</td>
                <td><strong>Blood Pressure:</strong></td>
                <td>${followUp.fourhrbloodPressure || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Temperature:</strong></td>
                <td>${followUp.fourhrTemperature || "N/A"}</td>
                <td><strong>Oxygen Saturation:</strong></td>
                <td>${followUp.fourhroxygenSaturation || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">Fluid Management</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>IV Fluid:</strong></td>
                <td>${followUp.fourhrivFluid || "N/A"}</td>
                <td><strong>Urine Output:</strong></td>
                <td>${followUp.fourhrurine || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          ${
            followUp.notes || followUp.observations
              ? `
          <table class="data-table">
            <thead>
              <tr>
                <th colspan="2" class="section-title">Notes & Observations</th>
              </tr>
            </thead>
            <tbody>
              ${
                followUp.notes
                  ? `<tr><td width="20%"><strong>Notes:</strong></td><td>${followUp.notes}</td></tr>`
                  : ""
              }
              ${
                followUp.observations
                  ? `<tr><td width="20%"><strong>Observations:</strong></td><td>${followUp.observations}</td></tr>`
                  : ""
              }
            </tbody>
          </table>
          `
              : ""
          }
        </div>
      `;
    });
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Complete Follow-Up Report</title>
      <style>
        ${getCompactStyles()}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
};

// Compact patient information table
function generatePatientInfoTable(patient, admission) {
  return `
    <table class="patient-table">
      <thead>
        <tr>
          <th colspan="6" class="patient-header">Patient Information - ${
            patient.patientId
          }</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Name:</strong></td>
          <td>${patient.name}</td>
          <td><strong>Age:</strong></td>
          <td>${patient.age}</td>
          <td><strong>Gender:</strong></td>
          <td>${patient.gender}</td>
        </tr>
        <tr>
          <td><strong>Contact:</strong></td>
          <td>${patient.contact}</td>
          <td><strong>DOB:</strong></td>
          <td>${patient.dob || "N/A"}</td>
          <td><strong>Address:</strong></td>
          <td>${patient.address || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>OPD No:</strong></td>
          <td>${admission.opdNumber || "N/A"}</td>
          <td><strong>IPD No:</strong></td>
          <td>${admission.ipdNumber || "N/A"}</td>
          <td><strong>Status:</strong></td>
          <td>${admission.status}</td>
        </tr>
        <tr>
          <td><strong>Admission:</strong></td>
          <td>${new Date(admission.admissionDate).toLocaleDateString(
            "en-IN"
          )}</td>
          <td><strong>Section:</strong></td>
          <td>${admission.section?.name || "N/A"}</td>
          <td><strong>Bed:</strong></td>
          <td>${admission.bedNumber || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Doctor:</strong></td>
          <td colspan="5">${admission.doctor?.name || "Not assigned"}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// Updated CSS with fixed page handling
function getCompactStyles() {
  return `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 15px;
      line-height: 1.4;
      color: #333;
      font-size: 12px;
    }
    
    .banner {
      text-align: center;
      margin-bottom: 15px;
    }
    
    .banner img {
      max-width: 100%;
      height: auto;
      max-height: 80px;
    }
    
    .main-title {
      text-align: center;
      color: #2c5aa0;
      margin-bottom: 15px;
      font-size: 20px;
      font-weight: bold;
    }
    
    .patient-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .patient-header {
      background-color: #060607ff;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 14px;
      font-weight: bold;
    }
    
    .patient-table td, .patient-table th {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    
    .follow-up-record {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f8f9fa;
      padding: 10px 15px;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    
    .section-header h2 {
      margin: 0;
      font-size: 16px;
      color: #2c5aa0;
    }
    
    .record-date {
      font-size: 11px;
      color: black;
      font-style: italic;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .data-table th, .data-table td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    
    .section-title {
      background-color: #e9ecef;
      font-weight: bold;
      text-align: center;
      color: #495057;
      font-size: 13px;
    }
    
    .data-table td:nth-child(odd) {
      width: 20%;
      background-color: #f8f9fa;
    }
    
    .data-table td:nth-child(even) {
      width: 30%;
    }
    
    .highlight {
      background-color: #fff3cd !important;
      font-weight: bold;
      color: #856404;
    }
    
    @media print {
      body {
        font-size: 11px;
      }
      
      .follow-up-record {
        page-break-inside: avoid;
      }
      
      .data-table {
        page-break-inside: avoid;
      }
      
      .patient-table {
        page-break-inside: avoid;
      }
      
      .section-header {
        page-break-inside: avoid;
        page-break-after: avoid;
      }
    }
    
    @page {
      margin: 0.5in;
      size: A4;
    }
  `;
}
export const generateVitalsGraphHTML = (
  patientHistory,
  latestRecord,
  hospital
) => {
  const hospitalBanner = `${HOSPITAL_CONFIG.bannerUrl}`;
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

  // Process vitals data for charting
  const processVitalsData = () => {
    const vitals = latestRecord.vitals || [];
    const processedData = vitals.map((vital, index) => ({
      index: index + 1,
      date: vital.recordedAt
        ? new Date(vital.recordedAt).toLocaleDateString("en-IN")
        : `Record ${index + 1}`,
      time: vital.recordedAt
        ? new Date(vital.recordedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      temperature: parseFloat(vital.temperature) || null,
      pulse: parseFloat(vital.pulse) || null,
      systolic: vital.bloodPressure
        ? parseFloat(vital.bloodPressure.split("/")[0]) || null
        : null,
      diastolic: vital.bloodPressure
        ? parseFloat(vital.bloodPressure.split("/")[1]) || null
        : null,
      bloodSugar: parseFloat(vital.bloodSugarLevel) || null,
      rawData: vital,
    }));
    return processedData;
  };

  const vitalsData = processVitalsData();

  // Generate chart data for Chart.js
  const generateChartData = () => {
    const labels = vitalsData.map((v) => `${v.date}\n${v.time}`);

    return {
      labels,
      temperature: vitalsData.map((v) => v.temperature),
      pulse: vitalsData.map((v) => v.pulse),
      systolic: vitalsData.map((v) => v.systolic),
      diastolic: vitalsData.map((v) => v.diastolic),
      bloodSugar: vitalsData.map((v) => v.bloodSugar),
    };
  };

  const chartData = generateChartData();

  // Calculate statistics
  const calculateStats = (data) => {
    const validData = data.filter((v) => v !== null && !isNaN(v));
    if (validData.length === 0) return { min: "N/A", max: "N/A", avg: "N/A" };

    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const avg = (
      validData.reduce((sum, val) => sum + val, 0) / validData.length
    ).toFixed(1);

    return { min, max, avg };
  };

  const stats = {
    temperature: calculateStats(chartData.temperature),
    pulse: calculateStats(chartData.pulse),
    systolic: calculateStats(chartData.systolic),
    diastolic: calculateStats(chartData.diastolic),
    bloodSugar: calculateStats(chartData.bloodSugar),
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vital Signs Graph Report - ${patientHistory.name}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: white;
            }
            
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15mm;
                min-height: 297mm;
            }
            
            .header {
                text-align: center;
                margin-bottom: 20px;
                page-break-after: avoid;
                border-bottom: 3px solid #2c5aa0;
                padding-bottom: 15px;
            }
            
            .hospital-banner {
                width: 100%;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 10px;
            }
            
            .hospital-info {
                font-size: 11px;
                margin-bottom: 5px;
                color: #666;
            }
            
            .report-title {
                font-weight: bold;
                font-size: 22px;
                margin-bottom: 15px;
                color: #2c5aa0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                font-size: 11px;
                border: 2px solid #2c5aa0;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .patient-info-table th {
                background: linear-gradient(135deg, #2c5aa0, #1e4080);
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #1e4080;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 10px 8px;
                border: 1px solid #ddd;
                width: 25%;
                background: #f8f9fa;
            }
            
            .patient-info-table tr:nth-child(even) td {
                background: #ffffff;
            }
            
            .stats-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                border: 2px solid #dee2e6;
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .stat-card h3 {
                color: #2c5aa0;
                font-size: 14px;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .stat-values {
                display: flex;
                justify-content: space-around;
                font-size: 11px;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-label {
                color: #666;
                font-weight: bold;
                margin-bottom: 2px;
            }
            
            .stat-value {
                color: #2c5aa0;
                font-size: 14px;
                font-weight: bold;
            }
            
            .charts-section {
                margin-bottom: 30px;
            }
            
            .chart-container {
                margin-bottom: 40px;
                page-break-inside: avoid;
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .chart-title {
                font-size: 16px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 15px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
                border-bottom: 2px solid #2c5aa0;
                padding-bottom: 8px;
            }
            
            .chart-canvas {
                width: 100% !important;
                height: 300px !important;
                margin: 15px 0;

            }
            
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 30px;
                border: 2px solid #2c5aa0;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .data-table th {
                background: linear-gradient(135deg, #2c5aa0, #1e4080);
                color: white;
                padding: 12px 8px;
                text-align: center;
                font-weight: bold;
                font-size: 11px;
                border: 1px solid #1e4080;
            }
            
            .data-table td {
                padding: 10px 8px;
                border: 1px solid #ddd;
                text-align: center;
                font-size: 10px;
            }
            
            .data-table tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            
            .data-table tr:hover {
                background-color: #e3f2fd;
            }
            
            .normal-range {
                color: #28a745;
                font-weight: bold;
            }
            
            .warning-range {
                color: #ffc107;
                font-weight: bold;
            }
            
            .danger-range {
                color: #dc3545;
                font-weight: bold;
            }
            
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 2px solid #e9ecef;
                padding-top: 15px;
            }
            
            .reference-ranges {
                background: #f8f9fa;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }
            
            .reference-ranges h4 {
                color: #2c5aa0;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .ranges-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
                font-size: 10px;
            }
            
            .range-item {
                background: white;
                padding: 8px;
                border-radius: 4px;
                border-left: 4px solid #2c5aa0;
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
                
                .chart-container {
                    page-break-inside: avoid;
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
                <div class="hospital-info">Generated: ${formatDate(
                  new Date()
                )}</div>
                <div class="report-title">📊 Vital Signs Graph Report</div>
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

            <!-- Statistics Summary -->
            <div class="stats-container">
                <div class="stat-card">
                    <h3>🌡️ Temperature (°F)</h3>
                    <div class="stat-values">
                        <div class="stat-item">
                            <div class="stat-label">MIN</div>
                            <div class="stat-value">${
                              stats.temperature.min
                            }</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">AVG</div>
                            <div class="stat-value">${
                              stats.temperature.avg
                            }</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">MAX</div>
                            <div class="stat-value">${
                              stats.temperature.max
                            }</div>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>💓 Pulse (BPM)</h3>
                    <div class="stat-values">
                        <div class="stat-item">
                            <div class="stat-label">MIN</div>
                            <div class="stat-value">${stats.pulse.min}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">AVG</div>
                            <div class="stat-value">${stats.pulse.avg}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">MAX</div>
                            <div class="stat-value">${stats.pulse.max}</div>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>🩸 Blood Pressure</h3>
                    <div class="stat-values">
                        <div class="stat-item">
                            <div class="stat-label">SYS</div>
                            <div class="stat-value">${stats.systolic.avg}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">DIA</div>
                            <div class="stat-value">${stats.diastolic.avg}</div>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>🍯 Blood Sugar</h3>
                    <div class="stat-values">
                        <div class="stat-item">
                            <div class="stat-label">MIN</div>
                            <div class="stat-value">${
                              stats.bloodSugar.min
                            }</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">AVG</div>
                            <div class="stat-value">${
                              stats.bloodSugar.avg
                            }</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">MAX</div>
                            <div class="stat-value">${
                              stats.bloodSugar.max
                            }</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Reference Ranges -->
            <div class="reference-ranges">
                <h4>📋 Normal Reference Ranges</h4>
                <div class="ranges-grid">
                    <div class="range-item">
                        <strong>Temperature:</strong> 97.0°F - 99.0°F
                    </div>
                    <div class="range-item">
                        <strong>Pulse:</strong> 60 - 100 BPM
                    </div>
                    <div class="range-item">
                        <strong>Blood Pressure:</strong> <120/80 mmHg
                    </div>
                    <div class="range-item">
                        <strong>Blood Sugar:</strong> 70 - 140 mg/dL
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="charts-section">
                <!-- Temperature Chart -->
                <div class="chart-container">
                    <div class="chart-title">🌡️ Temperature Trend</div>
                    <canvas id="temperatureChart" class="chart-canvas"></canvas>
                </div>

                <!-- Pulse Chart -->
                <div class="chart-container">
                    <div class="chart-title">💓 Pulse Rate Trend</div>
                    <canvas id="pulseChart" class="chart-canvas"></canvas>
                </div>

                <!-- Blood Pressure Chart -->
                <div class="chart-container">
                    <div class="chart-title">🩸 Blood Pressure Trend</div>
                    <canvas id="bpChart" class="chart-canvas"></canvas>
                </div>

                <!-- Blood Sugar Chart -->
                <div class="chart-container">
                    <div class="chart-title">🍯 Blood Sugar Trend</div>
                    <canvas id="bloodSugarChart" class="chart-canvas"></canvas>
                </div>
            </div>

            <!-- Raw Data Table -->
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Record #</th>
                        <th>Date & Time</th>
                        <th>Temperature (°F)</th>
                        <th>Pulse (BPM)</th>
                        <th>Blood Pressure</th>
                        <th>Blood Sugar</th>
                        <th>Other</th>
                    </tr>
                </thead>
                <tbody>
                    ${vitalsData
                      .map(
                        (vital) => `
                        <tr>
                            <td>${vital.index}</td>
                            <td>${vital.date}<br><small>${
                          vital.time
                        }</small></td>
                            <td class="${
                              vital.temperature &&
                              (vital.temperature < 97 || vital.temperature > 99)
                                ? "warning-range"
                                : "normal-range"
                            }">${vital.temperature || "N/A"}</td>
                            <td class="${
                              vital.pulse &&
                              (vital.pulse < 60 || vital.pulse > 100)
                                ? "warning-range"
                                : "normal-range"
                            }">${vital.pulse || "N/A"}</td>
                            <td class="${
                              vital.systolic && vital.systolic > 120
                                ? "warning-range"
                                : "normal-range"
                            }">${vital.rawData.bloodPressure || "N/A"}</td>
                            <td class="${
                              vital.bloodSugar &&
                              (vital.bloodSugar < 70 || vital.bloodSugar > 140)
                                ? "warning-range"
                                : "normal-range"
                            }">${vital.bloodSugar || "N/A"}</td>
                            <td>${vital.rawData.other || "N/A"}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>

            <div class="footer">
                <p><strong>Report generated on ${formatDate(
                  new Date()
                )} | This is a computer-generated document</strong></p>
                <p>📊 Visual trends help in better understanding patient's health progression</p>
                <p><strong>Confidential Medical Record - For Healthcare Professionals Only</strong></p>
            </div>
        </div>

        <script>
            // Chart.js configuration and rendering
            const chartLabels = ${JSON.stringify(chartData.labels)};
            const temperatureData = ${JSON.stringify(chartData.temperature)};
            const pulseData = ${JSON.stringify(chartData.pulse)};
            const systolicData = ${JSON.stringify(chartData.systolic)};
            const diastolicData = ${JSON.stringify(chartData.diastolic)};
            const bloodSugarData = ${JSON.stringify(chartData.bloodSugar)};

            // Common chart options
            const commonOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: '#e0e0e0'
                        }
                    },
                    x: {
                        grid: {
                            color: '#e0e0e0'
                        }
                    }
                }
            };

            // Temperature Chart
            new Chart(document.getElementById('temperatureChart'), {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Temperature (°F)',
                        data: temperatureData,
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ff6b6b',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            min: 95,
                            max: 105,
                            title: {
                                display: true,
                                text: 'Temperature (°F)'
                            }
                        }
                    }
                }
            });

            // Pulse Chart
            new Chart(document.getElementById('pulseChart'), {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Pulse Rate (BPM)',
                        data: pulseData,
                        borderColor: '#4ecdc4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#4ecdc4',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            title: {
                                display: true,
                                text: 'Pulse Rate (BPM)'
                            }
                        }
                    }
                }
            });

            // Blood Pressure Chart
            new Chart(document.getElementById('bpChart'), {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Systolic',
                        data: systolicData,
                        borderColor: '#ff7675',
                        backgroundColor: 'rgba(255, 118, 117, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: '#ff7675',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }, {
                        label: 'Diastolic',
                        data: diastolicData,
                        borderColor: '#74b9ff',
                        backgroundColor: 'rgba(116, 185, 255, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: '#74b9ff',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            title: {
                                display: true,
                                text: 'Blood Pressure (mmHg)'
                            }
                        }
                    }
                }
            });

            // Blood Sugar Chart
            new Chart(document.getElementById('bloodSugarChart'), {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Blood Sugar (mg/dL)',
                        data: bloodSugarData,
                        borderColor: '#fdcb6e',
                        backgroundColor: 'rgba(253, 203, 110, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#fdcb6e',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            title: {
                                display: true,
                                text: 'Blood Sugar (mg/dL)'
                            }
                        }
                    }
                }
            });
        </script>
    </body>
    </html>
  `;
};
