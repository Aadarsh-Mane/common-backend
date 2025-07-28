import express from "express";
import { connectDB } from "./dbConnect.js";
import userRouter from "./routes/users.js";
import receiptionRouter from "./routes/reception.js";
import doctorRouter from "./routes/doctor.js";
import patientRouter from "./routes/patient.js";
import puppeteer from "puppeteer";
import nurseRouter from "./routes/nurse.js";
import cors from "cors";
import labRouter from "./routes/lab.js";
import { getPatientHistory } from "./controllers/doctorController.js";
import { getFcmToken } from "./controllers/notifyController.js";
import { auth } from "./middleware/auth.js";
import { Server } from "socket.io";
import http from "http";
import { socketHandler } from "./socketHandler.js";
import fs from "fs";
import adminRouter from "./routes/admin.js";
import investigateRouter from "./routes/investigation.js";
import pharmaRouter from "./routes/pharma.js";
import chatRouter from "./routes/chats.js";
import masterRouter from "./routes/master.js";
import * as cheerio from "cheerio";
import scrapeRouter from "./routes/scrape.js";
import medicineRoutes from "./routes/search.js";
import { addPatientRecord } from "./controllers/admin/adminController.js";
import {
  batchUpdateCounters,
  getAllPatientCounters,
  getNextCounterValue,
  resetPatientCounter,
  updatePatientCounter,
} from "./controllers/counterController.js";

const port = 5001;

//hello saideep v3
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Configure this based on your frontend URL in production
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Initialize socket handler
socketHandler(io);

app.use(express.json());
app.use(cors());
connectDB();
app.use("/users", userRouter);
app.use("/patient", patientRouter);
app.use("/reception", receiptionRouter);
app.use("/admin", adminRouter);
app.use("/doctors", doctorRouter);
app.use("/nurse", nurseRouter);
app.use("/master", masterRouter);
app.use("/scrape", scrapeRouter); // Endpoint to get FCM token
app.use("/chat", chatRouter); // Add chat routes
app.use("/api/medicines", medicineRoutes);

app.use("/labs", labRouter);
app.use("/investigate", investigateRouter);
app.use("/pharma", pharmaRouter);
app.get("/patientHistory/:patientId", getPatientHistory);

app.get("/", (req, res) => {
  return res
    .status(200)
    .json("Welcome to Ai in HealthCare common backend v3.5");
});
let medicines = {};
fs.readFile("./test.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading JSON file:", err);
    return;
  }
  medicines = JSON.parse(data);
});

