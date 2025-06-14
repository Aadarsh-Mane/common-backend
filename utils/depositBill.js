// utils/htmlTemplates.js

// Updated Deposit Receipt HTML Template
export const generateDepositReceiptHTML = (
  receipt,
  bannerImageUrl = "https://res.cloudinary.com/dnznafp2a/image/upload/v1747566698/Bhosale_prescription_iyyjpw.png"
) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Deposit Receipt - ${receipt.receiptId}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 10px; 
                color: #333; 
                font-size: 12px;
            }
            .receipt-container { 
                max-width: 700px; 
                margin: 0 auto; 
                border: 1px solid #ccc; 
                padding: 15px;
            }
            
            .header { 
                text-align: center; 
                border-bottom: 1px solid #ccc; 
                padding-bottom: 10px; 
                margin-bottom: 15px;
            }
            .banner-image {
                max-width: 100%;
                height: auto;
                margin-bottom: 10px;
            }
            .hospital-name { 
                font-size: 20px; 
                font-weight: bold; 
                margin: 3px 0;
            }
            .hospital-details { 
                font-size: 11px; 
                margin: 3px 0;
            }
            
            .receipt-title { 
                font-size: 16px; 
                font-weight: bold; 
                text-align: center; 
                margin: 10px 0; 
                padding: 6px;
                border: 1px solid #ccc;
            }
            
            .receipt-id { 
                text-align: center; 
                font-size: 13px; 
                margin-bottom: 15px; 
                padding: 6px; 
                border: 1px solid #ccc;
                font-weight: bold;
            }

            /* NEW: OPD/IPD number display */
            .patient-numbers {
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                padding: 8px;
                background-color: #f0f8ff;
                border: 1px solid #007acc;
                border-radius: 4px;
            }
            
            .number-box {
                text-align: center;
                flex: 1;
                padding: 5px;
            }
            
            .number-label {
                font-size: 10px;
                color: #666;
                margin-bottom: 2px;
            }
            
            .number-value {
                font-size: 14px;
                font-weight: bold;
                color: #007acc;
            }
            
            .section { 
                margin-bottom: 15px; 
            }
            
            .section-title { 
                font-weight: bold; 
                font-size: 14px; 
                border-bottom: 1px solid #ccc; 
                padding-bottom: 3px; 
                margin-bottom: 8px;
            }
            
            .info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
            }
            
            .info-table td {
                padding: 5px;
                border: 1px solid #ccc;
                font-size: 11px;
            }
            
            .info-label { 
                font-weight: bold; 
                width: 35%;
                background-color: #f5f5f5;
            }
            
            .amount-section { 
                text-align: center; 
                margin: 15px 0;
                padding: 10px;
                border: 2px solid #333;
            }
            
            .amount-label {
                font-size: 14px; 
                margin-bottom: 5px;
                font-weight: bold;
            }
            
            .amount { 
                font-size: 20px; 
                font-weight: bold; 
            }
            
            .signature-section { 
                margin-top: 20px; 
                display: table;
                width: 100%;
            }
            
            .signature-box { 
                display: table-cell;
                text-align: center; 
                width: 50%;
                padding: 10px;
                border: 1px solid #ccc;
            }
            
            .signature-line { 
                border-bottom: 1px solid #333; 
                margin-bottom: 3px; 
                height: 30px; 
            }
            
            .footer { 
                text-align: center; 
                margin-top: 15px; 
                padding-top: 10px; 
                border-top: 1px solid #ccc; 
                font-size: 10px;
            }
            
            .note-box {
                border: 1px solid #ccc;
                padding: 8px;
                margin: 8px 0;
                font-size: 10px;
            }
            
            @media print { 
                body { margin: 0; padding: 10px; }
                .receipt-container { border: none; }
            }
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header">
                ${
                  bannerImageUrl
                    ? `<img src="${bannerImageUrl}" alt="Hospital Banner" class="banner-image">`
                    : ""
                }
                <div class="hospital-details">
                    ${
                      receipt.hospitalDetails.registrationNumber
                        ? `Reg. No: ${receipt.hospitalDetails.registrationNumber}`
                        : ""
                    }
                </div>
            </div>

            <div class="receipt-title">DEPOSIT RECEIPT</div>
            
            <div class="receipt-id">
                Receipt ID: ${receipt.receiptId}
            </div>

            <!-- NEW: OPD/IPD Numbers Display -->
            <div class="patient-numbers">
                <div class="number-box">
                    <div class="number-label">OPD Number</div>
                    <div class="number-value">${
                      receipt.patientNumbers?.opdNumber || "N/A"
                    }</div>
                </div>
                ${
                  receipt.patientNumbers?.ipdNumber
                    ? `
                <div class="number-box">
                    <div class="number-label">IPD Number</div>
                    <div class="number-value">${receipt.patientNumbers.ipdNumber}</div>
                </div>
                `
                    : ""
                }
            </div>

            <div class="section">
                <div class="section-title">Patient Information</div>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Patient ID</td>
                        <td>${receipt.patientId}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Full Name</td>
                        <td>${receipt.patientDetails.name}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Age & Gender</td>
                        <td>${receipt.patientDetails.age} years / ${
    receipt.patientDetails.gender
  }</td>
                    </tr>
                    <tr>
                        <td class="info-label">Contact Number</td>
                        <td>${receipt.patientDetails.contact}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Patient Type</td>
                        <td>${
                          receipt.patientDetails.patientType || "Internal"
                        }</td>
                    </tr>
                    ${
                      receipt.patientDetails.address
                        ? `
                    <tr>
                        <td class="info-label">Address</td>
                        <td>${receipt.patientDetails.address}</td>
                    </tr>
                    `
                        : ""
                    }
                </table>
            </div>

            <div class="section">
                <div class="section-title">Admission Details</div>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Admission Date</td>
                        <td>${formatDate(
                          receipt.admissionDetails.admissionDate
                        )}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Attending Doctor</td>
                        <td>${receipt.admissionDetails.doctorName}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Department</td>
                        <td>${receipt.admissionDetails.sectionName}</td>
                    </tr>
                    ${
                      receipt.admissionDetails.bedNumber
                        ? `
                    <tr>
                        <td class="info-label">Bed Number</td>
                        <td>Bed #${receipt.admissionDetails.bedNumber}</td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      receipt.admissionDetails.reasonForAdmission
                        ? `
                    <tr>
                        <td class="info-label">Reason for Admission</td>
                        <td>${receipt.admissionDetails.reasonForAdmission}</td>
                    </tr>
                    `
                        : ""
                    }
                </table>
            </div>

            <div class="amount-section">
                <div class="amount-label">Deposit Amount Received</div>
                <div class="amount">${formatCurrency(
                  receipt.depositDetails.depositAmount
                )}</div>
            </div>

            <div class="section">
                <div class="section-title">Payment Details</div>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Payment Method</td>
                        <td>${receipt.depositDetails.paymentMethod}</td>
                    </tr>
                    ${
                      receipt.depositDetails.transactionId
                        ? `
                    <tr>
                        <td class="info-label">Transaction ID</td>
                        <td>${receipt.depositDetails.transactionId}</td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      receipt.depositDetails.chequeNumber
                        ? `
                    <tr>
                        <td class="info-label">Cheque Number</td>
                        <td>${receipt.depositDetails.chequeNumber}</td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      receipt.depositDetails.bankName
                        ? `
                    <tr>
                        <td class="info-label">Bank Name</td>
                        <td>${receipt.depositDetails.bankName}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr>
                        <td class="info-label">Receipt Generated</td>
                        <td>${formatDate(
                          receipt.receiptDetails.generatedAt
                        )}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Generated By</td>
                        <td>${receipt.receiptDetails.generatedBy.userName} (${
    receipt.receiptDetails.generatedBy.userType
  })</td>
                    </tr>
                    ${
                      receipt.depositDetails.remarks
                        ? `
                    <tr>
                        <td class="info-label">Remarks</td>
                        <td>${receipt.depositDetails.remarks}</td>
                    </tr>
                    `
                        : ""
                    }
                </table>
            </div>

            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div>Patient/Guardian Signature</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div>Authorized Signature</div>
                </div>
            </div>

            <div class="footer">
                <div class="note-box">
                    <strong>Important:</strong> This is a computer-generated deposit receipt. Please keep this receipt safe for future reference and present it during discharge for deposit adjustment.
                </div>
                <p>Receipt Generated: ${formatDate(new Date())}</p>
                <p>For queries, contact reception with Receipt ID: ${
                  receipt.receiptId
                }</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Updated IPD Bill HTML Template
export const generateDischargeBillHTML = (
  patientHistory,
  admissionHistory,
  processedCharges,
  billCalculations,
  lengthOfStay
) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1747566698/Bhosale_prescription_iyyjpw.png";
  const hospitalName = process.env.HOSPITAL_NAME || "BHOSALE HOSPITAL";
  const hospitalAddress =
    process.env.HOSPITAL_ADDRESS ||
    "Shubham Prestige 1st Floor, Near Post Office, Khodad Road, Narayangaon, Tal-Junnar, Dist-Pune";
  const hospitalPhone = process.env.HOSPITAL_PHONE || "Phone No.9923537180";

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    })
      .format(amount)
      .replace("₹", "");
  };

  const numberToWords = (num) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (num === 0) return "Zero";
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100)
      return (
        tens[Math.floor(num / 10)] +
        (num % 10 !== 0 ? " " + ones[num % 10] : "")
      );
    if (num < 1000)
      return (
        ones[Math.floor(num / 100)] +
        " Hundred" +
        (num % 100 !== 0 ? " " + numberToWords(num % 100) : "")
      );
    if (num < 100000)
      return (
        numberToWords(Math.floor(num / 1000)) +
        " Thousand" +
        (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "")
      );
    return "Amount too large";
  };

  // Generate charge rows - ONLY NON-ZERO CHARGES
  let chargeRows = "";
  let serialNumber = 1;

  const allCharges = [
    "admissionFees",
    "icuCharges",
    "specialCharges",
    "generalWardCharges",
    "surgeonCharges",
    "assistantSurgeonCharges",
    "operationTheatreCharges",
    "operationTheatreMedicines",
    "anaesthesiaCharges",
    "localAnaesthesiaCharges",
    "o2Charges",
    "monitorCharges",
    "tapping",
    "ventilatorCharges",
    "emergencyCharges",
    "micCharges",
    "ivFluids",
    "bloodTransfusionCharges",
    "physioTherapyCharges",
    "xrayFilmCharges",
    "ecgCharges",
    "specialVisitCharges",
    "doctorCharges",
    "nursingCharges",
    "injMedicines",
    "catheterCharges",
    "rylesTubeCharges",
    "miscellaneousCharges",
    "dressingCharges",
    "professionalCharges",
    "serviceTaxCharges",
    "tractionCharges",
    "gastricLavageCharges",
    "plateletCharges",
    "nebulizerCharges",
    "implantCharges",
    "physicianCharges",
    "slabCastCharges",
    "mrfCharges",
    "procCharges",
    "staplingCharges",
    "enemaCharges",
    "gastroscopyCharges",
    "endoscopicCharges",
    "velixCharges",
    "bslCharges",
    "icdtCharges",
    "ophthalmologistCharges",
  ];

  // Only show charges with amount > 0
  allCharges.forEach((chargeType) => {
    if (
      processedCharges[chargeType] &&
      processedCharges[chargeType].total > 0
    ) {
      const charge = processedCharges[chargeType];
      chargeRows += `
        <tr>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${serialNumber}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 11px;">${
            charge.description
          }</td>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${
            charge.rate
          }</td>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${
            charge.days
          }</td>
          <td style="text-align: right; padding: 4px; border: 1px solid #000; font-size: 11px;">${formatCurrency(
            charge.total
          )}</td>
        </tr>
      `;
      serialNumber++;
    }
  });

  // Add message if no charges found
  if (serialNumber === 1) {
    chargeRows = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 12px; border: 1px solid #000; font-size: 11px; font-style: italic;">
          No applicable charges for this admission
        </td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Discharge Bill - ${patientHistory.name}</title>
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
            }
            
            /* Header styles */
            .header {
                text-align: center;
                margin-bottom: 15px;
                page-break-after: avoid;
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
            
            .cash-memo {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
            }

            /* NEW: Patient numbers section */
            .patient-numbers {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-bottom: 15px;
                padding: 8px;
                background-color: #f0f8ff;
                border: 2px solid #007acc;
                border-radius: 4px;
            }
            
            .number-item {
                text-align: center;
                padding: 5px 15px;
            }
            
            .number-label {
                font-size: 10px;
                color: #666;
                margin-bottom: 2px;
            }
            
            .number-value {
                font-size: 14px;
                font-weight: bold;
                color: #007acc;
            }
            
            /* Patient info table */
            .patient-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 11px;
                page-break-after: avoid;
                border: 1px solid #000;
            }
            
            .patient-info-table th {
                background-color: #f0f0f0;
                padding: 6px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                width: 25%;
            }
            
            .patient-info-table td {
                padding: 6px;
                border: 1px solid #000;
                width: 25%;
            }
            
            /* Main charges table */
            .bill-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                page-break-inside: auto;
            }
            
            .bill-table thead {
                display: table-header-group;
                page-break-after: avoid;
            }
            
            .bill-table th {
                background-color: #f0f0f0;
                padding: 6px;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
                font-size: 11px;
            }
            
            .bill-table td {
                padding: 4px;
                border: 1px solid #000;
                font-size: 11px;
            }
            
            .bill-table tbody tr {
                page-break-inside: avoid;
            }
            
            /* Totals section - always at bottom */
            .totals-section {
                page-break-inside: avoid;
                margin-top: 0;
            }
            
            .total-row {
                font-weight: bold;
                background-color: #f8f8f8;
            }
            
            .amount-words {
                margin-top: 15px;
                font-weight: bold;
                font-size: 11px;
                page-break-inside: avoid;
            }
            
            /* Page break controls */
            .page-break-before {
                page-break-before: always;
                padding-top: 20mm;
            }
            
            .avoid-break {
                page-break-inside: avoid;
            }
            
            /* Print specific styles */
            @media print {
                .container { 
                    padding: 10mm; 
                    max-width: none;
                }
                body { 
                    font-size: 11px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .header {
                    page-break-after: avoid;
                }
                
                .patient-info-table {
                    page-break-after: avoid;
                }
                
                .bill-table thead {
                    display: table-header-group;
                }
                
                .bill-table tbody tr {
                    page-break-inside: avoid;
                }
                
                .totals-section {
                    page-break-inside: avoid;
                }
                
                .amount-words {
                    page-break-inside: avoid;
                }
                
                /* Ensure proper margins on new pages */
                @page {
                    margin: 15mm 10mm;
                }
                
                /* Header on new pages */
                .continued-header {
                    display: none;
                }
                
                @media print {
                    .page-break-before .continued-header {
                        display: block;
                        text-align: center;
                        font-weight: bold;
                        margin-bottom: 10px;
                        font-size: 14px;
                    }
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
                <div class="cash-memo">CASH MEMO</div>
            </div>

            <!-- NEW: Patient Numbers Display -->
            <div class="patient-numbers">
                <div class="number-item">
                    <div class="number-label">OPD Number</div>
                    <div class="number-value">${
                      admissionHistory.opdNumber || "N/A"
                    }</div>
                </div>
                ${
                  admissionHistory.ipdNumber
                    ? `
                <div class="number-item">
                    <div class="number-label">IPD Number</div>
                    <div class="number-value">${admissionHistory.ipdNumber}</div>
                </div>
                `
                    : ""
                }
            </div>

            <!-- Patient Information Table -->
            <table class="patient-info-table">
                <tr>
                    <th>Receipt No.</th>
                    <td>${admissionHistory.admissionId}</td>
                    <th>Patient Name</th>
                    <td>${patientHistory.name}</td>
                </tr>
                <tr>
                    <th>Patient ID</th>
                    <td>${patientHistory.patientId}</td>
                    <th>Age/Gender</th>
                    <td>${patientHistory.age} Years / ${
    patientHistory.gender
  }</td>
                </tr>
                <tr>
                    <th>Admission Date</th>
                    <td>${formatDate(admissionHistory.admissionDate)}</td>
                    <th>Discharge Date</th>
                    <td>${formatDate(admissionHistory.dischargeDate)}</td>
                </tr>
                <tr>
                    <th>Length of Stay</th>
                    <td>${lengthOfStay} days</td>
                    <th>Doctor</th>
                    <td>${admissionHistory.doctor?.name || "Not specified"}</td>
                </tr>
            </table>

            <!-- Charges Table (Only Non-Zero Charges) -->
            <table class="bill-table">
                <thead>
                    <tr>
                        <th style="width: 8%;">Sr. No.</th>
                        <th style="width: 52%;">Particulars</th>
                        <th style="width: 15%;">Rate</th>
                        <th style="width: 10%;">Day</th>
                        <th style="width: 15%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${chargeRows}
                </tbody>
            </table>

            <!-- Totals Section - Always at bottom -->
            <div class="totals-section">
                <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-top: 0;">
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="4" style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">Grand Total</td>
                            <td style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">${formatCurrency(
                              billCalculations.totalCharges
                            )}</td>
                        </tr>
                        ${
                          billCalculations.discount > 0
                            ? `
                        <tr>
                            <td colspan="4" style="text-align: right; padding: 8px; border: 1px solid #000;">Discount</td>
                            <td style="text-align: right; padding: 8px; border: 1px solid #000;">-${formatCurrency(
                              billCalculations.discount
                            )}</td>
                        </tr>
                        `
                            : ""
                        }
                        ${
                          billCalculations.advance > 0
                            ? `
                        <tr>
                            <td colspan="4" style="text-align: right; padding: 8px; border: 1px solid #000;">Advance</td>
                            <td style="text-align: right; padding: 8px; border: 1px solid #000;">-${formatCurrency(
                              billCalculations.advance
                            )}</td>
                        </tr>
                        `
                            : ""
                        }
                        <tr class="total-row">
                            <td colspan="4" style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">Total Balance</td>
                            <td style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">${formatCurrency(
                              billCalculations.finalAmount
                            )}</td>
                        </tr>
                    </tfoot>
                </table>

                <!-- Amount in Words -->
                <div class="amount-words">
                    Rs.- ${numberToWords(billCalculations.finalAmount)} Only.
                </div>
            </div>

            <!-- Continued header for new pages (hidden by default, shown on page breaks) -->
            <div class="continued-header">
                <div>CASH MEMO (Continued)</div>
                <div style="font-size: 11px; margin-top: 5px;">Patient: ${
                  patientHistory.name
                } | ID: ${patientHistory.patientId} | OPD: ${
    admissionHistory.opdNumber || "N/A"
  }${
    admissionHistory.ipdNumber ? ` | IPD: ${admissionHistory.ipdNumber}` : ""
  }</div>
            </div>
        </div>
    </body>
    </html>
  `;
};
// Updated OPD Bill HTML Template
export const generateOPDBillHTML = (
  data,
  bannerImageUrl = "https://res.cloudinary.com/dnznafp2a/image/upload/v1747566698/Bhosale_prescription_iyyjpw.png"
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OPD Bill - ${data.patientName}</title>
      <style>* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Times New Roman', serif;
  font-size: 11px;
  line-height: 1.2;
  color: #000;
  background: #fff;
  padding: 10px;
}

.container {
  max-width: 210mm;
  margin: 0 auto;
  background: #fff;
  height: auto;
}

.header {
  text-align: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 3px solid #000;
  page-break-inside: avoid;
}

.banner-image {
  width: 100%;
  max-height: 100px;
  object-fit: contain;
  margin-bottom: 6px;
  border: 1px solid #000;
}

.document-title {
  font-size: 18px;
  font-weight: bold;
  color: #000;
  margin-top: 6px;
  padding: 6px 0;
  background: #fff;
  border: 2px solid #000;
}

/* NEW: Patient numbers section for OPD */
.patient-numbers {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin: 10px 0;
  padding: 8px;
  background-color: #f0f8ff;
  border: 2px solid #007acc;
  border-radius: 4px;
}

.number-item {
  text-align: center;
  padding: 5px 15px;
}

.number-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 2px;
}

.number-value {
  font-size: 14px;
  font-weight: bold;
  color: #007acc;
}

.bill-info-section {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  page-break-inside: avoid;
}

.patient-info, .bill-details {
  width: 48%;
  border: 2px solid #000;
  padding: 8px;
  background: #fff;
}

.info-title {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 6px;
  text-decoration: underline;
  color: #000;
  text-align: center;
  border-bottom: 1px solid #000;
  padding-bottom: 3px;
}

.info-row {
  margin: 4px 0;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  padding-bottom: 2px;
}

.info-label {
  font-weight: bold;
  width: 85px;
  color: #000;
}

.info-value {
  flex: 1;
  text-align: right;
  font-weight: normal;
}

.services-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #000;
  margin: 10px 0;
  font-size: 11px;
}

.services-table th {
  background-color: #000;
  color: white;
  font-weight: bold;
  padding: 6px 4px;
  border: 1px solid #000;
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.3px;
}

.services-table td {
  padding: 5px 4px;
  border: 1px solid #000;
  text-align: center;
  vertical-align: middle;
  font-size: 10px;
  color: #000 !important;
}

.services-table .service-name {
  text-align: left;
  font-weight: bold;
  color: #000 !important;
}

.services-table .amount {
  text-align: right;
  font-weight: bold;
  color: #000;
}

.services-table tbody tr:nth-child(even) {
  background-color: #f8f8f8;
}

.calculation-section {
  width: 48%;
  margin-left: auto;
  border: 2px solid #000;
  margin-top: 10px;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 8px;
  border-bottom: 1px solid #000;
  font-size: 11px;
}

.calc-row.total {
  background-color: #000;
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.calc-label {
  font-weight: bold;
}

.calc-value {
  font-weight: bold;
}

.payment-section {
  margin: 12px 0;
  padding: 8px;
  border: 2px solid #000;
  background: #fff;
  font-size: 11px;
}

.footer {
  margin-top: 12px;
  text-align: center;
  font-size: 9px;
  color: #000;
  border-top: 1px solid #000;
  padding-top: 6px;
}

.signature-section {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  padding: 10px 0;
}

.signature-box {
  text-align: center;
  width: 140px;
}

.signature-line {
  border-top: 2px solid #000;
  margin-top: 25px;
  margin-bottom: 5px;
}

.signature-label {
  font-weight: bold;
  font-size: 10px;
  color: #000;
}

@media print {
  body { 
    padding: 6mm;
    font-size: 10px;
  }
  .container { 
    margin: 0; 
    padding: 0;
    height: auto;
  }
  .header {
    margin-bottom: 8px;
  }
  .signature-section {
    margin-top: 12px;
  }
  .signature-line {
    margin-top: 20px;
  }
}

@page {
  size: A4;
  margin: 10mm;
}
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Hospital Header -->
        <div class="header">
          ${
            bannerImageUrl
              ? `<img src="${bannerImageUrl}" alt="Hospital Banner" class="banner-image" onerror="this.style.display='none'">`
              : ""
          }
          <div class="document-title">OPD BILL / RECEIPT</div>
        </div>

        <!-- NEW: Patient Numbers Display -->
        <div class="patient-numbers">
          <div class="number-item">
            <div class="number-label">OPD Number</div>
            <div class="number-value">${data.opdNumber || "N/A"}</div>
          </div>
          ${
            data.ipdNumber
              ? `
          <div class="number-item">
            <div class="number-label">IPD Number</div>
            <div class="number-value">${data.ipdNumber}</div>
          </div>
          `
              : ""
          }
        </div>

        <!-- Patient & Bill Information -->
        <div class="bill-info-section">
          <div class="patient-info">
            <div class="info-title">PATIENT INFORMATION</div>
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span class="info-value">${data.patientName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Patient ID:</span>
              <span class="info-value">${data.patientId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Age/Gender:</span>
              <span class="info-value">${data.age} / ${data.gender}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Contact No:</span>
              <span class="info-value">${data.contact}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Consultant:</span>
              <span class="info-value">${data.consultantDoctor}</span>
            </div>
          </div>
          
          <div class="bill-details">
            <div class="info-title">BILL DETAILS</div>
            <div class="info-row">
              <span class="info-label">Bill Number:</span>
              <span class="info-value">${data.billNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${data.billDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Time:</span>
              <span class="info-value">${data.billTime}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Mode:</span>
              <span class="info-value">${data.paymentMode}</span>
            </div>
          </div>
        </div>

        <!-- Services Table -->
        <table class="services-table">
          <thead>
            <tr>
              <th>SERVICE DESCRIPTION</th>
              <th>QTY</th>
              <th>RATE (₹)</th>
              <th>AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.consultationFee > 0
                ? `
            <tr>
              <td class="service-name">Consultation Fee</td>
              <td>1</td>
              <td class="amount">${data.consultationFee.toFixed(2)}</td>
              <td class="amount">${data.consultationFee.toFixed(2)}</td>
            </tr>
            `
                : ""
            }
            
            ${
              data.doctorCharges > 0
                ? `
            <tr>
              <td class="service-name">Doctor Charges</td>
              <td>1</td>
              <td class="amount">${data.doctorCharges.toFixed(2)}</td>
              <td class="amount">${data.doctorCharges.toFixed(2)}</td>
            </tr>
            `
                : ""
            }
            
            ${Object.entries(data.services)
              .map(([serviceName, service]) => {
                if (service.total > 0) {
                  return `
                <tr>
                  <td class="service-name">${serviceName.toUpperCase()}</td>
                  <td>${service.quantity}</td>
                  <td class="amount">${service.rate.toFixed(2)}</td>
                  <td class="amount">${service.total.toFixed(2)}</td>
                </tr>
                `;
                }
                return "";
              })
              .join("")}
            
            ${data.additionalCharges
              .map(
                (charge) => `
            <tr>
              <td class="service-name">${
                charge.name || "Additional Charge"
              }</td>
              <td>${charge.quantity || 1}</td>
              <td class="amount">${(charge.rate || 0).toFixed(2)}</td>
              <td class="amount">${(
                (charge.quantity || 1) * (charge.rate || 0)
              ).toFixed(2)}</td>
            </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <!-- Calculation Section -->
        <div class="calculation-section">
          <div class="calc-row">
            <span class="calc-label">Sub Total:</span>
            <span class="calc-value">₹ ${data.subTotal.toFixed(2)}</span>
          </div>
          ${
            data.discount > 0
              ? `
          <div class="calc-row">
            <span class="calc-label">Discount (${data.discount}%):</span>
            <span class="calc-value">- ₹ ${data.discountAmount.toFixed(
              2
            )}</span>
          </div>
          `
              : ""
          }
          <div class="calc-row total">
            <span class="calc-label">GRAND TOTAL:</span>
            <span class="calc-value">₹ ${data.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <!-- Payment Section -->
        <div class="payment-section">
          <strong>Payment Mode: ${data.paymentMode}</strong>
          ${data.notes ? `<br><br><strong>Notes:</strong> ${data.notes}` : ""}
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Patient Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Cashier/Receptionist</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          Generated on: ${data.generatedAt.toLocaleString("en-IN")} | 
          Bill No: ${data.billNumber} | OPD: ${data.opdNumber || "N/A"}${
    data.ipdNumber ? ` | IPD: ${data.ipdNumber}` : ""
  } | Thank you for choosing our services!
        </div>
      </div>
    </body>
    </html>
  `;
};
