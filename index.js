const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhpx3vr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const servicesCollection = client.db("bugShieldDB").collection("services");
    const bookingsCollection = client.db("bugShieldDB").collection("bookings");

    // get all data from services collection
    app.get("/services", async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get particular data from database
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });

    // create service
    app.post("/service", async (req, res) => {
      const newService = req.body;

      const result = await servicesCollection.insertOne(newService);
      res.send(result);
    });

    // update user's added service
    app.put("/service/:id", async (req, res) => {
      const id = req.params.id;
      const updatedService = req.body;

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const service = {
        $set: {
          serviceImage: updatedService.serviceImage,
          serviceName: updatedService.serviceName,
          price: updatedService.price,
          description: updatedService.description,
          serviceArea: updatedService.serviceArea,
        },
      };

      const result = await servicesCollection.updateOne(
        filter,
        service,
        options
      );
      res.send(result);
    });

    // delete user's added service
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });

    // get service data from database filtered by email
    app.get("/usersService", async (req, res) => {
      // console.log(req.query.email);

      let query = {};
      if (req.query?.email) {
        query = { serviceProviderEmail: req.query.email };
      }
      const result = await servicesCollection.find(query).toArray();
      res.send(result);
    });

    // booking related apis
    // create booking
    app.post("/booking", async (req, res) => {
      const newBooking = req.body;

      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    // get booking data from database filtered by email
    app.get("/usersBooking", async (req, res) => {
      // console.log(req.query.email);

      let query = {};
      if (req.query?.email) {
        query = { userEmail: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // user's services booking by other users
    app.get("/otherUsersBooking", async (req, res) => {
      // console.log(req.query.email);

      let query = {};
      if (req.query?.email) {
        query = { serviceProviderEmail: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("bug shield server is running");
});

app.listen(port, () => {
  console.log(`bug shield server is running on port: ${port}`);
});
