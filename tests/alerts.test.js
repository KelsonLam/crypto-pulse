import test from "node:test";
import assert from "node:assert/strict";
import { isAlertReached } from "../src/alerts.js";

const alert = { target: 100, direction: "above", currency: "usd", triggered: false };

test("a USD alert does not fire on EUR prices", () => {
  assert.equal(isAlertReached(alert, { current_price: 110 }, "eur"), false);
  assert.equal(isAlertReached(alert, { current_price: 110 }, "usd"), true);
});

test("targets include equality for both directions", () => {
  assert.equal(isAlertReached(alert, { current_price: 100 }, "usd"), true);
  assert.equal(isAlertReached({ ...alert, direction: "below" }, { current_price: 100 }, "usd"), true);
  assert.equal(isAlertReached(alert, { current_price: 99 }, "usd"), false);
});

test("unknown legacy currencies and already triggered alerts stay inactive", () => {
  assert.equal(isAlertReached({ ...alert, currency: undefined }, { current_price: 110 }, "usd"), false);
  assert.equal(isAlertReached({ ...alert, triggered: true }, { current_price: 110 }, "usd"), false);
});

test("missing and invalid prices cannot trigger an alert", () => {
  for (const coin of [undefined, { current_price: null }, { current_price: NaN }, { current_price: Infinity }]) {
    assert.equal(isAlertReached(alert, coin, "usd"), false);
  }
});
