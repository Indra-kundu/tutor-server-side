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


        const tutorCollection = db.collection("tutors");
        const bookingCollection = db.collection("bookings");


        // index.js
        app.get('/tutors-top', async (req, res) => {
            // limit(6) মানে মাত্র ৬টি ডেটা আসবে
            const result = await tutorCollection.find().limit(6).toArray();
            res.send(result);
        });


        // ১. লগড-ইন ইউজারের নিজস্ব টিউটরগুলো দেখার জন্য (My Tutors Page)
        app.get('/my-tutors/:email', async (req, res) => {
            const { email } = req.params;
            const result = await tutorCollection.find({ userEmail: email }).toArray();
            res.json(result);
        });

        // ২. টিউটর আপডেট করার জন্য (Edit Functionality)
        app.put('/update-tutor/:id', async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            const result = await tutorCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );
            res.json(result);
        });

        // ৩. টিউটর ডিলিট করার জন্য (Delete Functionality)
        app.delete('/delete-tutor/:id', async (req, res) => {
            const { id } = req.params;
            const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });

        app.get('/tutor', async (req, res) => {
            const result = await tutorCollection.find().toArray();
            res.json(result);
        });

        app.post('/tutor', async (req, res) => {
            const tutorData = req.body;

            if (!tutorData.userEmail) {
                return res.status(400).json({ error: "userEmail is required!" });
            }
            const result = await tutorCollection.insertOne(tutorData);
            res.json(result);
        });


        app.get('/booking/:userId', async (req, res) => {
            const { userId } = req.params;
            const result = await bookingCollection.find({ userId: userId }).toArray();
            res.json(result);

        });




        app.post('/booking', async (req, res) => {
            const bookingData = req.body;
            const tutorId = bookingData.tutorId;

            // ১. টিউটর খুঁজে স্লট চেক করুন
            const tutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });

            if (!tutor || tutor.totalSlot <= 0) {
                return res.status(400).json({ error: "No available slots left." });
            }

            // ২. বুকিং ডেটাতে স্ট্যাটাস যোগ করুন
            const newBooking = {
                ...bookingData,
                status: "Pending", // অটো-জেনারেটেড স্ট্যাটাস
                createdAt: new Date()
            };

            // ৩. বুকিং সেভ করুন
            const result = await bookingCollection.insertOne(newBooking);

            // ৪. টিউটরের স্লট ১ কমিয়ে দিন
            await tutorCollection.updateOne(
                { _id: new ObjectId(tutorId) },
                { $inc: { totalSlot: -1 } }
            );

            res.json(result);
        });

        app.delete('/booking/:bookingId', async (req, res) => {
            const { bookingId } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });

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