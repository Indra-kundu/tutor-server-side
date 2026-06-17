const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config()
const uri = process.env.MONGODB_URI;
const app = express()

const PORT = process.env.PORT;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db("edubridge")
        const tutorCollection = db.collection("tutors")

        app.get('/tutor', async (req, res) => {
            const result = await tutorCollection.find().toArray();
            res.json(result);
        });


        app.post('/tutor', async (req, res) => {
            const tutorData = req.body
            console.log(tutorData)
            const result = await tutorCollection.insertOne(tutorData)
            res.json(result)
        })

        app.get('/tutor/:id', async (req, res) => {
            const { id } = req.params;
            try {
                // আইডিটি বৈধ ObjectId কি না তা চেক করা
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: "Invalid ID format" });
                }

                const result = await tutorCollection.findOne({ _id: new ObjectId(id) });

                if (!result) {
                    return res.status(404).json({ error: "Tutor not found" });
                }

                res.json(result);
            } catch (error) {
                res.status(500).json({ error: "Server error" });
            }
        });


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Server is running fine")
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})