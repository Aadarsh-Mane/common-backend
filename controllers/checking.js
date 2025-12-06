import puppeteer from "puppeteer";
import { uploadToDrive } from "../services/uploader.js";

export const generateOPDCard = async () => {
  try {
    // Generate HTML content for medical certificate
    const htmlContent = generateOPDCardHTML();

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH ||
            "/usr/bin/google-chrome-stable"
          : undefined,
    });

    const page = await browser.newPage();

    // Set page size to A4
    await page.setViewport({ width: 794, height: 1123 });

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate PDF with A4 portrait dimensions
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
    });

    await browser.close();

    return pdfBuffer;
  } catch (error) {
    console.error("Medical Certificate generation error:", error);
    throw new Error(`Failed to generate medical certificate: ${error.message}`);
  }
};

// Helper function to generate HTML content
const generateOPDCardHTML = () => {
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
          background: white;
          color: #000;
        }
        
        .certificate-container {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 20px;
        }
        
        .bordered-box {
          border: 2px solid #000;
          min-height: 280mm;
          position: relative;
        }
        
        /* Header Section */
        .header {
          text-align: center;
          padding: 15px;
          border-bottom: 2px solid #000;
          background: #f0f0f0;
          position: relative;
        }
        
        .hospital-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        
        .hospital-address {
          font-size: 14px;
          color: #333;
          margin-bottom: 10px;
        }
        
        .card-title {
          font-size: 18px;
          font-weight: bold;
          margin-top: 10px;
          text-decoration: underline;
        }
        
        /* Barcode Section */
        .barcode-section {
          position: absolute;
          top: 20px;
          right: 20px;
          text-align: center;
        }
        
        .barcode {
          width: 150px;
          height: 40px;
          background: repeating-linear-gradient(
            90deg,
            #000,
            #000 2px,
            #fff 2px,
            #fff 4px
          );
          margin-bottom: 5px;
        }
        
        .barcode-number {
          font-size: 11px;
          font-family: monospace;
        }
        
        /* Validity Section */
        .validity-info {
          position: absolute;
          top: 60px;
          left: 20px;
          font-size: 12px;
        }
        
        .validity-label {
          font-weight: bold;
        }
        
        /* Certificate Content */
        .certificate-content {
          padding: 40px;
        }
        
        .certificate-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 40px 0 60px 0;
          text-decoration: underline;
        }
        
        .certificate-text {
          font-size: 18px;
          line-height: 2.8;
          text-align: justify;
        }
        
        .blank-line {
          display: inline-block;
          width: 350px;
          border-bottom: 1px solid #000;
          margin: 0 5px;
        }
        
        .blank-line-long {
          display: inline-block;
          width: 500px;
          border-bottom: 1px solid #000;
          margin: 0 5px;
        }
        
        .blank-line-short {
          display: inline-block;
          width: 40px;
          border-bottom: 1px solid #000;
          margin: 0 3px;
          text-align: center;
        }
        
        .blank-line-medium {
          display: inline-block;
          width: 80px;
          border-bottom: 1px solid #000;
          margin: 0 5px;
          text-align: center;
        }
        
        .certificate-paragraph {
          margin-bottom: 50px;
        }
        
        /* Doctor Signature */
        .signature-section {
          margin-top: 100px;
          padding-right: 60px;
          text-align: right;
        }
        
        .signature-line {
          width: 200px;
          border-bottom: 1px solid #000;
          margin-left: auto;
          margin-bottom: 10px;
        }
        
        .signature-label {
          font-size: 16px;
          font-weight: bold;
        }
        
        @media print {
          .certificate-container {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <div class="bordered-box">
          <!-- Header -->
          <div class="header">
            <div class="hospital-name">DISTRICT HOSPITAL SATARA</div>
            <div class="hospital-address">
              Sadarbazar, Guruwar Peth<br>Satara, Maharashtra (INDIA)
            </div>
            <div class="card-title">MEDICAL DEPARTMENT RECORD</div>
            
            <!-- Barcode Section -->
            <div class="barcode-section">
              <div class="barcode"></div>
              <div class="barcode-number">271152501190074</div>
            </div>
            
            <!-- Validity Info -->
            <div class="validity-info">
              <span class="validity-label">Card Valid Upto:</span> 28-Oct-2025
            </div>
          </div>
          
          <!-- Certificate Content -->
          <div class="certificate-content">
            <!-- Medical Certificate Title -->
            <h1 class="certificate-title">MEDICAL CERTIFICATE</h1>
            
            <!-- Certificate Text -->
            <div class="certificate-text">
              <div class="certificate-paragraph">
                This is to certify that Mr/Ms/Master <span class="blank-line"></span><br>
                is suffering from <span class="blank-line-long"></span><br>
                <span class="blank-line-long"></span><br>
                since <span class="blank-line-short"></span>/<span class="blank-line-short"></span>/<span class="blank-line-short"></span>. 
                He/She been/was advised rest for <span class="blank-line-medium"></span> days/weeks.
              </div>
              
              <div class="certificate-paragraph">
                He/She has been examined by me and is found to be fit to resume normal duties/attendance<br>
                from <span class="blank-line-short"></span>/<span class="blank-line-short"></span>/<span class="blank-line-short"></span>.
              </div>
              
              <!-- Signature Section -->
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-label">Sign of Doctor</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Updated controller to upload to Drive and return link
export const generateOPDCardController = async (req, res) => {
  try {
    // Generate the PDF
    const pdfBuffer = await generateOPDCard();

    // Define Google Drive folder ID
    const DRIVE_FOLDER_ID =
      process.env.DRIVE_FOLDER_ID || "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

    // Generate filename with timestamp
    const fileName = `Medical_Certificate_${Date.now()}.pdf`;

    // Upload to Google Drive
    const driveLink = await uploadToDrive(pdfBuffer, fileName, DRIVE_FOLDER_ID);

    // Return success response with Drive link
    res.status(200).json({
      success: true,
      message: "Medical Certificate generated and uploaded successfully",
      fileName: fileName,
      driveLink: driveLink,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Medical Certificate generation/upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate or upload medical certificate",
      error: error.message,
    });
  }
};
