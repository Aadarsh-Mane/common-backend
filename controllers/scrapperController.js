import puppeteer from "puppeteer";
// import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";

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

// Controller function to scrape Havells products

// Controller function to scrape Havells products with pagination
export const getProducts = async (req, res) => {
  try {
    // Set headers to mimic a real browser and avoid detection
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    };

    const baseUrl = "https://havells.com/products/bestseller";

    // Method 1: Using Puppeteer (Recommended for dynamic content)
    const allProducts = await scrapeAllPagesWithPuppeteer(baseUrl);

    // Method 2: Using Axios + Cheerio (Alternative, faster but may miss dynamic content)
    // const allProducts = await scrapeAllPagesWithAxios(baseUrl, headers);

    // Save all products to JSON file
    await saveProductsToJson(allProducts);

    res.status(200).json({
      success: true,
      count: allProducts.length,
      message: `Scraped ${allProducts.length} products and saved to havells_products.json`,
      data: allProducts,
    });
  } catch (error) {
    console.error("Error scraping products:", error);
    res.status(500).json({
      success: false,
      message: "Error scraping products",
      error: error.message,
    });
  }
};

// Function to scrape all pages with pagination using Puppeteer
const scrapeAllPagesWithPuppeteer = async (baseUrl) => {
  let browser;
  let allProducts = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set extra headers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    });

    // Start from page 1
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const url =
          currentPage === 1 ? baseUrl : `${baseUrl}/index/?p=${currentPage}`;
        console.log(`Scraping page ${currentPage}: ${url}`);

        // Navigate to the current page
        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Wait for products to load
        try {
          await page.waitForSelector(
            "li.item.product.product-item.brand_Havells",
            { timeout: 10000 }
          );
        } catch (e) {
          console.log(
            `No products found on page ${currentPage}, stopping pagination`
          );
          break;
        }

        // Extract product data from current page
        const pageProducts = await page.evaluate(() => {
          const productItems = document.querySelectorAll(
            "li.item.product.product-item.brand_Havells"
          );
          const productData = [];

          productItems.forEach((item, index) => {
            try {
              // Extract product image
              const imageElement = item.querySelector(
                "img.product-image-photo"
              );
              const imageUrl = imageElement
                ? imageElement.src || imageElement.getAttribute("data-src")
                : null;
              const imageAlt = imageElement ? imageElement.alt : null;

              // Extract product title/name
              const titleElement = item.querySelector(
                ".product-item-link, .product-name a, h3 a, .product-item-name a"
              );
              const title = titleElement
                ? titleElement.textContent.trim()
                : null;
              const productUrl = titleElement ? titleElement.href : null;

              // Extract price information
              const priceElement = item.querySelector(
                ".price, .regular-price, .special-price"
              );
              const price = priceElement
                ? priceElement.textContent.trim()
                : null;

              // Extract MRP/original price
              const mrpElement = item.querySelector(
                '.old-price, .was-price, [class*="mrp"]'
              );
              const mrp = mrpElement ? mrpElement.textContent.trim() : null;

              // Extract discount from span.price (new requirement)
              const discountSpan = item.querySelector("span.price");
              const discountText = discountSpan
                ? discountSpan.textContent.trim()
                : null;

              // Also check for other discount elements
              const discountElement = item.querySelector(
                '.discount, .save-percent, [class*="off"]'
              );
              const discount = discountElement
                ? discountElement.textContent.trim()
                : discountText;

              // Extract product features/description
              const featuresElements = item.querySelectorAll(
                "ul li, .product-features li, .features li"
              );
              const features = Array.from(featuresElements).map((feature) =>
                feature.textContent.trim()
              );

              // Extract product ID or SKU if available
              const productId =
                item.getAttribute("data-product-id") ||
                item
                  .querySelector("[data-product-id]")
                  ?.getAttribute("data-product-id") ||
                null;

              // Extract rating if available
              const ratingElement = item.querySelector(
                '.rating, .stars, [class*="rating"]'
              );
              const rating = ratingElement
                ? ratingElement.textContent.trim()
                : null;

              // Extract availability
              const availabilityElement = item.querySelector(
                '.stock, .availability, [class*="stock"]'
              );
              const availability = availabilityElement
                ? availabilityElement.textContent.trim()
                : "Available";

              const product = {
                id: productId || `product_${Date.now()}_${index}`,
                title: title,
                imageUrl: imageUrl,
                imageAlt: imageAlt,
                price: price,
                mrp: mrp,
                discount: discount,
                discountText: discountText, // Specific discount from span.price
                features: features.length > 0 ? features : null,
                productUrl: productUrl,
                rating: rating,
                availability: availability,
                scrapedAt: new Date().toISOString(),
                page: window.location.href,
              };

              // Only add products with at least a title or image
              if (product.title || product.imageUrl) {
                productData.push(product);
              }
            } catch (error) {
              console.error(`Error extracting product ${index}:`, error);
            }
          });

          return productData;
        });

        if (pageProducts.length === 0) {
          console.log(
            `No products found on page ${currentPage}, stopping pagination`
          );
          break;
        }

        allProducts = allProducts.concat(pageProducts);
        console.log(
          `Found ${pageProducts.length} products on page ${currentPage}. Total: ${allProducts.length}`
        );

        // Check if there's a next page
        const hasNextPage = await page.evaluate(() => {
          const nextButton = document.querySelector(
            '.next, .action.next, a[title="Next"]'
          );
          const lastPageButton = document.querySelector(".last, .action.last");
          const currentPageElement = document.querySelector(
            ".current, .page.current"
          );

          // If there's a next button and it's not disabled
          if (nextButton && !nextButton.classList.contains("disabled")) {
            return true;
          }

          // Alternative check: look for pagination numbers
          const pageNumbers = document.querySelectorAll(
            ".page a, .pages-item-next, .action.next"
          );
          return pageNumbers.length > 0;
        });

        if (!hasNextPage) {
          console.log("No more pages found, stopping pagination");
          hasMorePages = false;
        } else {
          currentPage++;
          // Add delay between pages to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Safety check: don't scrape more than 50 pages
        if (currentPage > 50) {
          console.log("Reached maximum page limit (50), stopping");
          break;
        }
      } catch (error) {
        console.error(`Error scraping page ${currentPage}:`, error);
        // Try to continue with next page
        currentPage++;
        if (currentPage > 10) {
          // Stop if too many consecutive errors
          break;
        }
      }
    }

    return allProducts;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Alternative method using Axios + Cheerio with pagination
