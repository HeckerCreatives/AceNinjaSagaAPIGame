const Transaction = require("../models/Transaction")
const Characterwallet = require("../models/Characterwallet")
const PurchaseReceipt = require("../models/Googleplay")
const { default: mongoose } = require("mongoose")
const { z } = require("zod");
const {createAndroidPublisherClient, verifyInapp, verifySub, getCatalogItem } = require("../utils/googleplay")
const androidpublisher = createAndroidPublisherClient();

exports.createTransaction = async (req, res) => {

    const { id, username } = req.user

    const { transactionId, amount, method, currency, items } = req.body

    if(!id){
        return res.status(400).json({ message: "failed", data: "Unauthorized! Please login to the right account." })
    }

    if(!transactionId || !amount || !method || !currency ){
        return res.status(400).json({ message: "failed", data: "No transaction data." })
    }

    if(!items && items.length === 0){
        return res.status(400).json({ message: "failed", data: "No transaction data." })      
    }

    await Transaction.create({
        owner: id,
        transactionId: transactionId,
        amount: amount,
        method: method,
        currency: currency,
        items: items
    })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered when creating transaction for user: ${username}. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later"})
    })

    return res.status(200).json({ message: "success"})
}

exports.completeTransaction = async (req, res) => {
    const { id } = req.user

    const { status, transactionId, items, characterid } = req.body
    
    if(!transactionId){
        return res.status(400).json({ message: "failed", data: "There's no transaction details found."})
    }
    
    if(status === 'completed'){

        if(!transactionId || !items || !characterid){
            return res.status(400).json({ message: "failed", data: "There's no transaction/user details found."})
        }
        
        const findTransaction = await Transaction.findOne({ transactionId: transactionId})
        
        if(!findTransaction){
            return res.status(400).json({ message: "bad-request", data: "Transaction does not exists."})
        } else {
            await Transaction.findOneAndUpdate({ owner:  new mongoose.Types.ObjectId(id), transactionId: transactionId}, { $set: { status: "completed"}})
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem encountered while updating transaction. Error: ${err}`)
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
            })

            for (const item of items) {
                const { type, quantity, price } = item;

                if (!type || !quantity || !price) {
                    return res.status(400).json({ message: "failed", data: "Invalid item data provided." });
                }
                const totalAmount = quantity * price;

                await Characterwallet.findOneAndUpdate(
                    { owner: characterid, type },
                    { $inc: { amount: totalAmount } }, 
                )
                .then(data => data)
                .catch(err => {
                    console.log(`There's a problem encountered while updating character wallet. Error: ${err}`)
                    
                    return res.status(400).json({
                        message: "bad-request",
                        data: `Character wallet not found for type: ${type}`,
                    });            
                })

            }
            
            return res.status(200).json({ message: "success"})
        }
    } else {
        await Transaction.findOneAndUpdate({ owner: new mongoose.Types.ObjectId(id), transactionId: transactionId}, { $set: { status: "failed"}})
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem while updating transaction status: failed. Error: ${err}`)
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
        })

        return res.status(200).json({ message: "success"})
    }
}

exports.monitorTransaction = async (req, res) => {
    
    const { id } = req.user

    const { transactionId } = req.query


    if(!id || !transactionId){
        return res.status(400).json({ message: "No user ID and transaction ID found."})
    }
    const transactionData = await Transaction.findOne({ transactionId: transactionId, owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching transaction data. Error ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })


    const data = {
        transactionId: transactionData.transactionId,
        amount: transactionData.amount,
        status: transactionData.status,
        items: transactionData.items,
        date: transactionData.createdAt
    }


    return res.status(200).json({ message: "success", data: data })
}

exports.getusertransactions = async (req, res) => {

    const { id } = req.query

    if(!id){
        return res.status(400).json({ message: "failed", data: "Please input user ID."})
    }
    const transactionData = await Transaction.find({ owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching user transaction data. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const data = []

    transactionData.forEach(temp => {
        data.push({
            id: temp._id,
            transactionId: temp.transactionId,
            amount: temp.number,
            method: temp.method,
            currency: temp.currency,
            status: temp.status,
            items: temp.items,
            date: temp.createdAt
        })
    })

    return res.status(200).json({ message: "success", data: data})
}


//  #region GOOGLE PLAY

const VerifySchema = z.object({
  event: z.literal("purchase_update"),
  data: z.object({
    productType: z.enum(["inapp", "subs"]),
    purchases: z.array(z.object({
      orderId: z.string().optional(),
      purchaseToken: z.string(),
      products: z.array(z.string()).min(1),
      purchaseState: z.number().optional(),
      isAcknowledged: z.boolean().optional(),
      purchaseTime: z.number().optional(),
      originalJson: z.string(),     // contains packageName + productId
      signature: z.string().optional(),
    })).min(1),
  }),
  // add characterid here if you send it alongside
  characterid: z.string().optional(),
});

exports.googleplaycreatetransaction = async (req, res) => {
    const {id, username} = req.user

    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const purchase = parsed.data.data.purchases[0];

    // ✅ productType is here
    const productType = parsed.data.data.productType;

    // ✅ purchaseToken is here
    const purchaseToken = purchase.purchaseToken;

    // ✅ productId can be derived from products[0]
    const productId = purchase.products[0];

    // ✅ packageName is inside originalJson
    let packageName;
    let original;
    try {
    original = JSON.parse(purchase.originalJson);
    packageName = original.packageName;
    } catch (e) {
    return res.status(400).json({ success: false, message: "Invalid originalJson" });
    }

    if (!packageName) {
    return res.status(400).json({ success: false, message: "Missing packageName in originalJson" });
    }

    // characterid (if you send it)
    const characterid = parsed.data.characterid;
    
    

    if (productType === "inapp") {
        if (!productId) return res.status(400).json({ ok: false, error: "productId_required_for_inapp" });

        const item = getCatalogItem(productId);
        if (!item || item.type !== "inapp") return res.status(400).json({ ok: false, error: "unknown_product" });
    }

    const existing = await PurchaseReceipt.findOne({ purchaseToken }).lean();
    if (existing?.status === "granted") {
        return res.json({
            ok: true,
            status: "already_granted",
            finalizeMode: existing.grant?.finalizeMode || "consume",
            grant: existing.grant?.payload || existing.grant,
        });
    }
    if (existing?.status === "rejected") {
        return res.status(409).json({ ok: false, status: "rejected", error: existing.lastError || "rejected" });
    }

    let receipt;
    try {
        receipt = await PurchaseReceipt.findOneAndUpdate(
        { purchaseToken },
        {
            $setOnInsert: {
            userId: id,
            packageName,
            productType,
            productId: productId || "",
            status: "received",
            },
        },
        { new: true, upsert: true }
        );
    } catch (e) {
        // In race conditions, one request wins; re-read
        receipt = await PurchaseReceipt.findOne({ purchaseToken });
    }

    // Optional: prevent token being used by a different userId
    if (receipt.userId !== id) {
        await PurchaseReceipt.updateOne(
        { purchaseToken },
        { $set: { status: "rejected", lastError: "token_user_mismatch" } }
        );
        return res.status(409).json({ ok: false, error: "token_user_mismatch" });
    }


    // 3) Verify with Google
    let googleData;
    try {
        if (productType === "inapp") {
            googleData = await verifyInapp(androidpublisher, { packageName, productId, purchaseToken });
            // ProductPurchase fields: purchaseState, consumptionState, acknowledgementState, etc. :contentReference[oaicite:5]{index=5}
            const purchaseState = googleData.purchaseState; // 0 purchased, 1 canceled, 2 pending (common)
            if (purchaseState !== 0) throw new Error(`inapp_not_purchased_state_${purchaseState}`);
        } else {
            googleData = await verifySub(androidpublisher, { packageName, purchaseToken });
            // SubscriptionPurchaseV2 has multiple states; you’ll check entitlement here. :contentReference[oaicite:6]{index=6}
            // Minimal safe check: must have a current entitlement / not expired.
            // NOTE: exact fields vary; we store the full payload and you can harden checks.
            // We'll do a defensive check that it returned something meaningful.
            if (!googleData) throw new Error("subs_empty_response");
        }

        await PurchaseReceipt.updateOne(
        { purchaseToken },
        { $set: { status: "verified", google: googleData } }
        );
    } catch (e) {
        await PurchaseReceipt.updateOne(
        { purchaseToken },
        { $set: { status: "rejected", lastError: String(e.message || e) } }
        );
        return res.status(400).json({ ok: false, error: "verification_failed", reason: String(e.message || e) });
    }

    // 4) Grant on backend (your DB is the truth)
    let grantPayload, finalizeMode;

    grantPayload = item.grant;
    finalizeMode = item.finalizeMode; // usually "consume" for credits

    const walletdata = await Characterwallet.findOneAndUpdate(
        { owner: characterid, type: "topupcredit" },
        { $inc: { amount: grantPayload.credits } }, 
    )
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while updating character wallet. Error: ${err}`)
        
        return res.status(400).json({
            message: "bad-request",
            data: `Character wallet not found for type: ${type}`,
        });            
    })

    await androidpublisher.purchases.products.consume({
        packageName,
        productId,
        token: purchaseToken,
    });

    const grantRecord = {
        finalizeMode,
        payload: grantPayload,
        grantedAt: new Date().toISOString(),
    };

    await PurchaseReceipt.updateOne(
        { purchaseToken },
        { $set: { status: "granted", grant: grantRecord } }
    );

    // 5) Return to client so it can ack/consume after backend grants
    return res.json({message: "success", data: walletdata.amount});
}

//  #endregion