// Endpoint for search suggestions
app.get("/search", (req, res) => {
  const query = req.query.q?.toLowerCase(); // Get the query parameter
  const limit = parseInt(req.query.limit) || 3; // Get the limit parameter, default to 1 if not provided

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  // Filter medicines based on query
  const suggestions = Object.values(medicines).filter((medicine) =>
    medicine.toLowerCase().includes(query)
  );

  // Apply the limit to the number of suggestions
  const limitedSuggestions = suggestions.slice(0, limit);

  res.json({ suggestions: limitedSuggestions });
});
app.get("/socket-status", (req, res) => {
  const connectedClients = io.engine.clientsCount;
  res.status(200).json({
    success: true,
    message: "Socket.IO is running",
    connectedClients,
    timestamp: new Date().toISOString(),
  });
});
export const scrapeMedicinesMultiPage = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const letter = req.query.letter || "a";
    const startPage = parseInt(req.query.start_page) || 1;
    const endPage = parseInt(req.query.end_page) || 3;
    const maxPages = Math.min(endPage - startPage + 1, 10); // Limit to 10 pages max

    console.log(
      `Scraping pages ${startPage} to ${endPage} for letter: ${letter}`
    );

    const allMedicines = [];
    const pageResults = [];

    for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
      try {
        console.log(`Scraping page ${currentPage}...`);

        const url = `https://www.1mg.com/drugs-all-medicines?label=${letter}&page=${currentPage}`;

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const medicines = await page.evaluate(() => {
          const results = [];
          const cards = document.querySelectorAll(
            ".style__product-card___1gbex"
          );

          cards.forEach((card, index) => {
            try {
              let medicineName = "";
              let manufacturer = "";
              let mrp = "";
              let packageInfo = "";
              let composition = "";

              const allDivs = card.querySelectorAll("div");
              const leafTexts = [];

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

              // Extract medicine name
              for (const text of leafTexts) {
                if (
                  (text.includes("mg") || text.includes("ml")) &&
                  (text.includes("Injection") ||
                    text.includes("Capsule") ||
                    text.includes("Tablet") ||
                    text.includes("Syrup")) &&
                  !text.includes("₹") &&
                  !text.includes("MRP") &&
                  !text.includes("strip") &&
                  !text.includes("vial")
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

              // Extract manufacturer
              for (const text of leafTexts) {
                if (
                  (text.includes("Ltd") ||
                    text.includes("Pvt") ||
                    text.includes("Pharmaceuticals") ||
                    text.includes("Inc")) &&
                  !text.includes("₹") &&
                  text.length < 100
                ) {
                  manufacturer = text;
                  break;
                }
              }

              // Extract MRP
              for (const text of leafTexts) {
                if (text.includes("₹") && text.length < 20) {
                  mrp = text;
                  break;
                }
              }

              // Extract package info
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

              // Extract composition
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
                  manufacturer: manufacturer || "Not found",
                  mrp: mrp || "Not found",
                  packageInfo: packageInfo || "Not found",
                  composition: composition || "Not found",
                  scrapedAt: new Date().toISOString(),
                });
              }
            } catch (e) {
              console.log(`Error processing card ${index}:`, e.message);
            }
          });

          return results;
        });

        pageResults.push({
          page: currentPage,
          count: medicines.length,
          medicines: medicines,
        });

        allMedicines.push(...medicines);

        console.log(`Page ${currentPage}: Found ${medicines.length} medicines`);

        // Add delay between pages to avoid getting blocked
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error scraping page ${currentPage}:`, error.message);
        pageResults.push({
          page: currentPage,
          error: error.message,
          count: 0,
          medicines: [],
        });
      }
    }

    await browser.close();

    res.status(200).json({
      success: true,
      letter: letter,
      pages_scraped: `${startPage}-${endPage}`,
      total_medicines: allMedicines.length,
      page_results: pageResults,
      all_medicines: allMedicines,
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Multi-page scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape multiple pages",
      message: error.message,
    });
  }
};
export const getPaginationInfo = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const letter = req.query.letter || "a";
    const url = `https://www.1mg.com/drugs-all-medicines?label=${letter}`;

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const paginationInfo = await page.evaluate(() => {
      // Look for pagination information
      const resultInfo = document.querySelector('[class*="result-info"]');
      const paginationElement = document.querySelector('[class*="pagination"]');

      let totalResults = 0;
      let totalPages = 0;
      let currentPage = 1;

      // Extract total results from "Showing 1-30 of 10000 results" text
      if (resultInfo) {
        const text = resultInfo.textContent;
        const match = text.match(/of\s+(\d+)\s+results/);
        if (match) {
          totalResults = parseInt(match[1]);
          totalPages = Math.ceil(totalResults / 30); // Assuming 30 results per page
        }
      }

      // Look for pagination links
      const pageLinks = document.querySelectorAll(
        '[class*="pagination"] a, [class*="page"] a'
      );
      const pageNumbers = [];

      pageLinks.forEach((link) => {
        const pageNum = parseInt(link.textContent);
        if (!isNaN(pageNum)) {
          pageNumbers.push(pageNum);
        }
      });

      if (pageNumbers.length > 0) {
        totalPages = Math.max(...pageNumbers);
      }

      return {
        totalResults,
        totalPages,
        currentPage,
        hasNextPage: totalPages > 1,
        resultsPerPage: 30,
      };
    });

    await browser.close();

    res.status(200).json({
      success: true,
      letter: letter,
      pagination: paginationInfo,
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Pagination info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get pagination info",
      message: error.message,
    });
  }
};
export const scrapeVideoContent = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = "https://www.pornhub.org";

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
        message: "Please provide a URL in query params or request body",
      });
    }

    console.log(`Loading: ${url}`);

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const videos = await page.evaluate(() => {
      const results = [];

      // Find video containers with class "positionRelative singleVideo"
      const videoContainers = document.querySelectorAll(
        '.positionRelative.singleVideo, [class*="singleVideo"], [class*="positionRelative"]'
      );

      console.log(`Found ${videoContainers.length} video containers`);

      videoContainers.forEach((container, index) => {
        try {
          let videoData = {
            index: index,
            thumbnail: "",
            previewHref: "",
            duration: "",
            videoTitle: "",
            videoId: "",
            posterUrl: "",
            webmUrl: "",
            mp4Url: "",
            viewKey: "",
          };

          // Extract thumbnail image
          const thumbnailImg = container.querySelector(
            'img[class*="videoThumb"], img[src*="thumbnail"], img[alt*="thumbnail"]'
          );
          if (thumbnailImg) {
            videoData.thumbnail =
              thumbnailImg.getAttribute("src") ||
              thumbnailImg.getAttribute("data-src");
          }

          // Extract preview link and href
          const previewLink = container.querySelector(
            'a[class*="js-pop"], a[href*="view_video"], a[data-video-id]'
          );
          if (previewLink) {
            videoData.previewHref = previewLink.getAttribute("href");
            videoData.videoId = previewLink.getAttribute("data-video-id");

            // Extract view key from href
            const hrefMatch = videoData.previewHref?.match(/viewkey=([^&]+)/);
            if (hrefMatch) {
              videoData.viewKey = hrefMatch[1];
            }
          }

          // Extract video URLs from data attributes
          const videoElement = container.querySelector(
            "[data-webm], [data-poster]"
          );
          if (videoElement) {
            videoData.webmUrl = videoElement.getAttribute("data-webm");
            videoData.posterUrl = videoElement.getAttribute("data-poster");
          }

          // Extract duration
          const durationElement = container.querySelector(
            '[class*="duration"], [class*="time"], .bgEffect.time'
          );
          if (durationElement) {
            videoData.duration = durationElement.textContent.trim();
          }

          // Extract video title/name from various possible locations
          const titleSelectors = [
            "img[alt]",
            '[class*="title"]',
            "a[title]",
            "[data-title]",
          ];

          for (const selector of titleSelectors) {
            const titleElement = container.querySelector(selector);
            if (titleElement && !videoData.videoTitle) {
              videoData.videoTitle =
                titleElement.getAttribute("alt") ||
                titleElement.getAttribute("title") ||
                titleElement.getAttribute("data-title") ||
                titleElement.textContent.trim();
              break;
            }
          }

          // Extract additional metadata
          const allAttributes = {};
          if (previewLink) {
            for (let attr of previewLink.attributes) {
              if (attr.name.startsWith("data-")) {
                allAttributes[attr.name] = attr.value;
              }
            }
          }

          videoData.additionalData = allAttributes;

          // Only add if we found meaningful data
          if (
            videoData.thumbnail ||
            videoData.previewHref ||
            videoData.duration ||
            videoData.videoTitle
          ) {
            results.push(videoData);
          }
        } catch (e) {
          console.log(`Error processing video container ${index}:`, e.message);
        }
      });

      return results;
    });

    await browser.close();

    console.log(`Successfully scraped ${videos.length} videos`);

    res.status(200).json({
      success: true,
      count: videos.length,
      data: videos,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Video scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape video data",
      message: error.message,
    });
  }
};

