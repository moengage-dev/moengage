import assert from "node:assert/strict";
import { parseDeliveryQrPayload } from "../delivery-qr-parser.js";

function pass(name: string) {
  console.log(`  ✓ ${name}`);
}

function suite(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

const mockOrigin = "https://example.com";

suite("parseDeliveryQrPayload - Valid payloads", () => {
  assert.equal(parseDeliveryQrPayload("https://example.com/d/CODE-123", mockOrigin), "/d/CODE-123");
  pass("Valid same-origin full delivery URL");

  assert.equal(parseDeliveryQrPayload("https://moengage-qr.vercel.app/d/CODE-123", mockOrigin), "/d/CODE-123");
  pass("Valid configured Vercel origin URL");

  assert.equal(parseDeliveryQrPayload("/d/CODE-123", mockOrigin), "/d/CODE-123");
  pass("Valid relative /d/code");

  assert.equal(parseDeliveryQrPayload("CODE-123", mockOrigin), "/d/CODE-123");
  pass("Valid raw hyphenated delivery code");

  assert.equal(parseDeliveryQrPayload("   CODE-123   ", mockOrigin), "/d/CODE-123");
  pass("URL with surrounding whitespace");
});

suite("parseDeliveryQrPayload - Rejected payloads", () => {
  assert.equal(parseDeliveryQrPayload("/q/CODE-123", mockOrigin), null);
  pass("Consumer /q/code rejected");

  assert.equal(parseDeliveryQrPayload("https://malicious.com/d/CODE-123", mockOrigin), null);
  pass("External origin rejected");

  assert.equal(parseDeliveryQrPayload("javascript:alert(1)", mockOrigin), null);
  pass("javascript: scheme rejected");

  assert.equal(parseDeliveryQrPayload("data:text/html,<html>", mockOrigin), null);
  pass("data: scheme rejected");

  assert.equal(parseDeliveryQrPayload("", mockOrigin), null);
  assert.equal(parseDeliveryQrPayload("   ", mockOrigin), null);
  pass("Empty code rejected");

  assert.equal(parseDeliveryQrPayload("/d/../CODE", mockOrigin), null);
  assert.equal(parseDeliveryQrPayload("..", mockOrigin), null);
  assert.equal(parseDeliveryQrPayload("/d/%2e%2e", mockOrigin), null);
  pass("Path traversal rejected");

  assert.equal(parseDeliveryQrPayload("/d/CODE/extra", mockOrigin), null);
  pass("Multiple path segments rejected");

  assert.equal(parseDeliveryQrPayload("https://example.com/d/CODE?query=1#hash", mockOrigin), "/d/CODE");
  pass("Query string and hash behavior handled intentionally (discarded or properly ignored)");
});

console.log("\n✅ All delivery-qr-parser tests passed.\n");
