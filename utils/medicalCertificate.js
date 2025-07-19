export const generateCertificateHTML = (data) => {
  const {
    patient,
    admissionRecord,
    diagnosis,
    leaveStartDate,
    expectedRestDuration,
    returnDate,
    doctor,
    doctorSignatureUrl,
    currentDate,
    pronoun,
    possessivePronoun,
    additionalNotes,
    certificateType,
    currentDateTime,
  } = data;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Medical Certificate</title>
      <style>
 * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.4;
    color: #2c3e50;
    background: white;
    padding: 15px;
    font-size: 13px;
}

.certificate-container {
    max-width: 750px;
    margin: 0 auto;
    border: 2px solid #34495e;
    border-radius: 8px;
    padding: 18px;
    background: #ffffff;
    min-height: 92vh;
    display: flex;
    flex-direction: column;
}

.header {
    text-align: center;
    margin-bottom: 12px;
    border-bottom: 2px solid #34495e;
    padding-bottom: 10px;
}

.hospital-banner {
    max-width: 100%;
    max-height: 60px;
    height: auto;
    margin-bottom: 6px;
}

.certificate-title {
    font-size: 20px;
    font-weight: bold;
    color: #2c3e50;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
}

.certificate-subtitle {
    font-size: 14px;
    color: #7f8c8d;
    margin-bottom: 8px;
    font-style: italic;
}

.certificate-number {
    text-align: right;
    font-size: 11px;
    color: #95a5a6;
    margin-bottom: 10px;
    font-weight: 600;
}

.content {
    flex: 1;
    margin: 10px 0;
    font-size: 13px;
    line-height: 1.4;
    text-align: justify;
}

.intro-text {
    margin-bottom: 12px;
    font-size: 14px;
    color: #2c3e50;
}

.patient-info {
    background: #f8f9fa;
    padding: 12px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin: 12px 0;
}