const scrapeAllPagesWithAxios = async (baseUrl, headers) => {
  let allProducts = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const url =
        currentPage === 1 ? baseUrl : `${baseUrl}/index/?p=${currentPage}`;
      console.log(`Scraping page ${currentPage}: ${url}`);

      const response = await axios.get(url, {
        headers,
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const pageProducts = [];

      $("li.item.product.product-item.brand_Havells").each((index, element) => {
        try {
          const $item = $(element);

          // Extract product image
          const $imageElement = $item.find("img.product-image-photo");
          const imageUrl =
            $imageElement.attr("src") || $imageElement.attr("data-src") || null;
          const imageAlt = $imageElement.attr("alt") || null;

          // Extract product title/name
          const $titleElement = $item
            .find(
              ".product-item-link, .product-name a, h3 a, .product-item-name a"
            )
            .first();
          const title = $titleElement.text().trim() || null;
          const productUrl = $titleElement.attr("href") || null;

          // Extract price information
          const price =
            $item
              .find(".price, .regular-price, .special-price")
              .first()
              .text()
              .trim() || null;

          // Extract MRP/original price
          const mrp =
            $item
              .find('.old-price, .was-price, [class*="mrp"]')
              .first()
              .text()
              .trim() || null;

          // Extract discount from span.price (new requirement)
          const discountText = $item.find("span.price").text().trim() || null;

          // Also check for other discount elements
          const discount =
            $item
              .find('.discount, .save-percent, [class*="off"]')
              .first()
              .text()
              .trim() || discountText;

          // Extract product features
          const features = [];
          $item
            .find("ul li, .product-features li, .features li")
            .each((i, feature) => {
              const featureText = $(feature).text().trim();
              if (featureText) {
                features.push(featureText);
              }
            });

          // Extract product ID
          const productId =
            $item.attr("data-product-id") ||
            $item.find("[data-product-id]").attr("data-product-id") ||
            `product_${Date.now()}_${index}`;

          const product = {
            id: productId,
            title: title,
            imageUrl: imageUrl,
            imageAlt: imageAlt,
            price: price,
            mrp: mrp,
            discount: discount,
            discountText: discountText, // Specific discount from span.price
            features: features.length > 0 ? features : null,
            productUrl: productUrl,
            scrapedAt: new Date().toISOString(),
            page: url,
          };

          // Only add products with at least a title or image
          if (product.title || product.imageUrl) {
            pageProducts.push(product);
          }
        } catch (error) {
          console.error(`Error extracting product ${index}:`, error);
        }
      });

      if (pageProducts.length === 0) {
        console.log(
          `No products found on page ${currentPage}, stopping pagination`
        );
        break;
      }

      allProducts = allProducts.concat(pageProducts);
      console.log(
        `Found ${pageProducts.length} products on page ${currentPage}. Total: ${allProducts.length}`
      );

      // Check if there's a next page
      const hasNextPage =
        $('.next, .action.next, a[title="Next"]').length > 0 &&
        !$('.next, .action.next, a[title="Next"]').hasClass("disabled");

      if (!hasNextPage) {
        console.log("No more pages found, stopping pagination");
        hasMorePages = false;
      } else {
        currentPage++;
        // Add delay between pages
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Safety check
      if (currentPage > 50) {
        console.log("Reached maximum page limit (50), stopping");
        break;
      }
    } catch (error) {
      console.error(`Error scraping page ${currentPage}:`, error);
      currentPage++;
      if (currentPage > 10) {
        break;
      }
    }
  }

  return allProducts;
};

// Function to save products data to JSON file
const saveProductsToJson = async (products) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `havells_products_seller_${timestamp}.json`;
    const filepath = path.join(process.cwd(), "data", filename);

    // Create data directory if it doesn't exist
    try {
      await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
    } catch (error) {
      // Directory already exists, ignore error
    }

    const dataToSave = {
      scrapeInfo: {
        totalProducts: products.length,
        scrapedAt: new Date().toISOString(),
        baseUrl: "https://havells.com/products/new",
        pages: [...new Set(products.map((p) => p.page))].length,
      },
      products: products,
    };

    await fs.writeFile(filepath, JSON.stringify(dataToSave, null, 2), "utf8");

    // Also save a latest copy
    const latestFilepath = path.join(
      process.cwd(),
      "data",
      "havells_products_seller_latest.json"
    );
    await fs.writeFile(
      latestFilepath,
      JSON.stringify(dataToSave, null, 2),
      "utf8"
    );

    console.log(`Products saved to: ${filepath}`);
    console.log(`Latest copy saved to: ${latestFilepath}`);

    return {
      filepath,
      latestFilepath,
      count: products.length,
    };
  } catch (error) {
    console.error("Error saving products to JSON:", error);
    throw error;
  }
};
export const getProductDetails = async (req, res) => {
  try {
    const { productUrl } = req.params;

    if (!productUrl) {
      return res.status(400).json({
        success: false,
        message: "Product URL is required",
      });
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };

    const response = await axios.get(productUrl, { headers });
    const $ = cheerio.load(response.data);

    const productDetails = {
      title: $(".page-title span, .product-title, h1").first().text().trim(),
      price: $(".price, .regular-price").first().text().trim(),
      description: $(".product-description, .description")
        .first()
        .text()
        .trim(),
      specifications: [],
      images: [],
    };

    // Extract specifications
    $(".product-specs li, .specifications li, .features li").each((i, spec) => {
      productDetails.specifications.push($(spec).text().trim());
    });

    // Extract additional images
    $(".product-images img, .gallery img").each((i, img) => {
      const imgSrc = $(img).attr("src") || $(img).attr("data-src");
      if (imgSrc) {
        productDetails.images.push(imgSrc);
      }
    });

    res.status(200).json({
      success: true,
      data: productDetails,
    });
  } catch (error) {
    console.error("Error getting product details:", error);
    res.status(500).json({
      success: false,
      message: "Error getting product details",
      error: error.message,
    });
  }
};

// Rate limiting and retry mechanism with JSON saving
export const getProductsWithRetry = async (req, res) => {
  const maxRetries = 3;
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000)); // Progressive delay
      return await getProducts(req, res);
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        return res.status(500).json({
          success: false,
          message: `Failed after ${maxRetries} attempts`,
          error: error.message,
        });
      }

      attempt++;
    }
  }
};

// Standalone function to scrape and save without Express response
export const scrapeAndSave = async () => {
  try {
    console.log("Starting Havells products scraping...");
    const baseUrl = "https://havells.com/products/new";

    const allProducts = await scrapeAllPagesWithPuppeteer(baseUrl);
    const savedInfo = await saveProductsToJson(allProducts);

    console.log(`\nScraping completed successfully!`);
    console.log(`Total products scraped: ${allProducts.length}`);
    console.log(`Data saved to: ${savedInfo.filepath}`);

    return {
      success: true,
      count: allProducts.length,
      savedInfo,
      products: allProducts,
    };
  } catch (error) {
    console.error("Error in scrapeAndSave:", error);
    throw error;
  }
};
