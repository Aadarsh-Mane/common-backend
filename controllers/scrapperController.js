import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// CSV CONVERSION FUNCTIONS
export const convertJsonToCsv = (jsonData, filename = "medicines_data.csv") => {
  try {
    const medicines = jsonData.medicines || [];

    if (!medicines || medicines.length === 0) {
      console.log("❌ No medicines data found in JSON");
      return;
    }

    // Define CSV headers
    const headers = [
      "Name",
      "Manufacturer",
      "MRP",
      "Package Info",
      "Composition",
      "Letter",
      "Page",
      "Scraped At",
    ];

    // Create CSV content
    let csvContent = headers.join(",") + "\n";

    // Add each medicine as a row
    medicines.forEach((medicine) => {
      const row = [
        `"${(medicine.name || "").replace(/"/g, '""')}"`,
        `"${(medicine.manufacturer || "").replace(/"/g, '""')}"`,
        `"${(medicine.mrp || "").replace(/"/g, '""')}"`,
        `"${(medicine.packageInfo || "").replace(/"/g, '""')}"`,
        `"${(medicine.composition || "").replace(/"/g, '""')}"`,
        `"${medicine.letter || ""}"`,
        `"${medicine.page || ""}"`,
        `"${medicine.scrapedAt || ""}"`,
      ];
      csvContent += row.join(",") + "\n";
    });

    // Save to local file
    const csvPath = path.join(process.cwd(), filename);
    fs.writeFileSync(csvPath, csvContent, "utf8");

    console.log(`✅ CSV file saved successfully!`);
    console.log(`📁 File location: ${csvPath}`);
    console.log(`📊 Total records: ${medicines.length}`);
    console.log(
      `💾 File size: ${(csvContent.length / 1024 / 1024).toFixed(2)} MB`
    );

    return csvPath;
  } catch (error) {
    console.error("❌ Error converting JSON to CSV:", error.message);
    throw error;
  }
};

