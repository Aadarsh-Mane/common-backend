// export const generateDischargeBillHTML = (
//   patientHistory,
//   admissionHistory,
//   processedCharges,
//   billCalculations,
//   lengthOfStay
// ) => {
//   const hospitalBanner =
//     "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
//   const hospitalName = process.env.HOSPITAL_NAME || "BHOSALE HOSPITAL";
//   const hospitalAddress =
//     process.env.HOSPITAL_ADDRESS ||
//     "Shubham Prestige 1st Floor, Near Post Office, Khodad Road, Narayangaon, Tal-Junnar, Dist-Pune";
//   const hospitalPhone = process.env.HOSPITAL_PHONE || "Phone No.9923537180";

//   const formatDate = (date) => {
//     return new Date(date).toLocaleDateString("en-IN", {
//       year: "numeric",
//       month: "2-digit",
//       day: "2-digit",
//     });
//   };

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat("en-IN", {
//       style: "currency",
//       currency: "INR",
//       minimumFractionDigits: 0,
//     })
//       .format(amount)
//       .replace("₹", "");
//   };

//   const numberToWords = (num) => {
//     const ones = [
//       "",
//       "One",
//       "Two",
//       "Three",
//       "Four",
//       "Five",
//       "Six",
//       "Seven",
//       "Eight",
//       "Nine",
//     ];
//     const teens = [
//       "Ten",
//       "Eleven",
//       "Twelve",
//       "Thirteen",
//       "Fourteen",
//       "Fifteen",
//       "Sixteen",
//       "Seventeen",
//       "Eighteen",
//       "Nineteen",
//     ];
//     const tens = [
//       "",
//       "",
//       "Twenty",
//       "Thirty",
//       "Forty",
//       "Fifty",
//       "Sixty",
//       "Seventy",
//       "Eighty",
//       "Ninety",
//     ];

//     if (num === 0) return "Zero";
//     if (num < 10) return ones[num];
//     if (num < 20) return teens[num - 10];
//     if (num < 100)
//       return (
//         tens[Math.floor(num / 10)] +
//         (num % 10 !== 0 ? " " + ones[num % 10] : "")
//       );
//     if (num < 1000)
//       return (
//         ones[Math.floor(num / 100)] +
//         " Hundred" +
//         (num % 100 !== 0 ? " " + numberToWords(num % 100) : "")
//       );
//     if (num < 100000)
//       return (
//         numberToWords(Math.floor(num / 1000)) +
//         " Thousand" +
//         (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "")
//       );
//     return "Amount too large";
//   };

//   // Generate charge rows
//   let chargeRows = "";
//   let serialNumber = 1;

//   // All possible charges in order
//   const allCharges = [
//     "admissionFees",
//     "icuCharges",
//     "specialCharges",
//     "generalWardCharges",
//     "surgeonCharges",
//     "assistantSurgeonCharges",
//     "operationTheatreCharges",
//     "operationTheatreMedicines",
//     "anaesthesiaCharges",
//     "localAnaesthesiaCharges",
//     "o2Charges",
//     "monitorCharges",
//     "tapping",
//     "ventilatorCharges",
//     "emergencyCharges",
//     "micCharges",
//     "ivFluids",
//     "bloodTransfusionCharges",
//     "physioTherapyCharges",
//     "xrayFilmCharges",
//     "ecgCharges",
//     "specialVisitCharges",
//     "doctorCharges",
//     "nursingCharges",
//     "injMedicines",
//     "catheterCharges",
//     "rylesTubeCharges",
//     "miscellaneousCharges",
//     "dressingCharges",
//     "professionalCharges",
//     "serviceTaxCharges",
//     "tractionCharges",
//     "gastricLavageCharges",
//     "plateletCharges",
//     "nebulizerCharges",
//     "implantCharges",
//     "physicianCharges",
//     "slabCastCharges",
//     "mrfCharges",
//     "procCharges",
//     "staplingCharges",
//     "enemaCharges",
//     "gastroscopyCharges",
//     "endoscopicCharges",
//     "velixCharges",
//     "bslCharges",
//     "icdtCharges",
//     "ophthalmologistCharges",
//   ];

//   allCharges.forEach((chargeType) => {
//     if (processedCharges[chargeType]) {
//       const charge = processedCharges[chargeType];
//       chargeRows += `
//         <tr>
//           <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${serialNumber}</td>
//           <td style="padding: 4px; border: 1px solid #000; font-size: 11px;">${
//             charge.description
//           }</td>
//           <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${
//             charge.rate
//           }</td>
//           <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${
//             charge.days
//           }</td>
//           <td style="text-align: right; padding: 4px; border: 1px solid #000; font-size: 11px;">${formatCurrency(
//             charge.total
//           )}</td>
//         </tr>
//       `;
//       serialNumber++;
//     } else {
//       chargeRows += `
//         <tr>
//           <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${serialNumber}</td>
//           <td style="padding: 4px; border: 1px solid #000; font-size: 11px;">${getChargeDescription(
//             chargeType
//           )}</td>
//           <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;"></td>
//           <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;"></td>
//           <td style="text-align: right; padding: 4px; border: 1px solid #000; font-size: 11px;">0</td>
//         </tr>
//       `;
//       serialNumber++;
//     }
//   });

//   return `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Discharge Bill - ${patientHistory.name}</title>
//         <style>
//             * { margin: 0; padding: 0; box-sizing: border-box; }

//             body {
//                 font-family: Arial, sans-serif;
//                 font-size: 12px;
//                 line-height: 1.4;
//                 color: #000;
//             }

//             .container {
//                 max-width: 210mm;
//                 margin: 0 auto;
//                 padding: 15mm;
//             }

//             /* Header styles */
//             .header {
//                 text-align: center;
//                 margin-bottom: 15px;
//                 page-break-after: avoid;
//             }

//             .hospital-banner {
//                 width: 100%;
//                 max-height: 80px;
//                 object-fit: contain;
//                 margin-bottom: 8px;
//             }

//             .hospital-info {
//                 font-size: 11px;
//                 margin-bottom: 5px;
//             }

//             .cash-memo {
//                 font-weight: bold;
//                 font-size: 16px;
//                 margin-bottom: 10px;
//             }

//             /* Patient info table */
//             .patient-info-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 margin-bottom: 15px;
//                 font-size: 11px;
//                 page-break-after: avoid;
//                 border: 1px solid #000;
//             }

//             .patient-info-table th {
//                 background-color: #f0f0f0;
//                 padding: 6px;
//                 text-align: left;
//                 font-weight: bold;
//                 border: 1px solid #000;
//                 width: 25%;
//             }

//             .patient-info-table td {
//                 padding: 6px;
//                 border: 1px solid #000;
//                 width: 25%;
//             }

//             /* Main charges table */
//             .bill-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 border: 2px solid #000;
//                 page-break-inside: auto;
//             }

//             .bill-table thead {
//                 display: table-header-group;
//                 page-break-after: avoid;
//             }

//             .bill-table th {
//                 background-color: #f0f0f0;
//                 padding: 6px;
//                 text-align: center;
//                 font-weight: bold;
//                 border: 1px solid #000;
//                 font-size: 11px;
//             }

//             .bill-table td {
//                 padding: 4px;
//                 border: 1px solid #000;
//                 font-size: 11px;
//             }

//             .bill-table tbody tr {
//                 page-break-inside: avoid;
//             }

//             /* Totals section - always at bottom */
//             .totals-section {
//                 page-break-inside: avoid;
//                 margin-top: 0;
//             }

//             .total-row {
//                 font-weight: bold;
//                 background-color: #f8f8f8;
//             }

//             .amount-words {
//                 margin-top: 15px;
//                 font-weight: bold;
//                 font-size: 11px;
//                 page-break-inside: avoid;
//             }

//             /* Page break controls */
//             .page-break-before {
//                 page-break-before: always;
//                 padding-top: 20mm;
//             }

//             .avoid-break {
//                 page-break-inside: avoid;
//             }

//             /* Print specific styles */
//             @media print {
//                 .container {
//                     padding: 10mm;
//                     max-width: none;
//                 }
//                 body {
//                     font-size: 11px;
//                     -webkit-print-color-adjust: exact;
//                     print-color-adjust: exact;
//                 }

//                 .header {
//                     page-break-after: avoid;
//                 }

//                 .patient-info-table {
//                     page-break-after: avoid;
//                 }

//                 .bill-table thead {
//                     display: table-header-group;
//                 }

//                 .bill-table tbody tr {
//                     page-break-inside: avoid;
//                 }

//                 .totals-section {
//                     page-break-inside: avoid;
//                 }

//                 .amount-words {
//                     page-break-inside: avoid;
//                 }

//                 /* Ensure proper margins on new pages */
//                 @page {
//                     margin: 15mm 10mm;
//                 }

//                 /* Header on new pages */
//                 .continued-header {
//                     display: none;
//                 }

//                 @media print {
//                     .page-break-before .continued-header {
//                         display: block;
//                         text-align: center;
//                         font-weight: bold;
//                         margin-bottom: 10px;
//                         font-size: 14px;
//                     }
//                 }
//             }
//         </style>
//     </head>
//     <body>
//         <div class="container">
//             <!-- Header -->
//             <div class="header">
//                 <img src="${hospitalBanner}" alt="Hospital Banner" class="hospital-banner" onerror="this.style.display='none'">
//                 <div class="hospital-info">${hospitalAddress}</div>
//                 <div class="hospital-info">${hospitalPhone}</div>
//                 <div class="hospital-info">Date: ${formatDate(new Date())}</div>
//                 <div class="cash-memo">CASH MEMO</div>
//             </div>

//             <!-- Patient Information Table -->
//             <table class="patient-info-table">
//                 <tr>
//                     <th>Receipt No.</th>
//                     <td>${admissionHistory.admissionId}</td>
//                     <th>Patient Name</th>
//                     <td>${patientHistory.name}</td>
//                 </tr>
//                 <tr>
//                     <th>Patient ID</th>
//                     <td>${patientHistory.patientId}</td>
//                     <th>Age/Gender</th>
//                     <td>${patientHistory.age} Years / ${
//     patientHistory.gender
//   }</td>
//                 </tr>
//                 <tr>
//                     <th>Admission Date</th>
//                     <td>${formatDate(admissionHistory.admissionDate)}</td>
//                     <th>Discharge Date</th>
//                     <td>${formatDate(admissionHistory.dischargeDate)}</td>
//                 </tr>
//                 <tr>
//                     <th>Length of Stay</th>
//                     <td>${lengthOfStay} days</td>
//                     <th>Doctor</th>
//                     <td>${admissionHistory.doctor?.name || "Not specified"}</td>
//                 </tr>
//             </table>

//             <!-- Charges Table -->
//             <table class="bill-table">
//                 <thead>
//                     <tr>
//                         <th style="width: 8%;">Sr. No.</th>
//                         <th style="width: 52%;">Particulars</th>
//                         <th style="width: 15%;">Rate</th>
//                         <th style="width: 10%;">Day</th>
//                         <th style="width: 15%;">Amount</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${chargeRows}
//                 </tbody>
//             </table>

//             <!-- Totals Section - Always at bottom -->
//             <div class="totals-section">
//                 <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-top: 0;">
//                     <tfoot>
//                         <tr class="total-row">
//                             <td colspan="4" style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">Grand Total</td>
//                             <td style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">${formatCurrency(
//                               billCalculations.totalCharges
//                             )}</td>
//                         </tr>
//                         ${
//                           billCalculations.discount > 0
//                             ? `
//                         <tr>
//                             <td colspan="4" style="text-align: right; padding: 8px; border: 1px solid #000;">Discount</td>
//                             <td style="text-align: right; padding: 8px; border: 1px solid #000;">-${formatCurrency(
//                               billCalculations.discount
//                             )}</td>
//                         </tr>
//                         `
//                             : ""
//                         }
//                         ${
//                           billCalculations.advance > 0
//                             ? `
//                         <tr>
//                             <td colspan="4" style="text-align: right; padding: 8px; border: 1px solid #000;">Advance</td>
//                             <td style="text-align: right; padding: 8px; border: 1px solid #000;">-${formatCurrency(
//                               billCalculations.advance
//                             )}</td>
//                         </tr>
//                         `
//                             : ""
//                         }
//                         <tr class="total-row">
//                             <td colspan="4" style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">Total Balance</td>
//                             <td style="text-align: right; padding: 8px; font-weight: bold; border: 1px solid #000;">${formatCurrency(
//                               billCalculations.finalAmount
//                             )}</td>
//                         </tr>
//                     </tfoot>
//                 </table>

//                 <!-- Amount in Words -->
//                 <div class="amount-words">
//                     Rs.- ${numberToWords(billCalculations.finalAmount)} Only.
//                 </div>
//             </div>

//             <!-- Continued header for new pages (hidden by default, shown on page breaks) -->
//             <div class="continued-header">
//                 <div>CASH MEMO (Continued)</div>
//                 <div style="font-size: 11px; margin-top: 5px;">Patient: ${
//                   patientHistory.name
//                 } | ID: ${patientHistory.patientId}</div>
//             </div>
//         </div>
//     </body>
//     </html>
//   `;
// };
// function getChargeDescription(chargeType) {
//   const descriptions = {
//     admissionFees: "Admission Fees",
//     icuCharges: "ICU",
//     specialCharges: "Special",
//     generalWardCharges: "General ward",
//     surgeonCharges: "Surgeon Charges",
//     assistantSurgeonCharges: "Assistant Surgeon Charges",
//     operationTheatreCharges: "Operation Theatre charges",
//     operationTheatreMedicines: "Operation Theatre Medicines",
//     anaesthesiaCharges: "Anaesthesia charges",
//     localAnaesthesiaCharges: "Local Anaesthesia charges",
//     o2Charges: "O2 Charges",
//     monitorCharges: "Monitor Charges",
//     tapping: "Tapping",
//     ventilatorCharges: "Ventilator Charges",
//     emergencyCharges: "Emergency charges",
//     micCharges: "M.I.C Charges",
//     ivFluids: "IV Fluids",
//     bloodTransfusionCharges: "Blood Transfusion Service Charges",
//     physioTherapyCharges: "Physio/Occupation Therapy Charges",
//     xrayFilmCharges: "X-Ray Film Charges",
//     ecgCharges: "E.C.G. Charges",
//     specialVisitCharges: "Special Visit Charges",
//     doctorCharges: "Doctor Charges",
//     nursingCharges: "Nursing Charges",
//     injMedicines: "Inj & Medicines",
//     catheterCharges: "Catheter Charges",
//     rylesTubeCharges: "Ryles Tube Charges",
//     miscellaneousCharges: "Miscellaneous Charges",
//     dressingCharges: "Dressing Charges",
//     professionalCharges: "Professional Charges",
//     serviceTaxCharges: "Service Tax Charges @ 15%",
//     tractionCharges: "Traction/SWD/L.F.T.",
//     gastricLavageCharges: "Gastric Lavage Charges",
//     plateletCharges: "Platelet Charges",
//     nebulizerCharges: "Nebulizer Charges",
//     implantCharges: "Implant Charges",
//     physicianCharges: "Physician Charges",
//     slabCastCharges: "Slab/Cast Charges",
//     mrfCharges: "M.R.F./Debridement Proc. Charges",
//     procCharges: "Proc. Charges / Hydro Therapy",
//     staplingCharges: "Stapling/Thomas Splint",
//     enemaCharges: "Enema/Proctoscopy",
//     gastroscopyCharges: "Gastroscopy/Colonoscopy",
//     endoscopicCharges: "Endoscopic Dilatation",
//     velixCharges: "Velix /Solumedrol / A.S.V. drip charges",
//     bslCharges: "B.S.L. charges",
//     icdtCharges: "I.C.D.T. Proc. Charges",
//     ophthalmologistCharges: "Ophthalmologist Charges",
//   };

//   return descriptions[chargeType] || chargeType;
// }
export const generateDischargeBillHTML = (
  patientHistory,
  admissionHistory,
  processedCharges,
  billCalculations,
  lengthOfStay
) => {
  const hospitalBanner =
    "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png";
  const hospitalName = process.env.HOSPITAL_NAME || "BHOSALE HOSPITAL";
  const hospitalAddress =
    process.env.HOSPITAL_ADDRESS ||
    "Shete mala,Near Ganesh Temple Narayanwadi Road Narayangaon Tal Junnar Dist Pune Pin 410504";
  const hospitalPhone = process.env.HOSPITAL_PHONE || "Phone No.9923537180";

  // Updated date formatting function to include time in IST
  const formatDateWithTime = (date) => {
    const istDate = new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return istDate;
  };

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

  // ✅ UPDATED: Generate charge rows - ONLY NON-ZERO CHARGES INCLUDING CUSTOM CHARGES
  let chargeRows = "";
  let serialNumber = 1;

  // All possible regular charges in order (keep your original array)
  const allRegularCharges = [
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
    // NEW: Add the new fixed charges
    "pharmacyCharges",
    "pathologyCharges",
    "otherCharges",
  ];

  // ✅ Process regular charges first
  allRegularCharges.forEach((chargeType) => {
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

  // ✅ NEW: Process custom charges
  Object.keys(processedCharges).forEach((chargeKey) => {
    // Check if it's a custom charge (starts with 'custom_')
    if (
      chargeKey.startsWith("custom_") &&
      processedCharges[chargeKey].total > 0
    ) {
      const charge = processedCharges[chargeKey];
      chargeRows += `
        <tr style="background-color: #f0f9ff;">
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${serialNumber}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 11px;">
            <span style="color: #0369a1; font-weight: 600;">★</span> ${
              charge.description
            }
          </td>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${
            charge.rate
          }</td>
          <td style="text-align: center; padding: 4px; border: 1px solid #000; font-size: 11px;">${
            charge.days
          }</td>
          <td style="text-align: right; padding: 4px; border: 1px solid #000; font-size: 11px; color: #0369a1; font-weight: 600;">${formatCurrency(
            charge.total
          )}</td>
        </tr>
      `;
      serialNumber++;
    }
  });

  // ✅ Optional: Add message if no charges found
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
            
            /* Custom charge styling */
            .custom-charge-row {
                background-color: #f0f9ff !important;
            }
            
            .custom-charge-indicator {
                color: #0369a1;
                font-weight: 600;
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
                
                .custom-charge-row {
                    background-color: #f0f9ff !important;
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
                    <th>OPD Number</th>
                    <td>${admissionHistory.opdNumber || "N/A"}</td>
                    <th>IPD Number</th>
                    <td>${admissionHistory.ipdNumber || "N/A"}</td>
                </tr>
              <tr>
    <th>Admission Date</th>
    <td>${formatDateWithTime(admissionHistory.admissionDate)}</td>
    <th>Discharge Date</th>
    <td>${formatDateWithTime(admissionHistory.dischargeDate)}</td>
</tr>
                <tr>
                    <th>Length of Stay</th>
                    <td>${lengthOfStay} days</td>
                    <th>Doctor</th>
                    <td>${admissionHistory.doctor?.name || "Not specified"}</td>
                </tr>
            </table>

            <!-- Charges Table (Including Custom Charges) -->
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

// Keep your existing getChargeDescription function as is
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

export const generateOPDBillHTML = (
  data,
  bannerImageUrl = "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png"
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
  color: #000;
  margin-bottom: 2px;
}

.number-value {
  font-size: 14px;
  font-weight: bold;
  color: #000;
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
  background-color: #fff;
  color: #000;
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
  background-color: #fff;
  color: #000;
  font-weight: bold;
  font-size: 12px;
  border: 2px solid #000;
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