// Scraper specifically for the HTML structure you showed
export const scrapeSpecificVideoFormat = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = req.query.url || req.body.url;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const videos = await page.evaluate(() => {
      const results = [];

      // Target the specific structure from your HTML
      const videoLinks = document.querySelectorAll(
        "a.js-pop.js-popUnder.imageLink.js-flipbookOn.js-videoPreview"
      );

      videoLinks.forEach((link, index) => {
        try {
          const videoData = {
            index: index + 1,
            previewHref: link.getAttribute("href"),
            videoId: link.getAttribute("data-video-id"),
            webmUrl: link.getAttribute("data-webm"),
            posterUrl: link.getAttribute("data-poster"),
            viewKey: "",
            thumbnail: "",
            duration: "",
            videoTitle: "",
          };

          // Extract viewkey from href
          if (videoData.previewHref) {
            const viewKeyMatch = videoData.previewHref.match(/viewkey=([^&]+)/);
            if (viewKeyMatch) {
              videoData.viewKey = viewKeyMatch[1];
            }
          }

          // Find thumbnail image within this link
          const thumbnailImg = link.querySelector(
            'img.videoThumb, img[class*="videoThumb"]'
          );
          if (thumbnailImg) {
            videoData.thumbnail =
              thumbnailImg.getAttribute("src") ||
              thumbnailImg.getAttribute("data-src");
            videoData.videoTitle = thumbnailImg.getAttribute("alt") || "";
          }

          // Find duration in nearby elements
          const parentContainer = link.closest("div");
          if (parentContainer) {
            const durationElement = parentContainer.querySelector(
              '.duration, [class*="duration"], .bgEffect.time, [class*="time"]'
            );
            if (durationElement) {
              videoData.duration = durationElement.textContent.trim();
            }
          }

          // Clean up the video title
          if (videoData.videoTitle) {
            videoData.videoTitle = videoData.videoTitle
              .replace(/^\s*"/, "")
              .replace(/"\s*$/, "")
              .trim();
          }

          results.push(videoData);
        } catch (e) {
          console.log(`Error processing video ${index}:`, e.message);
        }
      });

      return results;
    });

    await browser.close();

    res.status(200).json({
      success: true,
      count: videos.length,
      data: videos,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Specific video scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape video data",
      message: error.message,
    });
  }
};
export const logHTMLContent = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Use appropriate URL for testing
    const url = "https://www.pornhub.org";

    await page.goto(url, { waitUntil: "networkidle2" });

    const htmlContent = await page.content();
    console.log("HTML Content:", htmlContent.substring(0, 2000));

    res.json({
      success: true,
      htmlLength: htmlContent.length,
      sampleHTML: htmlContent.substring(0, 2000),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
};
export const scrapeMarketersLinks = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const pageNumber = req.query.pageNumber || 1;
    const url = `https://www.1mg.com/marketers?pageNumber=${pageNumber}`;

    console.log(`Loading: ${url}`);

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const links = await page.evaluate(() => {
      const results = [];

      // Get all anchor tags
      const allLinks = document.querySelectorAll("a");

      allLinks.forEach((link, index) => {
        try {
          const href = link.getAttribute("href");
          const text = link.textContent.trim();
          const classes = link.className;

          // Skip empty links
          if (href && text) {
            results.push({
              index: index + 1,
              href: href,
              text: text,
              classes: classes,
              isCompanyLink:
                text.includes("Pvt. Ltd") ||
                text.includes("Ltd") ||
                text.includes("Pharmaceuticals"),
              fullUrl: href.startsWith("http")
                ? href
                : `https://www.1mg.com${href}`,
            });
          }
        } catch (e) {
          console.log(`Error processing link ${index}:`, e.message);
        }
      });

      return results;
    });

    await browser.close();

    // Filter company links separately
    const companyLinks = links.filter((link) => link.isCompanyLink);

    console.log(
      `Successfully scraped ${links.length} total links, ${companyLinks.length} company links`
    );

    res.status(200).json({
      success: true,
      pageNumber: pageNumber,
      totalLinks: links.length,
      companyLinksCount: companyLinks.length,
      allLinks: links,
      companyLinks: companyLinks,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Marketers scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape marketers data",
      message: error.message,
    });
  }
};
export const scrapeAllMarketerNames = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const startPage = parseInt(req.query.startPage) || 1;
    const endPage = parseInt(req.query.endPage) || 5;

    console.log(
      `Scraping marketer names from pages ${startPage} to ${endPage}`
    );

    const allMarketers = [];
    const pageResults = [];

    for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
      try {
        console.log(`Scraping page ${currentPage}...`);

        const url = `https://www.1mg.com/marketers?pageNumber=${currentPage}`;

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const marketers = await page.evaluate(() => {
          const names = [];
          const links = document.querySelectorAll("a");

          links.forEach((link) => {
            const text = link.textContent.trim();

            // Identify marketer/company names
            if (
              text &&
              text.length > 5 &&
              text.length < 150 &&
              (text.includes("Ltd") ||
                text.includes("Pharmaceuticals") ||
                text.includes("Healthcare") ||
                text.includes("Biotech") ||
                text.includes("Medical") ||
                text.includes("Life Sciences") ||
                text.includes("Pvt") ||
                text.includes("Inc") ||
                /^[A-Z][a-zA-Z\s&\-\.]+$/.test(text)) &&
              !text.includes("Hair Care") &&
              !text.includes("Piles and") &&
              !text.includes("Fungal") &&
              !text.includes("Obesity") &&
              !text.includes("Warts") &&
              !text.includes("Home") &&
              !text.includes("Search")
            ) {
              names.push({
                name: text,
                href: link.getAttribute("href"),
                fullUrl: link.getAttribute("href")
                  ? `https://www.1mg.com${link.getAttribute("href")}`
                  : null,
              });
            }
          });

          // Remove duplicates within page
          const uniqueNames = names.filter(
            (item, index, self) =>
              index === self.findIndex((t) => t.name === item.name)
          );

          return uniqueNames;
        });

        pageResults.push({
          page: currentPage,
          count: marketers.length,
          marketers: marketers,
        });

        allMarketers.push(...marketers);

        console.log(`Page ${currentPage}: Found ${marketers.length} marketers`);

        // Add delay between pages
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error scraping page ${currentPage}:`, error.message);
        pageResults.push({
          page: currentPage,
          error: error.message,
          count: 0,
          marketers: [],
        });
      }
    }

    await browser.close();

    // Remove duplicates across all pages
    const uniqueMarketers = allMarketers.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.name === item.name)
    );

    res.status(200).json({
      success: true,
      pages_scraped: `${startPage}-${endPage}`,
      total_unique_marketers: uniqueMarketers.length,
      total_with_duplicates: allMarketers.length,
      page_results: pageResults,
      all_marketers: uniqueMarketers,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Multi-page marketers scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape multiple marketer pages",
      message: error.message,
    });
  }
};
export const getHTMLAsJSON = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const pageNumber = req.query.pageNumber || 1;
    const url = `https://www.1mg.com/marketers?pageNumber=${pageNumber}`;

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const htmlContent = await page.content();
    const title = await page.title();

    await browser.close();

    // Also log to console
    console.log("=== HTML SAMPLE (first 3000 chars) ===");
    console.log(htmlContent.substring(0, 3000));
    console.log("=== END SAMPLE ===");

    res.json({
      success: true,
      url: url,
      pageTitle: title,
      htmlLength: htmlContent.length,
      htmlSample: htmlContent.substring(0, 3000), // First 3000 characters
      fullHTML: htmlContent, // Full HTML content
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("HTML JSON error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get HTML as JSON",
      message: error.message,
    });
  }
};
export const scrapeMarketersCorrect = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const pageNumber = req.query.pageNumber || 5;
    const url = `https://www.1mg.com/marketers?pageNumber=${pageNumber}`;

    console.log(`Loading: ${url}`);

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const marketers = await page.evaluate(() => {
      const results = [];

      // Target the exact structure: div.col-sm-3.col-xs-6.mar-B15 > a
      const marketerDivs = document.querySelectorAll(
        ".col-sm-3.col-xs-6.mar-B15"
      );

      marketerDivs.forEach((div, index) => {
        try {
          const link = div.querySelector("a");

          if (link) {
            const href = link.getAttribute("href");
            const marketerName = link.textContent.trim();

            // Only add if we have meaningful data
            if (marketerName && href) {
              results.push({
                index: index + 1,
                name: marketerName,
                href: href,
                fullUrl: `https://www.1mg.com${href}`,
                marketerId: href.split("/").pop(), // Extract ID from URL
              });
            }
          }
        } catch (e) {
          console.log(`Error processing marketer div ${index}:`, e.message);
        }
      });

      return results;
    });

    await browser.close();

    console.log(`Successfully scraped ${marketers.length} marketers`);

    res.status(200).json({
      success: true,
      pageNumber: pageNumber,
      count: marketers.length,
      marketers: marketers,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Marketers scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape marketers data",
      message: error.message,
    });
  }
};
app.post("/addPatientRecord", addPatientRecord);
app.get("/llm", scrapeMedicinesMultiPage);
app.get("/llm2", getPaginationInfo);
app.get("/vide", scrapeVideoContent);
// app.get("/video", logHTMLContent);
app.get("/video", scrapeMarketersCorrect);
app.get("/api/patient-counters", getAllPatientCounters);

app.get("/api/patient-counters/:counterType/next", getNextCounterValue);
app.put("/api/patient-counters/:counterType", updatePatientCounter);

app.post("/api/patient-counters/:counterType/reset", auth, resetPatientCounter);
app.put("/api/patient-counters/batch", batchUpdateCounters);

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
