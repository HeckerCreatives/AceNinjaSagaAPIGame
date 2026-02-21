
const { google } = require("googleapis");

function createAndroidPublisherClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH, // path to service-account.json
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  return google.androidpublisher({ version: "v3", auth });
}

const PRODUCT_CATALOG = {
  // INAPP (consumable credits)
  starter_credit_pack: { type: "inapp", grant: { credits: 10 }, finalizeMode: "consume" },basic_credit_pack:   { type: "inapp", grant: { credits: 55 }, finalizeMode: "consume" },advance_credit_pack:   { type: "inapp", grant: { credits: 110 }, finalizeMode: "consume" },elite_credit_pack:   { type: "inapp", grant: { credits: 230 }, finalizeMode: "consume" },master_credit_pack:   { type: "inapp", grant: { credits: 600 }, finalizeMode: "consume" },legendary_credit_pack:   { type: "inapp", grant: { credits: 1400 }, finalizeMode: "consume" }
};

function getCatalogItem(productId) {
  return PRODUCT_CATALOG[productId] || null;
}

async function verifyInapp(androidpublisher, { packageName, productId, purchaseToken }) {
  const res = await androidpublisher.purchases.products.get({
    packageName,
    productId,
    token: purchaseToken,
  });

  return res.data; // ProductPurchase
}

async function verifySub(androidpublisher, { packageName, purchaseToken }) {
  const res = await androidpublisher.purchases.subscriptionsv2.get({
    packageName,
    token: purchaseToken,
  });

  return res.data; // SubscriptionPurchaseV2
}

module.exports = {createAndroidPublisherClient, getCatalogItem, verifyInapp, verifySub}