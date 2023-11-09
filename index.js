const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhpx3vr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// our middlewares
const logger = (req, res, next) => {
  console.log("log: info", req.method, req.url);

  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("token in the middleware: ", token);

  // no token available
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const servicesCollection = client.db("bugShieldDB").collection("services");
    const bookingsCollection = client.db("bugShieldDB").collection("bookings");

    // auth related api
    // create cookie
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token: ", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // clear cookie
    app.post("/logOut", async (req, res) => {
      const user = req.body;
      console.log("logging user: ", user);
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // service related apis
    // get all data from services collection
    app.get("/services", async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get particular data from database
    app.get("/services/:id", logger, verifyToken, async (req, res) => {
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
    app.put("/service/:id", logger, async (req, res) => {
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
    app.delete("/service/:id", logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });

    // get service data from database filtered by email
    app.get("/usersService", logger, verifyToken, async (req, res) => {
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
    app.get("/usersBooking", logger, async (req, res) => {
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

    // update booking infos
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      console.log(updatedBooking);

      const updateDoc = {
        $set: {
          status: updatedBooking,
        },
      };

      const result = await bookingsCollection.updateOne(filter, updateDoc);
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
