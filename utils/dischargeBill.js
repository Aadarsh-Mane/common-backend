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

  // Generate charge rows
  let chargeRows = "";
  let serialNumber = 1;

  // All possible charges in order
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

  allCharges.forEach((chargeType) => {
    if (processedCharges[chargeType]) {
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
    } else {
      chargeRows += `
        <tr>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${serialNumber}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 11px;">${getChargeDescription(
            chargeType
          )}</td>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;"></td>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;"></td>
          <td style="text-align: right; padding: 4px; border: 1px solid #000; font-size: 11px;">0</td>
        </tr>
      `;
      serialNumber++;
    }
  });

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

            <!-- Charges Table -->
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
                } | ID: ${patientHistory.patientId}</div>
            </div>
        </div>
    </body>
    </html>
  `;
};
function getChargeDescription(chargeType) {
  const descriptions = {
    admissionFees: "Admission Fees",
    icuCharges: "ICU",
    specialCharges: "Special",
    generalWardCharges: "General ward",
    surgeonCharges: "Surgeon Charges",
    assistantSurgeonCharges: "Assistant Surgeon Charges",
    operationTheatreCharges: "Operation Theatre charges",
    operationTheatreMedicines: "Operation Theatre Medicines",
    anaesthesiaCharges: "Anaesthesia charges",
    localAnaesthesiaCharges: "Local Anaesthesia charges",
    o2Charges: "O2 Charges",
    monitorCharges: "Monitor Charges",
    tapping: "Tapping",
    ventilatorCharges: "Ventilator Charges",
    emergencyCharges: "Emergency charges",
    micCharges: "M.I.C Charges",
    ivFluids: "IV Fluids",
    bloodTransfusionCharges: "Blood Transfusion Service Charges",
    physioTherapyCharges: "Physio/Occupation Therapy Charges",
    xrayFilmCharges: "X-Ray Film Charges",
    ecgCharges: "E.C.G. Charges",
    specialVisitCharges: "Special Visit Charges",
    doctorCharges: "Doctor Charges",
    nursingCharges: "Nursing Charges",
    injMedicines: "Inj & Medicines",
    catheterCharges: "Catheter Charges",
    rylesTubeCharges: "Ryles Tube Charges",
    miscellaneousCharges: "Miscellaneous Charges",
    dressingCharges: "Dressing Charges",
    professionalCharges: "Professional Charges",
    serviceTaxCharges: "Service Tax Charges @ 15%",
    tractionCharges: "Traction/SWD/L.F.T.",
    gastricLavageCharges: "Gastric Lavage Charges",
    plateletCharges: "Platelet Charges",
    nebulizerCharges: "Nebulizer Charges",
    implantCharges: "Implant Charges",
    physicianCharges: "Physician Charges",
    slabCastCharges: "Slab/Cast Charges",
    mrfCharges: "M.R.F./Debridement Proc. Charges",
    procCharges: "Proc. Charges / Hydro Therapy",
    staplingCharges: "Stapling/Thomas Splint",
    enemaCharges: "Enema/Proctoscopy",
    gastroscopyCharges: "Gastroscopy/Colonoscopy",
    endoscopicCharges: "Endoscopic Dilatation",
    velixCharges: "Velix /Solumedrol / A.S.V. drip charges",
    bslCharges: "B.S.L. charges",
    icdtCharges: "I.C.D.T. Proc. Charges",
    ophthalmologistCharges: "Ophthalmologist Charges",
  };

  return descriptions[chargeType] || chargeType;
}
