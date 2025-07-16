export const generateDepositReceiptHTML = (
  receipt,
  bannerImageUrl = "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png"
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

  // UPDATED: Format date with proper IST timezone
  const formatDate = (date) => {
    const istDate = convertToIST(date);
    if (!istDate) return "Not specified";
    return istDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Get current IST time for footer
  const getCurrentIndianTime = () => {
    const currentIST = getCurrentIST();
    return currentIST.toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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
                color: #000;
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
                    ? `<img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png" alt="Hospital Banner" class="banner-image">`
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
                        <td class="info-label">OPD | IPD Number</td>
                        <td>${receipt.patientNumbers?.opdNumber || "N/A"} | ${
    receipt.patientNumbers?.ipdNumber || "N/A"
  }</td>
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
                <p>Receipt Generated: ${getCurrentIndianTime()}</p>
                <p>For queries, contact reception with Receipt ID: ${
                  receipt.receiptId
                }</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