export const convertJsonToCsvAdvanced = (jsonData, options = {}) => {
  try {
    const {
      filename = "medicines_data_advanced.csv",
      includeIndex = true,
      includeSummary = true,
    } = options;

    const medicines = jsonData.medicines || [];
    const summary = jsonData.summary || {};

    if (!medicines || medicines.length === 0) {
      console.log("❌ No medicines data found in JSON");
      return;
    }

    // Define CSV headers with optional index
    const headers = [
      ...(includeIndex ? ["Index"] : []),
      "Medicine Name",
      "Manufacturer",
      "MRP",
      "Package Information",
      "Composition",
      "Letter Category",
      "Page Number",
      "Scraped Date",
      "Scraped Time",
    ];

    let csvContent = "";

    // Add summary information as comments if requested
    if (includeSummary && summary) {
      csvContent += `# Medicine Data Export\n`;
      csvContent += `# Total Letters: ${summary.totalLetters || "N/A"}\n`;
      csvContent += `# Completed Letters: ${
        summary.completedLetters || "N/A"
      }\n`;
      csvContent += `# Total Medicines: ${
        summary.totalMedicines || medicines.length
      }\n`;
      csvContent += `# Export Date: ${new Date().toISOString()}\n`;
      csvContent += `#\n`;
    }

    // Add headers
    csvContent += headers.join(",") + "\n";

    // Add each medicine as a row
    medicines.forEach((medicine, index) => {
      // Parse scraped date for better formatting
      const scrapedDate = medicine.scrapedAt
        ? new Date(medicine.scrapedAt)
        : null;
      const dateStr = scrapedDate
        ? scrapedDate.toISOString().split("T")[0]
        : "";
      const timeStr = scrapedDate
        ? scrapedDate.toISOString().split("T")[1].split(".")[0]
        : "";

      const row = [
        ...(includeIndex ? [index + 1] : []),
        `"${(medicine.name || "Not Available").replace(/"/g, '""')}"`,
        `"${(medicine.manufacturer || "Not Available").replace(/"/g, '""')}"`,
        `"${(medicine.mrp || "Not Available").replace(/"/g, '""')}"`,
        `"${(medicine.packageInfo || "Not Available").replace(/"/g, '""')}"`,
        `"${(medicine.composition || "Not Available").replace(/"/g, '""')}"`,
        `"${(medicine.letter || "").toUpperCase()}"`,
        `"${medicine.page || ""}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
      ];
      csvContent += row.join(",") + "\n";
    });

    // Save to local file
    const csvPath = path.join(process.cwd(), filename);
    fs.writeFileSync(csvPath, csvContent, "utf8");

    // Create summary stats
    const stats = {
      totalRecords: medicines.length,
      fileSizeMB: (csvContent.length / 1024 / 1024).toFixed(2),
      letters: [...new Set(medicines.map((m) => m.letter))].sort(),
      manufacturerCount: [...new Set(medicines.map((m) => m.manufacturer))]
        .length,
    };

    console.log(`✅ Advanced CSV file saved successfully!`);
    console.log(`📁 File location: ${csvPath}`);
    console.log(`📊 Total records: ${stats.totalRecords}`);
    console.log(`💾 File size: ${stats.fileSizeMB} MB`);
    console.log(`🔤 Letters included: ${stats.letters.join(", ")}`);
    console.log(`🏭 Unique manufacturers: ${stats.manufacturerCount}`);

    return {
      path: csvPath,
      stats: stats,
    };
  } catch (error) {
    console.error("❌ Error converting JSON to CSV:", error.message);
    throw error;
  }
};

// MAIN SCRAPER FUNCTION WITH AUTOMATIC CSV EXPORT
export const scrapeAllMedicinesJSON = async (req, res) => {
  let browser;
  const allMedicines = [];
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const summary = {
    totalLetters: 26,
    completedLetters: 0,
    totalMedicines: 0,
    letterBreakdown: [],
  };

  try {
    console.log("🚀 Starting A-Z medicine scraping for JSON response...");

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Process each letter A-Z
    for (let letterIndex = 0; letterIndex < letters.length; letterIndex++) {
      const letter = letters[letterIndex];
      let letterMedicines = [];

      try {
        console.log(
          `\n📝 Processing letter: ${letter.toUpperCase()} (${
            letterIndex + 1
          }/26)`
        );

        // Get total pages for this letter
        const firstPageUrl = `https://www.1mg.com/drugs-all-medicines?label=${letter}`;
        await page.goto(firstPageUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const totalPages = await page.evaluate(() => {
          const resultInfo = document.querySelector('[class*="result-info"]');
          if (resultInfo) {
            const text = resultInfo.textContent;
            const match = text.match(/of\s+(\d+)\s+results/);
            if (match) {
              const totalResults = parseInt(match[1]);
              return Math.ceil(totalResults / 30);
            }
          }
          return 1;
        });

        console.log(`   📄 Found ${totalPages} pages for letter ${letter}`);

        // Scrape all pages for this letter
        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
          try {
            console.log(`   🔄 Scraping page ${currentPage}/${totalPages}`);

            const url = `https://www.1mg.com/drugs-all-medicines?label=${letter}&page=${currentPage}`;
            await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Extract medicines from current page
            const medicines = await page.evaluate(() => {
              const results = [];
              const cards = document.querySelectorAll(
                ".style__product-card___1gbex"
              );

              // Helper function for improved manufacturer extraction
              const extractManufacturer = (card, leafTexts) => {
                // Method 1: Try direct CSS selectors first
                const manufacturerSelectors = [
                  ".style__manufacturer___1wE9Q",
                  ".style__flex-column___1zNVy .style__padding-bottom-5px___2NrDR:nth-child(2)",
                  ".style__flex-column___1zNVy div:nth-child(2)",
                ];

                for (const selector of manufacturerSelectors) {
                  const element = card.querySelector(selector);
                  if (element && element.textContent.trim()) {
                    return element.textContent.trim();
                  }
                }

                // Method 2: Enhanced pattern matching
                const companyIndicators = [
                  "Ltd",
                  "Pvt",
                  "Pharmaceuticals",
                  "Pharma",
                  "Inc",
                  "Corporation",
                  "Corp",
                  "Healthcare",
                  "Biotech",
                  "Life Sciences",
                  "Labs",
                  "Laboratories",
                  "Industries",
                  "Company",
                  "Co.",
                  "International",
                  "Global",
                  "Drugs",
                  "Wellness",
                  "Limited",
                  "Private",
                ];

                const knownCompanies = [
                  "Johnson & Johnson",
                  "Pfizer",
                  "Novartis",
                  "Abbott",
                  "GSK",
                  "Merck",
                  "Bayer",
                  "Himalaya",
                  "Dabur",
                  "Patanjali",
                  "Zydus",
                  "Lupin",
                  "Cadila",
                  "Alkem",
                  "Mankind",
                  "Intas",
                  "Torrent",
                  "Glenmark",
                  "Ranbaxy",
                  "Wockhardt",
                  "Biocon",
                  "Hetero",
                  "Emcure",
                ];

                // Check for known companies first
                for (const text of leafTexts) {
                  for (const company of knownCompanies) {
                    if (
                      text.toLowerCase().includes(company.toLowerCase()) &&
                      !text.includes("₹") &&
                      text.length < 100
                    ) {
                      return text;
                    }
                  }
                }

                // Check for company indicators
                for (const text of leafTexts) {
                  for (const indicator of companyIndicators) {
                    if (
                      text.includes(indicator) &&
                      !text.includes("₹") &&
                      text.length < 100 &&
                      text.length > 3
                    ) {
                      return text;
                    }
                  }
                }

                // Method 3: Smart fallback - look for company-like text
                const filteredTexts = leafTexts.filter(
                  (text) =>
                    !text.includes("₹") &&
                    !text.includes("MRP") &&
                    !text.includes("Prescription") &&
                    !text.includes("ADD") &&
                    !text.includes("strip of") &&
                    !text.includes("vial of") &&
                    !text.includes("bottle of") &&
                    !text.includes("Injection") &&
                    !text.includes("Capsule") &&
                    !text.includes("Tablet") &&
                    text.length > 5 &&
                    text.length < 80
                );

                // Look for text that starts with capital and looks like company name
                for (const text of filteredTexts) {
                  if (
                    /^[A-Z]/.test(text) &&
                    !text.includes("(") &&
                    !text.includes("mg") &&
                    !text.includes("ml")
                  ) {
                    return text;
                  }
                }

                return "Not found";
              };

              cards.forEach((card) => {
                try {
                  let medicineName = "";
                  let manufacturer = "";
                  let mrp = "";
                  let packageInfo = "";
                  let composition = "";

                  const allDivs = card.querySelectorAll("div");
                  const leafTexts = [];

                  // Get text from leaf elements
                  allDivs.forEach((div) => {
                    if (
                      div.children.length === 0 ||
                      (div.children.length === 1 &&
                        div.children[0].tagName === "SPAN")
                    ) {
                      const text = div.textContent.trim();
                      if (text && text.length > 2 && text.length < 150) {
                        leafTexts.push(text);
                      }
                    }
                  });

                  // Extract medicine name (existing logic)
                  for (const text of leafTexts) {
                    if (
                      (text.includes("mg") || text.includes("ml")) &&
                      (text.includes("Injection") ||
                        text.includes("Capsule") ||
                        text.includes("Tablet") ||
                        text.includes("Syrup")) &&
                      !text.includes("₹") &&
                      !text.includes("MRP")
                    ) {
                      medicineName = text;
                      break;
                    }
                  }

                  if (!medicineName) {
                    for (const text of leafTexts) {
                      if (
                        text.length > 10 &&
                        text.length < 80 &&
                        !text.includes("₹") &&
                        !text.includes("MRP") &&
                        !text.includes("Prescription") &&
                        !text.includes("ADD") &&
                        !text.includes("Ltd") &&
                        !text.includes("Pvt")
                      ) {
                        medicineName = text;
                        break;
                      }
                    }
                  }

                  // IMPROVED MANUFACTURER EXTRACTION
                  manufacturer = extractManufacturer(card, leafTexts);

                  // Extract MRP (existing logic)
                  for (const text of leafTexts) {
                    if (text.includes("₹") && text.length < 20) {
                      mrp = text;
                      break;
                    }
                  }

                  // Extract package info (existing logic)
                  for (const text of leafTexts) {
                    if (
                      (text.includes("strip") ||
                        text.includes("vial") ||
                        text.includes("bottle") ||
                        text.includes("tablet") ||
                        text.includes("capsule") ||
                        text.includes("syringe") ||
                        text.includes("ml") ||
                        text.includes("prefilled")) &&
                      !text.includes("₹") &&
                      !text.includes("Ltd") &&
                      text.length < 80
                    ) {
                      packageInfo = text;
                      break;
                    }
                  }

                  // Extract composition (existing logic)
                  for (const text of leafTexts) {
                    if (
                      (text.includes("(") && text.includes(")")) ||
                      (text.includes("mg") &&
                        !text.includes("Injection") &&
                        !text.includes("Capsule") &&
                        !text.includes("Tablet")) ||
                      text.includes("mcg")
                    ) {
                      if (
                        !text.includes("₹") &&
                        !text.includes("Ltd") &&
                        text.length < 100
                      ) {
                        composition = text;
                        break;
                      }
                    }
                  }

                  if (medicineName && medicineName.length > 3) {
                    results.push({
                      name: medicineName,
                      manufacturer: manufacturer,
                      mrp: mrp || "Not found",
                      packageInfo: packageInfo || "Not found",
                      composition: composition || "Not found",
                    });
                  }
                } catch (e) {
                  console.log(`Error processing card:`, e.message);
                }
              });

              return results;
            });

            // Add medicines to letter collection
            const medicinesWithMetadata = medicines.map((medicine) => ({
              ...medicine,
              letter: letter,
              page: currentPage,
              scrapedAt: new Date().toISOString(),
            }));

            letterMedicines.push(...medicinesWithMetadata);

            console.log(
              `   ✅ Page ${currentPage}: Found ${medicines.length} medicines`
            );

            // Small delay between pages
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } catch (pageError) {
            console.error(
              `   ❌ Error on page ${currentPage}:`,
              pageError.message
            );
          }
        }

        // Add letter medicines to main collection
        allMedicines.push(...letterMedicines);

        // Update summary
        summary.completedLetters++;
        summary.totalMedicines += letterMedicines.length;
        summary.letterBreakdown.push({
          letter: letter,
          totalPages: totalPages,
          medicinesCount: letterMedicines.length,
        });

        console.log(
          `✅ Completed letter ${letter.toUpperCase()}: ${
            letterMedicines.length
          } medicines (Total: ${summary.totalMedicines})`
        );

        // Small delay between letters
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (letterError) {
        console.error(
          `❌ Error processing letter ${letter}:`,
          letterError.message
        );
        summary.letterBreakdown.push({
          letter: letter,
          error: letterError.message,
          medicinesCount: 0,
        });
      }
    }

    await browser.close();

    console.log(`\n🎉 SCRAPING COMPLETED!`);
    console.log(`📊 Total medicines scraped: ${summary.totalMedicines}`);
    console.log(`📝 All 26 letters processed`);

    // Prepare final JSON data
    const finalJsonData = {
      success: true,
      summary: summary,
      scrapedAt: new Date().toISOString(),
      medicines: allMedicines,
    };

    // 🆕 AUTOMATICALLY CREATE CSV FILE
    try {
      console.log(`\n📄 Creating CSV file...`);

      const csvResult = convertJsonToCsvAdvanced(finalJsonData, {
        filename: `medicines_complete_${
          new Date().toISOString().split("T")[0]
        }.csv`,
        includeIndex: true,
        includeSummary: true,
      });

      console.log(`✅ CSV file created: ${csvResult.path}`);

      // Add CSV info to response
      finalJsonData.csvExport = {
        created: true,
        filePath: csvResult.path,
        stats: csvResult.stats,
      };
    } catch (csvError) {
      console.error(`❌ CSV creation failed:`, csvError.message);
      finalJsonData.csvExport = {
        created: false,
        error: csvError.message,
      };
    }

    // Return complete JSON response
    res.status(200).json(finalJsonData);
  } catch (error) {
    if (browser) await browser.close();
    console.error("❌ Critical error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to scrape medicines",
      message: error.message,
      summary: summary,
      medicines: allMedicines,
    });
  }
};

// MANUAL CSV CREATION ENDPOINT
export const createCsvFromJson = async (req, res) => {
  try {
    const jsonData = req.body;

    if (!jsonData || !jsonData.medicines) {
      return res.status(400).json({
        success: false,
        error: "No valid medicine data provided",
      });
    }

    // Create CSV
    const csvResult = convertJsonToCsvAdvanced(jsonData, {
      filename: `medicines_manual_export_${Date.now()}.csv`,
      includeIndex: true,
      includeSummary: true,
    });

    res.status(200).json({
      success: true,
      message: "CSV file created successfully",
      csvFile: csvResult.path,
      stats: csvResult.stats,
      originalDataCount: jsonData.medicines.length,
    });
  } catch (error) {
    console.error("Error creating CSV:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create CSV",
      message: error.message,
    });
  }
};
