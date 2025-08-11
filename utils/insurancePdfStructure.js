// utils/insurancePdfStructure.js
import moment from "moment";

/**
 * Generate Insurance Summary Report HTML
 */
export const generateInsuranceReport = (reportData) => {
  const {
    patient,
    insurance,
    admission,
    patientInsurance,
    reportType,
    generatedAt,
    generatedBy,
  } = reportData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return moment(date).format("DD/MM/YYYY");
  };

  const formatDateTime = (date) => {
    return moment(date).format("DD/MM/YYYY hh:mm A");
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      Active: "#28a745",
      Eligible: "#28a745",
      Approved: "#28a745",
      Filed: "#ffc107",
      In_Process: "#17a2b8",
      Pending: "#ffc107",
      Rejected: "#dc3545",
      Expired: "#6c757d",
      Not_Eligible: "#dc3545",
    };

    return `<span style="background-color: ${
      statusColors[status] || "#6c757d"
    }; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${status.replace(
      "_",
      " "
    )}</span>`;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insurance Report - ${patient.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .section-header {
            background-color: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e9ecef;
            font-weight: bold;
            color: #495057;
            font-size: 18px;
        }
        
        .section-content {
            padding: 20px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-weight: bold;
            color: #6c757d;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 14px;
            color: #343a40;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .table th,
        .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        
        .table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #495057;
        }
        
        .table tr:hover {
            background-color: #f8f9fa;
        }
        
        .coverage-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .coverage-item {
            text-align: center;
            padding: 15px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            background-color: #f8f9fa;
        }
        
        .coverage-status {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .coverage-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .stat-card {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            opacity: 0.9;
        }
        
        .footer {
            background-color: #343a40;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 12px;
        }
        
        .document-list {
            list-style: none;
        }
        
        .document-item {
            padding: 10px;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            margin-bottom: 10px;
            background-color: #f8f9fa;
        }
        
        .document-type {
            font-weight: bold;
            color: #495057;
        }
        
        .document-date {
            font-size: 12px;
            color: #6c757d;
        }
        
        @media print {
            body {
                background-color: white;
            }
            
            .container {
                box-shadow: none;
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Insurance Report</h1>
            <p>Patient: ${patient.name} | Generated: ${formatDateTime(
    generatedAt
  )}</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Patient Information -->
            <div class="section">
                <div class="section-header">Patient Information</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Patient ID</div>
                            <div class="info-value">${patient.patientId}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Name</div>
                            <div class="info-value">${patient.name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Age</div>
                            <div class="info-value">${patient.age} years</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Gender</div>
                            <div class="info-value">${patient.gender}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Contact</div>
                            <div class="info-value">${patient.contact}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Admission Date</div>
                            <div class="info-value">${formatDate(
                              admission.admissionDate
                            )}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Insurance Policy Details -->
            <div class="section">
                <div class="section-header">Insurance Policy Details</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Insurance Provider</div>
                            <div class="info-value">${
                              insurance.insuranceProvider
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Policy Number</div>
                            <div class="info-value">${
                              insurance.policyNumber
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Policyholder</div>
                            <div class="info-value">${
                              insurance.policyholderName
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Relation to Patient</div>
                            <div class="info-value">${
                              insurance.relationToPatient
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Policy Type</div>
                            <div class="info-value">${
                              insurance.policyType
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Policy Status</div>
                            <div class="info-value">${getStatusBadge(
                              insurance.policyStatus
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Valid From</div>
                            <div class="info-value">${formatDate(
                              insurance.policyValidFrom
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Valid To</div>
                            <div class="info-value">${formatDate(
                              insurance.policyValidTo
                            )}</div>
                        </div>
                    </div>
                    
                    <!-- Financial Summary -->
                    <div class="summary-stats">
                        <div class="stat-card">
                            <div class="stat-value">${formatCurrency(
                              insurance.sumInsured
                            )}</div>
                            <div class="stat-label">Sum Insured</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${formatCurrency(
                              insurance.sumInsuredUtilized
                            )}</div>
                            <div class="stat-label">Utilized</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${formatCurrency(
                              insurance.sumInsuredRemaining
                            )}</div>
                            <div class="stat-label">Remaining</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${
                              insurance.coverageRemaining
                            }%</div>
                            <div class="stat-label">Coverage Left</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- TPA Information -->
            ${
              insurance.tpaName
                ? `
            <div class="section">
                <div class="section-header">TPA Information</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">TPA Name</div>
                            <div class="info-value">${insurance.tpaName}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Contact Number</div>
                            <div class="info-value">${
                              insurance.tpaContactNumber || "N/A"
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Email</div>
                            <div class="info-value">${
                              insurance.tpaEmail || "N/A"
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Representative</div>
                            <div class="info-value">${
                              insurance.tpaRepresentative || "N/A"
                            }</div>
                        </div>
                    </div>
                </div>
            </div>
            `
                : ""
            }
            
            <!-- Coverage Details -->
            <div class="section">
                <div class="section-header">Coverage Details</div>
                <div class="section-content">
                    <div class="coverage-grid">
                        <div class="coverage-item">
                            <div class="coverage-status">${
                              insurance.coverageDetails?.ipdCoverage
                                ? "✅"
                                : "❌"
                            }</div>
                            <div class="coverage-label">IPD Coverage</div>
                        </div>
                        <div class="coverage-item">
                            <div class="coverage-status">${
                              insurance.coverageDetails?.opdCoverage
                                ? "✅"
                                : "❌"
                            }</div>
                            <div class="coverage-label">OPD Coverage</div>
                        </div>
                        <div class="coverage-item">
                            <div class="coverage-status">${
                              insurance.coverageDetails?.emergencyCoverage
                                ? "✅"
                                : "❌"
                            }</div>
                            <div class="coverage-label">Emergency</div>
                        </div>
                        <div class="coverage-item">
                            <div class="coverage-status">${
                              insurance.coverageDetails?.maternityCoverage
                                ? "✅"
                                : "❌"
                            }</div>
                            <div class="coverage-label">Maternity</div>
                        </div>
                        <div class="coverage-item">
                            <div class="coverage-status">${
                              insurance.coverageDetails?.diagnosticsCoverage
                                ? "✅"
                                : "❌"
                            }</div>
                            <div class="coverage-label">Diagnostics</div>
                        </div>
                        <div class="coverage-item">
                            <div class="coverage-status">${
                              insurance.coverageDetails?.dentalCoverage
                                ? "✅"
                                : "❌"
                            }</div>
                            <div class="coverage-label">Dental</div>
                        </div>
                    </div>
                    
                    ${
                      insurance.coverageDetails?.roomRentLimit
                        ? `
                    <div class="info-grid" style="margin-top: 20px;">
                        <div class="info-item">
                            <div class="info-label">Room Rent Limit</div>
                            <div class="info-value">${formatCurrency(
                              insurance.coverageDetails.roomRentLimit
                            )} ${
                            insurance.coverageDetails.roomRentLimitType
                          }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">ICU Limit</div>
                            <div class="info-value">${
                              insurance.coverageDetails.icuLimit
                                ? formatCurrency(
                                    insurance.coverageDetails.icuLimit
                                  )
                                : "No Limit"
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Co-payment</div>
                            <div class="info-value">${
                              insurance.coverageDetails.coPaymentPercentage || 0
                            }%</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Deductible</div>
                            <div class="info-value">${formatCurrency(
                              insurance.coverageDetails.deductibleAmount
                            )}</div>
                        </div>
                    </div>
                    `
                        : ""
                    }
                </div>
            </div>
            
            <!-- Pre-Authorization Status -->
            ${
              insurance.preAuthorization?.preAuthRequired
                ? `
            <div class="section">
                <div class="section-header">Pre-Authorization Status</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Pre-Auth Number</div>
                            <div class="info-value">${
                              insurance.preAuthorization.preAuthNumber ||
                              "Not Generated"
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value">${getStatusBadge(
                              insurance.preAuthorization.preAuthStatus
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Applied Date</div>
                            <div class="info-value">${
                              insurance.preAuthorization.appliedDate
                                ? formatDate(
                                    insurance.preAuthorization.appliedDate
                                  )
                                : "N/A"
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Approved Amount</div>
                            <div class="info-value">${formatCurrency(
                              insurance.preAuthorization.approvedAmount
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Expiry Date</div>
                            <div class="info-value">${
                              insurance.preAuthorization.expiryDate
                                ? formatDate(
                                    insurance.preAuthorization.expiryDate
                                  )
                                : "N/A"
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Estimated Cost</div>
                            <div class="info-value">${formatCurrency(
                              insurance.preAuthorization.estimatedTreatmentCost
                            )}</div>
                        </div>
                    </div>
                </div>
            </div>
            `
                : ""
            }
            
            <!-- Claims History -->
            ${
              insurance.claims && insurance.claims.length > 0
                ? `
            <div class="section">
                <div class="section-header">Claims History</div>
                <div class="section-content">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Claim Number</th>
                                <th>Type</th>
                                <th>Amount Claimed</th>
                                <th>Amount Approved</th>
                                <th>Status</th>
                                <th>Filing Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${insurance.claims
                              .map(
                                (claim) => `
                            <tr>
                                <td>${claim.claimNumber}</td>
                                <td>${claim.claimType}</td>
                                <td>${formatCurrency(claim.amountClaimed)}</td>
                                <td>${formatCurrency(claim.amountApproved)}</td>
                                <td>${getStatusBadge(claim.claimStatus)}</td>
                                <td>${formatDate(claim.filingDate)}</td>
                            </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            `
                : ""
            }
            
            <!-- Documents -->
            ${
              insurance.documents && insurance.documents.length > 0
                ? `
            <div class="section">
                <div class="section-header">Uploaded Documents</div>
                <div class="section-content">
                    <ul class="document-list">
                        ${insurance.documents
                          .map(
                            (doc) => `
                        <li class="document-item">
                            <div class="document-type">${doc.documentType.replace(
                              "_",
                              " "
                            )}</div>
                            <div class="document-date">Uploaded: ${formatDateTime(
                              doc.uploadedAt
                            )}</div>
                            ${
                              doc.notes
                                ? `<div style="font-size: 12px; color: #6c757d; margin-top: 5px;">${doc.notes}</div>`
                                : ""
                            }
                        </li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
            </div>
            `
                : ""
            }
            
            <!-- Eligibility Summary -->
            <div class="section">
                <div class="section-header">Current Eligibility Status</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Eligibility Status</div>
                            <div class="info-value">${getStatusBadge(
                              patientInsurance.eligibilityStatus
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Authorized for Treatment</div>
                            <div class="info-value">${
                              patientInsurance.isAuthorizedForTreatment
                                ? "✅ Yes"
                                : "❌ No"
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Authorized Amount</div>
                            <div class="info-value">${formatCurrency(
                              patientInsurance.authorizedAmount
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Total Bill Amount</div>
                            <div class="info-value">${formatCurrency(
                              patientInsurance.totalBillAmount
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Insurance Covered</div>
                            <div class="info-value">${formatCurrency(
                              patientInsurance.insuranceCoveredAmount
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Patient Payable</div>
                            <div class="info-value">${formatCurrency(
                              patientInsurance.patientPayableAmount
                            )}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>This report was generated automatically on ${formatDateTime(
              generatedAt
            )}.</p>
            <p>For any queries, please contact the insurance department.</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Generate Claims Report HTML
 */
export const generateClaimReport = (claimData) => {
  const { claim, patient, insurance, reportType, generatedAt } = claimData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return moment(date).format("DD/MM/YYYY");
  };

  const formatDateTime = (date) => {
    return moment(date).format("DD/MM/YYYY hh:mm A");
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Report - ${claim.claimNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .section-header {
            background-color: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e9ecef;
            font-weight: bold;
            color: #495057;
            font-size: 18px;
        }
        
        .section-content {
            padding: 20px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-weight: bold;
            color: #6c757d;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 14px;
            color: #343a40;
        }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-filed { background-color: #ffc107; color: #212529; }
        .status-approved { background-color: #28a745; color: white; }
        .status-rejected { background-color: #dc3545; color: white; }
        .status-in-process { background-color: #17a2b8; color: white; }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .table th,
        .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        
        .table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        .footer {
            background-color: #343a40;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Insurance Claim Report</h1>
            <p>Claim Number: ${claim.claimNumber}</p>
        </div>
        
        <div class="content">
            <!-- Claim Summary -->
            <div class="section">
                <div class="section-header">Claim Summary</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Claim Number</div>
                            <div class="info-value">${claim.claimNumber}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Claim Type</div>
                            <div class="info-value">${claim.claimType}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value">
                                <span class="status-badge status-${claim.claimStatus
                                  .toLowerCase()
                                  .replace("_", "-")}">${
    claim.claimStatus
  }</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Filing Date</div>
                            <div class="info-value">${formatDate(
                              claim.filingDate
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Amount Claimed</div>
                            <div class="info-value">${formatCurrency(
                              claim.amountClaimed
                            )}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Amount Approved</div>
                            <div class="info-value">${formatCurrency(
                              claim.amountApproved
                            )}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Patient Information -->
            <div class="section">
                <div class="section-header">Patient Information</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Name</div>
                            <div class="info-value">${patient.name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Patient ID</div>
                            <div class="info-value">${patient.patientId}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Age</div>
                            <div class="info-value">${patient.age} years</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Gender</div>
                            <div class="info-value">${patient.gender}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Insurance Details -->
            <div class="section">
                <div class="section-header">Insurance Details</div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Insurance Provider</div>
                            <div class="info-value">${
                              insurance.insuranceProvider
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Policy Number</div>
                            <div class="info-value">${
                              insurance.policyNumber
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Policyholder</div>
                            <div class="info-value">${
                              insurance.policyholderName
                            }</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">TPA Name</div>
                            <div class="info-value">${
                              insurance.tpaName || "N/A"
                            }</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Linked Bills -->
            ${
              claim.linkedBills && claim.linkedBills.length > 0
                ? `
            <div class="section">
                <div class="section-header">Linked Bills</div>
                <div class="section-content">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Bill Number</th>
                                <th>Bill Date</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${claim.linkedBills
                              .map(
                                (bill) => `
                            <tr>
                                <td>${bill.billNumber}</td>
                                <td>${formatDate(bill.billDate)}</td>
                                <td>${formatCurrency(bill.billAmount)}</td>
                            </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            `
                : ""
            }
            
            <!-- Follow-up Notes -->
            ${
              claim.followUpNotes && claim.followUpNotes.length > 0
                ? `
            <div class="section">
                <div class="section-header">Follow-up Notes</div>
                <div class="section-content">
                    ${claim.followUpNotes
                      .map(
                        (note) => `
                    <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #007bff; background-color: #f8f9fa;">
                        <div style="font-size: 14px; margin-bottom: 5px;">${
                          note.note
                        }</div>
                        <div style="font-size: 12px; color: #6c757d;">
                            ${formatDateTime(note.createdAt)} - ${
                          note.createdBy?.name || "Unknown"
                        }
                        </div>
                    </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
            `
                : ""
            }
        </div>
        
        <div class="footer">
            <p>Generated on ${formatDateTime(generatedAt)}</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Generate Pre-Authorization Form HTML
 */
export const generatePreAuthForm = (preAuthData) => {
  const { patient, insurance, treatment, doctor } = preAuthData;

  const formatDate = (date) => {
    return moment(date).format("DD/MM/YYYY");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pre-Authorization Form</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 20px;
            color: #333;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .form-section {
            margin-bottom: 25px;
            border: 1px solid #ddd;
            padding: 15px;
        }
        
        .section-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
            background-color: #f5f5f5;
            padding: 8px;
            border-left: 4px solid #007bff;
        }
        
        .form-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .form-field {
            flex: 1;
            margin-right: 20px;
        }
        
        .form-field:last-child {
            margin-right: 0;
        }
        
        .field-label {
            font-weight: bold;
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        
        .field-value {
            border-bottom: 1px solid #333;
            min-height: 20px;
            padding-bottom: 2px;
            margin-top: 3px;
        }
        
        .checkbox-group {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
        }
        
        .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-box {
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 10px;
            width: 200px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PRE-AUTHORIZATION REQUEST FORM</h1>
        <p>Hospital Management System</p>
    </div>
    
    <div class="form-section">
        <div class="section-title">PATIENT INFORMATION</div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Patient Name</div>
                <div class="field-value">${patient.name}</div>
            </div>
            <div class="form-field">
                <div class="field-label">Patient ID</div>
                <div class="field-value">${patient.patientId}</div>
            </div>
            <div class="form-field">
                <div class="field-label">Age</div>
                <div class="field-value">${patient.age} years</div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Gender</div>
                <div class="field-value">${patient.gender}</div>
            </div>
            <div class="form-field">
                <div class="field-label">Contact Number</div>
                <div class="field-value">${patient.contact}</div>
            </div>
            <div class="form-field">
                <div class="field-label">Date of Admission</div>
                <div class="field-value">${formatDate(new Date())}</div>
            </div>
        </div>
    </div>
    
    <div class="form-section">
        <div class="section-title">INSURANCE DETAILS</div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Insurance Company</div>
                <div class="field-value">${insurance.insuranceProvider}</div>
            </div>
            <div class="form-field">
                <div class="field-label">Policy Number</div>
                <div class="field-value">${insurance.policyNumber}</div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">TPA Name</div>
                <div class="field-value">${
                  insurance.tpaName || "_________________"
                }</div>
            </div>
            <div class="form-field">
                <div class="field-label">Sum Insured</div>
                <div class="field-value">${formatCurrency(
                  insurance.sumInsured
                )}</div>
            </div>
        </div>
    </div>
    
    <div class="form-section">
        <div class="section-title">TREATMENT DETAILS</div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Provisional Diagnosis</div>
                <div class="field-value">${
                  treatment.diagnosis || "_________________________________"
                }</div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Proposed Treatment</div>
                <div class="field-value">${
                  treatment.proposedTreatment ||
                  "_________________________________"
                }</div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Estimated Treatment Cost</div>
                <div class="field-value">${formatCurrency(
                  treatment.estimatedCost
                )}</div>
            </div>
            <div class="form-field">
                <div class="field-label">Expected Length of Stay</div>
                <div class="field-value">${
                  treatment.expectedStay || "___"
                } days</div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Room Category</div>
                <div class="checkbox-group">
                    <div class="checkbox-item">☐ General Ward</div>
                    <div class="checkbox-item">☐ Semi-Private</div>
                    <div class="checkbox-item">☐ Private</div>
                    <div class="checkbox-item">☐ ICU</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="form-section">
        <div class="section-title">DOCTOR INFORMATION</div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Consulting Doctor</div>
                <div class="field-value">${
                  doctor.name || "_________________________"
                }</div>
            </div>
            <div class="form-field">
                <div class="field-label">Specialization</div>
                <div class="field-value">${
                  doctor.specialization || "_________________________"
                }</div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field">
                <div class="field-label">Registration Number</div>
                <div class="field-value">${
                  doctor.registrationNumber || "_________________________"
                }</div>
            </div>
            <div class="form-field">
                <div class="field-label">Contact Number</div>
                <div class="field-value">${
                  doctor.contact || "_________________________"
                }</div>
            </div>
        </div>
    </div>
    
    <div class="form-section">
        <div class="section-title">DOCUMENTS ATTACHED</div>
        <div class="checkbox-group">
            <div class="checkbox-item">☐ Medical Reports</div>
            <div class="checkbox-item">☐ Lab Reports</div>
            <div class="checkbox-item">☐ X-Ray/CT/MRI Reports</div>
            <div class="checkbox-item">☐ Previous Discharge Summary</div>
        </div>
    </div>
    
    <div class="signature-section">
        <div class="signature-box">
            <div class="field-label">Doctor's Signature</div>
            <br><br>
            <div>Date: ${formatDate(new Date())}</div>
        </div>
        <div class="signature-box">
            <div class="field-label">Patient/Relative Signature</div>
            <br><br>
            <div>Date: ${formatDate(new Date())}</div>
        </div>
        <div class="signature-box">
            <div class="field-label">Hospital Seal & Signature</div>
            <br><br>
            <div>Date: ${formatDate(new Date())}</div>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Generate Insurance Eligibility Certificate
 */
export const generateEligibilityCertificate = (eligibilityData) => {
  const { patient, insurance, eligibilityDetails } = eligibilityData;

  const formatDate = (date) => {
    return moment(date).format("DD/MM/YYYY");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insurance Eligibility Certificate</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            color: #333;
        }
        
        .certificate {
            border: 3px solid #007bff;
            padding: 30px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .certificate-title {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        
        .content {
            text-align: justify;
            line-height: 1.8;
        }
        
        .highlight {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #28a745;
            margin: 20px 0;
        }
        
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .details-table th,
        .details-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        .details-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1 class="certificate-title">INSURANCE ELIGIBILITY CERTIFICATE</h1>
            <p>Hospital Management System</p>
            <p>Certificate No: ${Date.now()}</p>
        </div>
        
        <div class="content">
            <p>This is to certify that <strong>${
              patient.name
            }</strong> (Patient ID: ${
    patient.patientId
  }) is eligible for insurance coverage under the following policy:</p>
            
            <table class="details-table">
                <tr>
                    <th>Insurance Provider</th>
                    <td>${insurance.insuranceProvider}</td>
                </tr>
                <tr>
                    <th>Policy Number</th>
                    <td>${insurance.policyNumber}</td>
                </tr>
                <tr>
                    <th>Policyholder Name</th>
                    <td>${insurance.policyholderName}</td>
                </tr>
                <tr>
                    <th>Sum Insured</th>
                    <td>${formatCurrency(insurance.sumInsured)}</td>
                </tr>
                <tr>
                    <th>Coverage Remaining</th>
                    <td>${formatCurrency(insurance.sumInsuredRemaining)}</td>
                </tr>
                <tr>
                    <th>Policy Valid From</th>
                    <td>${formatDate(insurance.policyValidFrom)}</td>
                </tr>
                <tr>
                    <th>Policy Valid To</th>
                    <td>${formatDate(insurance.policyValidTo)}</td>
                </tr>
            </table>
            
            <div class="highlight">
                <strong>Eligibility Status: ${
                  eligibilityDetails.status
                }</strong><br>
                The patient is eligible for ${
                  insurance.policyType
                } treatment under this policy.
                ${
                  eligibilityDetails.authorizedAmount
                    ? `Authorized amount: ${formatCurrency(
                        eligibilityDetails.authorizedAmount
                      )}`
                    : ""
                }
            </div>
            
            <p>This certificate is valid for the current admission and is subject to the terms and conditions of the insurance policy.</p>
            
            <p><strong>Note:</strong> This certificate is for hospital use only and does not guarantee claim approval.</p>
        </div>
        
        <div class="footer">
            <p>Generated on ${formatDate(
              new Date()
            )} | Valid for current admission only</p>
            <p>For verification, contact the insurance department</p>
        </div>
    </div>
</body>
</html>
  `;
};
