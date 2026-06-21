const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { betterAuth } = require("better-auth");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config()
const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization;
    console.log(authHeader)
    if (!authHeader) {
        return res.status(401).json({ message: 'unauthorized' });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }


    try {
        const { payload } = await jwtVerify(token, JWKS);
        // console.log(payload);
        next();
    } catch (error) {
        console.log(error);
        return res.status(403).json({ message: "Forbidden" });
    }

};


async function run() {
    try {
        // await client.connect();

        const db = client.db("edubridge");
        const tutorCollection = db.collection("tutors");
        const bookingCollection = db.collection("bookings");


        app.get('/tutors-top', async (req, res) => {
            const result = await tutorCollection.find().limit(6).toArray();
            res.send(result);
        });


        app.get('/my-tutors/:email', verifyToken, async (req, res) => {
            const { email } = req.params;
            const result = await tutorCollection.find({ userEmail: email }).toArray();
            res.json(result);
        });

        app.put('/update-tutor/:id', async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            const result = await tutorCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );
            res.json(result);
        });

        app.delete('/delete-tutor/:id', verifyToken, async (req, res) => {
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


        app.get('/booking/:userId', verifyToken, async (req, res) => {
            const { userId } = req.params;
            const result = await bookingCollection.find({ userId: userId }).toArray();
            res.json(result);

        });




        app.post('/booking', verifyToken, async (req, res) => {
            const bookingData = req.body;
            const tutorId = bookingData.tutorId;

            const tutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });

            if (!tutor || tutor.totalSlot <= 0) {
                return res.status(400).json({ error: "No available slots left." });
            }

            const newBooking = {
                ...bookingData,
                status: "Pending",
                createdAt: new Date()
            };

            const result = await bookingCollection.insertOne(newBooking);

            await tutorCollection.updateOne(
                { _id: new ObjectId(tutorId) },
                { $inc: { totalSlot: -1 } }
            );

            res.json(result);
        });

        app.delete('/booking/:bookingId', verifyToken, async (req, res) => {
            const { bookingId } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });

            res.json(result);

        });

        app.get('/tutor/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });
            const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
            // console.log(result);
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