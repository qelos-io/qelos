import { Readable, PassThrough } from "stream";
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import sharp from "sharp";
import { handleImageOptimization } from "../services/image-optimizer.ts";
import logger from "../services/logger.js";

// --- Configuration ---
const TEST_IMAGE_PATH = 'test-image.jpg';
const OUTPUT_DIR = 'test-output'; // Directory to write optimized images
// ---------------------

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fsPromises.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    logger.error(`[SETUP ERROR] Failed to create output directory: ${OUTPUT_DIR}`);
    process.exit(1);
  }
}

// ---------- Test runner ----------
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
    this.currentSuite = "";
    this.startTime = Date.now();
  }

  describe(name, fn) {
    this.currentSuite = name;
    logger.log(`\n[TEST SUITE] ${name}`);
    logger.log("-".repeat(80));
    fn();
  }

  it(description, fn) {
    this.tests.push({ 
      description, 
      fn, 
      suite: this.currentSuite 
    });
  }
  
  async run() {
    logger.log("=".repeat(80));
    logger.log("HANDLE IMAGE OPTIMIZATION TESTS");
    logger.log("=".repeat(80));

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i];
      const testNumber = `${i + 1}/${this.tests.length}`;
      
      logger.log(`\n[TEST ${testNumber}] ${test.description}`);
      logger.log(`Suite: ${test.suite}`);
      const testStart = Date.now();

      try {
        await test.fn();
        const duration = Date.now() - testStart;
        this.passed++;
        logger.log(`[PASS] Test completed successfully (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - testStart;
        this.failed++;
        logger.log(`[FAIL] Test failed (${duration}ms)`);
        logger.log(`Error: ${error.message}`);
      }

      logger.log("-".repeat(80));
    }

    const totalDuration = Date.now() - this.startTime;
    logger.log("\n" + "=".repeat(80));
    logger.log(`Total tests: ${this.tests.length}`);
    logger.log(`Passed: ${this.passed}`);
    logger.log(`Failed: ${this.failed}`);
    logger.log(`Total duration: ${totalDuration}ms`);
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`);
    },
    toBeDefined() {
      if (value === undefined) throw new Error(`Expected value to be defined`);
    },
    toBeGreaterThan(expected) {
      if (value <= expected) throw new Error(`Expected ${value} > ${expected}`);
    },
    toBeLessThan(expected) {
      if (value >= expected) throw new Error(`Expected ${value} < ${expected}`);
    },
    toBeCloseTo(expected, tolerance = 0.01) {
      if (Math.abs(value - expected) > tolerance) {
        throw new Error(`Expected ${value} to be close to ${expected} (tolerance ${tolerance})`);
      }
    }
  };
}

function Buffer_isBuffer(value) {
  return Buffer.isBuffer(value);
}

// ---------- Test data setup ----------
let testFileBuffer;
let originalFileSize = 0;

async function setup() {
  logger.log("[SETUP] Reading test image from file system...");
  await ensureOutputDir();

  try {
    testFileBuffer = await fsPromises.readFile(TEST_IMAGE_PATH);
    originalFileSize = testFileBuffer.length;
    logger.log(`[SETUP] File read successfully. Size: ${originalFileSize} bytes.`);

    const metadata = await sharp(testFileBuffer).metadata();
    logger.log(`[SETUP] Image format: ${metadata.format}`);
  } catch (error) {
    logger.error(`[SETUP ERROR] Failed to read ${TEST_IMAGE_PATH}. Please ensure the file exists!`);
    logger.error(error.message);
    process.exit(1);
  }
}

// Helper: write buffer to file for debugging
async function writeOutput(buffer, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  await fsPromises.writeFile(filePath, buffer);
  logger.log(`[OUTPUT] Image written to ${filePath}`);
}

// ---------- Tests ----------
const runner = new TestRunner();

runner.describe("handleImageOptimization - Buffer input", () => {
  runner.it("should skip optimization when disabled and return the original buffer", async () => {
    const storage = { imageOptimization: { enabled: false, quality: 80, formats: ['jpeg','jpg','png','webp','gif'] } };
    const result = await handleImageOptimization(storage, testFileBuffer, "jpeg");
    
    expect(result).toBe(testFileBuffer); 
    expect(result.length).toBe(originalFileSize);

    await writeOutput(result, "buffer-skipped.jpeg");
  });

  runner.it("should optimize Buffer input when enabled (expect size reduction)", async () => {
    const storage = { imageOptimization: { enabled: true, quality: 60, formats: ['jpeg','jpg','png','webp','gif'] } };
    const inputBufferCopy = Buffer.from(testFileBuffer);
    
    const result = await handleImageOptimization(storage, inputBufferCopy, "jpeg");
    
    expect(Buffer_isBuffer(result)).toBe(true);
    expect(result.length).toBeLessThan(originalFileSize);
    expect(result.length).toBeGreaterThan(1);

    await writeOutput(result, "buffer-optimized.jpeg");
  });
});

runner.describe("handleImageOptimization - Stream input", () => {
  runner.it("should optimize Stream input when enabled", async () => {
    const storage = { imageOptimization: { enabled: true, quality: 60, formats: ['jpeg','jpg','png','webp','gif'] } };
    const stream = Readable.from(testFileBuffer);
    
    const result = await handleImageOptimization(storage, stream, "jpeg");
    
    expect(Buffer_isBuffer(result)).toBe(true);
    expect(result.length).toBeLessThan(originalFileSize);
    expect(result.length).toBeGreaterThan(1);

    await writeOutput(result, "stream-optimized.jpeg");
  });

  runner.it("should skip optimization when disabled for stream and return a new buffer", async () => {
    const storage = { imageOptimization: { enabled: false, quality: 80, formats: ['jpeg','jpg','png','webp','gif'] } };
    const stream = Readable.from(testFileBuffer);

    const result = await handleImageOptimization(storage, stream, "jpeg");

    expect(Buffer_isBuffer(result)).toBe(true);
    expect(result !== testFileBuffer).toBe(true);

    await writeOutput(result, "stream-skipped.jpeg");
  });
});

// ---------- Run ----------
(async () => {
  await setup();
  await runner.run();
})();