.patient-info h3 {
    color: #2c3e50;
    margin-bottom: 8px;
    font-size: 14px;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 4px;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.info-row {
    display: flex;
    margin-bottom: 4px;
}

.info-label {
    font-weight: 600;
    color: #495057;
    min-width: 90px;
    font-size: 12px;
}

.info-value {
    color: #2c3e50;
    font-size: 12px;
    flex: 1;
}

.diagnosis-section {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
    padding: 12px;
    margin: 12px 0;
}

.diagnosis-title {
    font-weight: bold;
    color: #856404;
    margin-bottom: 6px;
    font-size: 13px;
}

.diagnosis-text {
    color: #6c5914;
    font-weight: 600;
    font-size: 14px;
}

.medical-advice {
    background: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 12px;
    margin: 12px 0;
    font-style: italic;
    border-radius: 0 6px 6px 0;
}

.additional-notes {
    background: #f8f9fa;
    padding: 10px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin: 10px 0;
    font-size: 12px;
}

.notes-title {
    font-weight: bold;
    color: #495057;
    margin-bottom: 6px;
    font-size: 13px;
}

.signature-section {
    margin-top: auto;
    padding-top: 12px;
    border-top: 2px solid #ecf0f1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    align-items: end;
}

.doctor-info {
    text-align: left;
}

.doctor-info p {
    margin-bottom: 3px;
    font-size: 12px;
    color: #2c3e50;
}

.doctor-signature {
    text-align: center;
}

.signature-image {
    max-width: 120px;
    max-height: 50px;
    height: auto;
    margin-bottom: 5px;
}

.signature-line {
    border-top: 2px solid #34495e;
    margin: 8px 0 4px 0;
    padding-top: 4px;
    font-weight: bold;
    font-size: 11px;
    color: #2c3e50;
}

.stamp-image {
    max-width: 70px;
    max-height: 70px;
    height: auto;
    margin-top: 5px;
}

.date-issue {
    margin: 12px 0 8px 0;
    text-align: left;
    font-weight: bold;
    font-size: 13px;
    color: #2c3e50;
    background: #ecf0f1;
    padding: 8px;
    border-radius: 4px;
}

.footer {
    margin-top: 8px;
    text-align: center;
    font-size: 9px;
    color: #7f8c8d;
    border-top: 1px solid #ecf0f1;
    padding-top: 6px;
}

.highlight {
    background: #f1c40f;
    padding: 2px 4px;
    border-radius: 3px;
    color: #2c3e50;
    font-weight: 600;
}

@page {
    size: A4;
    margin: 0.5in;
}

@media print {
    body { 
        padding: 0;
        font-size: 12px;
    }
    .certificate-container { 
        border: 2px solid #000;
        min-height: auto;
        max-height: 95vh;
        padding: 15px;
    }
    .hospital-banner {
        max-height: 50px;
    }
    .footer {
        font-size: 8px;
        margin-top: 5px;
    }
}
      </style>
  </head>
  <body>
      <div class="certificate-container">
          <div class="certificate-number">
              Certificate No: MC-${patient.patientId}-${Date.now()}
          </div>
          
          <div class="header">
              <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png" alt="Hospital Banner" class="hospital-banner">
              <div class="certificate-title">Medical Certificate for ${certificateType}</div>
              <div class="certificate-subtitle">To Whom It May Concern</div>
          </div>
          
          <div class="content">
              <div class="intro-text">
                  This is to certify that <strong class="highlight">${
                    patient.gender === "Male"
                      ? "Mr."
                      : patient.gender === "Female"
                      ? "Ms."
                      : ""
                  } ${patient.name}</strong>, 
                  aged <strong>${
                    patient.age
                  } years</strong>, has been under medical care and examination.
              </div>
              
              <div class="patient-info">
                  <h3>Patient Information</h3>
                  <div class="info-grid">
                      <div class="info-row">
                          <span class="info-label">Patient ID:</span>
                          <span class="info-value">${patient.patientId}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Contact:</span>
                          <span class="info-value">${patient.contact}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Address:</span>
                          <span class="info-value">${
                            patient.address || "Not specified"
                          }</span>
                      </div>
                      ${
                        admissionRecord.opdNumber
                          ? `
                      <div class="info-row">
                          <span class="info-label">OPD No:</span>
                          <span class="info-value">${admissionRecord.opdNumber}</span>
                      </div>
                      `
                          : ""
                      }
                      ${
                        admissionRecord.ipdNumber
                          ? `
                      <div class="info-row">
                          <span class="info-label">IPD No:</span>
                          <span class="info-value">${admissionRecord.ipdNumber}</span>
                      </div>
                      `
                          : ""
                      }
                  </div>
              </div>
              
              <div class="diagnosis-section">
                  <div class="diagnosis-title">Medical Diagnosis</div>
                  <div class="diagnosis-text">${diagnosis}</div>
              </div>
              
              <p style="margin: 10px 0;">
                  Due to the severity of the condition, <strong>${possessivePronoun}</strong> has been advised medical leave 
                  starting from <strong class="highlight">${leaveStartDate}</strong> and may require rest until further medical assessment.
              </p>
              
              ${
                expectedRestDuration
                  ? `
              <p style="margin: 8px 0;">
                  <strong>Expected duration of absence:</strong> <span class="highlight">${expectedRestDuration}</span>
              </p>
              `
                  : ""
              }
              
              <div class="medical-advice">
                  <strong>Medical Recommendation:</strong> Regular follow-ups and treatment are ongoing. ${pronoun} is expected to resume work from 
                  <strong class="highlight">${returnDate}</strong>, subject to medical evaluation and fitness for duty.
              </div>
              
              ${
                additionalNotes
                  ? `
              <div class="additional-notes">
                  <div class="notes-title">Additional Medical Notes:</div>
                  <div>${additionalNotes}</div>
              </div>
              `
                  : ""
              }
              
          
          </div>
          
          <div class="date-issue">
              <strong>Date of Issue:</strong> ${currentDate}
          </div>
          
          <div class="signature-section">
              <div class="doctor-info">
                  <p><strong>Doctor's Name:</strong> Dr. ${
                    doctor.doctorName
                  }</p>
                  <p><strong>Speciality:</strong> ${
                    doctor.speciality || "General Medicine"
                  }</p>
              </div>
              
              <div class="doctor-signature">
                  ${
                    doctorSignatureUrl
                      ? `<img src="${doctorSignatureUrl}" alt="Doctor Signature" class="signature-image">`
                      : ""
                  }
                  <div class="signature-line">Doctor's Signature</div>
              </div>
          </div>
          
          <div class="footer">
              <p>This is a computer-generated medical certificate. For verification, please contact the issuing medical facility.</p>
              <p>Certificate generated on: ${currentDateTime}</p>
          </div>
      </div>
  </body>
  </html>
  `;
};
