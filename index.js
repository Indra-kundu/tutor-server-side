const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// BetterAuth ইমপোর্ট
const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { toNodeHandler } = require("better-auth/node");

dotenv.config()
const app = express()
const PORT = process.env.PORT || 5000; // পোর্ট না থাকলে ৫০০০ ডিফল্ট হবে

app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const db = client.db("edubridge");

        // BetterAuth কনফিগারেশন
        const auth = betterAuth({
            baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
            database: mongodbAdapter(db),
            emailAndPassword: {
                enabled: true,
            },
            socialProviders: {
                google: {
                    clientId: process.env.GOOGLE_CLIENTID || "",
                    clientSecret: process.env.GOOGLE_SECRET || "",
                },
            },
        });
        // BetterAuth রাউট হ্যান্ডলার (এটি সাইনআপ, সাইনইন সব হ্যান্ডেল করবে)
        app.all("/api/auth/:action", toNodeHandler(auth));
        const tutorCollection = db.collection("tutors");

        // --- আপনার আগের রাউটগুলো ---
        app.get('/tutor', async (req, res) => {
            const result = await tutorCollection.find().toArray();
            res.json(result);
        });

        app.post('/tutor', async (req, res) => {
            const tutorData = req.body;
            const result = await tutorCollection.insertOne(tutorData);
            res.json(result);
        });

        app.get('/tutor/:id', async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });
            const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
            res.json(result);
        });

        console.log("MongoDB Connected & Auth Initialized!");
    } catch (err) {
        console.error(err);
    }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send("Server is running fine"));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})