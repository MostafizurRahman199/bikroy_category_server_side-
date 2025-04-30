const dotenv = require("dotenv");
dotenv.config();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  CURSOR_FLAGS,
} = require("mongodb");
const SSLCommerzPayment = require("sslcommerz-lts");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ___________step 1___for jwt and cookies storage

var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// ___________step 2___for jwt and cookies storage
app.use(
  cors({
    origin: [
      "http://localhost:4173",
      "http://localhost:5173",
      "https://cafebarisal-by-mostafiz.netlify.app",
    ],

    methods: ["GET", "POST", "PUT", "DELETE"],

    credentials: true,
  })
);

app.use(express.json());

// ___________step 3___for jwt and cookies storage
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); // For text/plain payloads

// Middleware to parse incoming requests

// ________________________middle ware

const logger = async (req, res, next) => {
  console.log("Inside the logger");

  next();
};

// ___________step 5___for jwt and cookies storage

const verifyToken = async (req, res, next) => {
  // console.log("Inside verify token middleware");
  const token = req?.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  // verify the token
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorized Access" });
    } else {
      // console.log("Okay");
      req.user = decoded;
    }
    next();
  });
};

// Database connection

const uri = process.env.MONGO_URI;

// const uri = "mongodb://localhost:27017"

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });

    // Access the database and collections

    const db = client.db("cafeBarisal");
    const menuCollection = db.collection("menu");
    const userCollection = db.collection("users");
    const reviewCollection = db.collection("reviews");
    const cartCollection = db.collection("carts");
    const paymentCollection = db.collection("payments");

    console.log("Successfully connected to MongoDB!");

    // auth related APIS

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req?.user?.email;
      const user = await userCollection.findOne({ email });
      const isAdmin = user?.role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Access Denied" });
      }
      // console.log("Inside verify Admin");
      next();
    };

    // ___________step 4___for jwt and cookies storage

    app.post("/jwt", async (req, res) => {
      const email = req.body.email;
      const payload = { email }; // Create a payload object
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "5h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          // secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          // secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    // public route
    //menuPage
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find({}).toArray();
      res.send(result);
    });

    //public route
    //testimonialSlider
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });

    //
    //order page route
    //private route

    app.post("/cart", async (req, res) => {
      try {
        const cartItems = req.body;
        console.log(cartItems);
        const result = await cartCollection.insertOne(cartItems);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    //order page route
    //private route

    app.get("/cart/:email", async (req, res) => {
      try {
        const email = req.params.email;
        console.log(email);
        const result = await cartCollection
          .find({ userEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // UserCartHome page
    // private route
    app.delete("/cart/:id", async (req, res) => {
      try {
        const id = req.params.id;
        // console.log(id);
        const result = await cartCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // users related api
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const email = user?.email;
        const existingUser = await userCollection.findOne({ email });

        if (existingUser) {
          return res.send({ success: false, message: "User already exists" });
        }

        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // _________Admin related API

    //_______________________users related api

    // AllUsers.jsx
    //private route
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const users = await userCollection.find({}).toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // AllUsers.jsx
    //private route
    //admin
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await userCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // _____________update user role

    app.post("/role", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const data = req.body;
        console.log(data);
        const id = data.id;
        const role = data.role;

        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the user by ID
          { $set: { role: role } } // Update the role
        );

        console.log(result);
        res.send(result);
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }

      // res.send(true);
    });

    //ManageItem.jsx
    //admin route
    app.post(
      "/update-menu-item",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { _id, name, recipe, category, price, image, imageUrls } =
            req.body;

          // Log received data for debugging
          // console.log("Update Data Received:", req.body);

          // Build the update object dynamically
          const updateFields = {
            name,
            recipe,
            category,
            price: parseFloat(price), // Ensure price is stored as a number
          };

          // Conditionally add image or imageUrls to the update object
          if (image) {
            updateFields.image = image;
          }
          if (imageUrls && Array.isArray(imageUrls)) {
            updateFields.imageUrls = imageUrls;
          }

          const query = {
            $or: [
              { _id: new ObjectId(_id) }, // Match ObjectId
              { _id: _id }, // Match string id
            ],
          };

          // Update the menu item in the database
          const result = await menuCollection.updateOne(
            query, // Match the menu item by ID
            { $set: updateFields } // Update the specified fields
          );

          // Log the result for debugging
          // console.log("Update Result:", result);

          // Respond with the result
          if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Menu item updated successfully" });
          } else {
            res
              .status(404)
              .json({ message: "Menu item not found or no changes made" });
          }
        } catch (error) {
          console.error("Error updating menu item:", error);
          res.status(500).json({ message: "Failed to update menu item" });
        }
      }
    );

    // ____________get login user data from user db

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req?.params?.email;
        // console.log("cookies : _______" , req?.cookies?.token);
        // console.log("email : ______ ", email);

        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "forbidden access" });
        }
        if (email) {
          const result = await userCollection.findOne({ email });

          console.log(result);
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "User is not an admin" });
          }
        }
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });

    // AddMenuItem.jsx
    //admin route
    //private

    app.post(
      "/upload-menu-item",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { name, category, price, recipe, imageUrls } = req.body;

          // Create menu item object
          const menuItem = {
            name,
            category,
            price: parseFloat(price), // Ensure price is a number
            recipe,
            imageUrls,
            createdAt: new Date(),
          };
          console.log(menuItem);
          // Insert menu item into MongoDB
          const result = await menuCollection.insertOne(menuItem);

          if (result.acknowledged) {
            res.send(result);
          } else {
            res.status(500).json({ message: "Failed to add menu item." });
          }
        } catch (error) {
          console.error("Error uploading menu item:", error.message);
          res.status(500).json({ message: "Internal server error." });
        }
      }
    );

    // ManageMenuItem.jsx
    //private route
    //admin
    app.delete("/menu-item/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = {
          $or: [
            { _id: new ObjectId(id) }, // Match ObjectId
            { _id: id }, // Match string id
          ],
        };
        const result = await menuCollection.deleteOne(query);
        console.log(result);
        if (result.deletedCount > 0) {
          res.send(result);
        }
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    //____________ stripe payment intent

    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { totalPrice } = req.body;
        // console.log(totalPrice);

        // Validate totalPrice
        if (!totalPrice || totalPrice <= 0) {
          return res.status(400).send({ error: "Invalid total price" });
        }

        // // Create a PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalPrice * 100), // Convert to cents for USD
          currency: "usd",
          payment_method_types: ["card"], // Specify payment methods
        });

        // console.log(paymentIntent.client_secret);

        // Send client_secret to the client
        res.status(200).send({
          client_secret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating PaymentIntent:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.post("/payments", async (req, res) => {
      try {
        const payment = req.body;
        const paymentInsertResult = await paymentCollection.insertOne(payment);

        // delete each item from the card
        const query = {
          $or: [
            { _id: { $in: payment.cartIds.map((id) => new ObjectId(id)) } },
            { _id: { $in: payment.cartIds.map((id) => id) } },
          ],
        };

        const deleteResult = await cartCollection.deleteMany(query);

        console.log(result);
        res.send(paymentInsertResult.deleteResult);
      } catch (error) {
        console.error("Error creating PaymentIntent:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/payment-history/:email", verifyToken, async (req, res) => {
      try {
        const email = req?.params?.email;
        // console.log("cookies : _______" , req?.cookies?.token);
        // console.log("email : ______ ", email);

        console.log(email);
        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "forbidden access" });
        }
        if (email) {
          const result = await paymentCollection.find({ email }).toArray();

          // console.log(result)
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "error" });
          }
        }
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });

    //   try {
    //     const email = req?.params?.email;

    //     const menuCollection = db.collection("menu");
    //     const userCollection = db.collection("users");
    //     const reviewCollection = db.collection("reviews");
    //     const cartCollection = db.collection("carts");
    //     const paymentCollection  = db.collection("payments");

    //     // Ensure the email in the token matches the requested email
    //     if (req?.user?.email !== email) {
    //       return res.status(403).json({ success: false, message: "Forbidden access" });
    //     }

    //     // Access your database collections
    //     const paymentCount = await paymentCollection.countDocuments({});
    //     const userCount = await userCollection.countDocuments({});
    //     const menuCount = await menuCollection.countDocuments({});
    //     const orderCount = await paymentCollection.countDocuments({});

    //     // Aggregate revenue from paymentCollection
    //     const revenueResult = await paymentCollection
    //       .aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             totalRevenue: { $sum: { $toDouble: "$amount" } }, // Convert amount to double and sum it
    //           },
    //         },
    //       ])
    //       .toArray();
    //     const revenue = revenueResult[0]?.totalRevenue || 0;

    //     // Aggregate category-wise item counts from menuCollection
    //     const categoryCounts = await menuCollection
    //       .aggregate([
    //         {
    //           $group: {
    //             _id: "$category",
    //             count: { $sum: 1 }, // Count items per category
    //           },
    //         },
    //       ])
    //       .toArray();

    //       // below data from paymentCollection
    //       // where have itemId , use itemId to find it category from menuCollection
    //       // then menuCollection have price now final result will categorywise prize,
    //       // actually i want to  know which the amount / price categorywise that sold

    //       //paymentCollection data
    //       // {"_id":{"$oid":"67811b66006e4a48afb2165e"},"email":"mostafizurrahmanofficial2025@gmail.com","name":"Md. Mostafizur Rahman","amount":{"$numberDouble":"19.5"},"date":"2025-01-10T13:06:46.318Z","transactionId":"pi_3Qfhv82Mif9qfo6g0MoOQCWt","cartId":["677fd7d7dcacea695de9d6bb","677fd7d9dcacea695de9d6bc"],"itemId":["642c155b2c4774f05c36eeab","642c155b2c4774f05c36eea7"],"status":"pending"}

    //       //menuCollection data
    //       // {"_id":"642c155b2c4774f05c36eeaa","name":"Fire Fly Special","recipe":"Chargrilled fresh tuna steak (served medium rare) on classic Niçoise salad with French beans.","image":"https://cristianonew.ukrdevs.com/wp-content/uploads/2016/08/product-1-370x247.jpg","category":"salad","price":{"$numberDouble":"14.7"}}

    //     // Transform categoryCounts into a more readable format
    //     const categoryWiseCount = {};
    //     categoryCounts.forEach((category) => {
    //       categoryWiseCount[category._id] = category.count;
    //     });

    //     // Return the aggregated stats including revenue and category-wise counts
    //     res.status(200).json({
    //       paymentCount,
    //       userCount,
    //       menuCount,
    //       orderCount,
    //       revenue,
    //       categoryWiseCount, // Include category-wise counts in the response
    //     });
    //   } catch (error) {
    //     console.error("Error fetching admin stats:", error);
    //     res.status(500).json({ success: false, message: "Failed to retrieve admin stats" });
    //   }
    // });

    // app.get("/admin-stats/:email", verifyToken, async (req, res) => {
    //   try {
    //     const email = req?.params?.email;

    //     const menuCollection = db.collection("menu");
    //     const userCollection = db.collection("users");
    //     const paymentCollection = db.collection("payments");

    //     // Ensure the email in the token matches the requested email
    //     if (req?.user?.email !== email) {
    //       return res.status(403).json({ success: false, message: "Forbidden access" });
    //     }

    //     // Basic counts
    //     const paymentCount = await paymentCollection.countDocuments({});
    //     const userCount = await userCollection.countDocuments({});
    //     const menuCount = await menuCollection.countDocuments({});

    //     // Aggregate total revenue
    //     const revenueResult = await paymentCollection
    //       .aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             totalRevenue: { $sum: { $toDouble: "$amount" } },
    //           },
    //         },
    //       ])
    //       .toArray();
    //     const revenue = revenueResult[0]?.totalRevenue || 0;

    //     // Category-wise item counts from menuCollection
    //     const categoryCounts = await menuCollection
    //       .aggregate([
    //         {
    //           $group: {
    //             _id: "$category",
    //             count: { $sum: 1 },
    //           },
    //         },
    //       ])
    //       .toArray();

    //     const categoryWiseCount = {};
    //     categoryCounts.forEach((category) => {
    //       categoryWiseCount[category._id] = category.count;
    //     });

    //     // Calculate category-wise revenue
    //     const paymentData = await paymentCollection.find({}).toArray();

    //     const categoryWiseRevenue = {};

    //     for (const payment of paymentData) {
    //       const { itemIds } = payment;

    //       if (!itemIds || !itemIds.length) continue; // Skip if no itemIds

    //       // Convert itemIds to ObjectId format for querying
    //       //some id are store as ObjectId and some are string in data base
    //       //so I did twice also do it
    //       let objectIds = itemIds.map((id) => new ObjectId(id));
    //        objectIds = itemIds.map((id) => (id));

    //       // console.log(objectIds);

    //       // // Fetch menu items corresponding to itemIds
    //       const menuItems = await menuCollection.find({ _id: { $in: objectIds } }).toArray();
    //         // console.log(menuItems);

    //       // Process each menu item and calculate category-wise revenue
    //       menuItems.forEach((item) => {
    //         const category = item.category;
    //         console.log(category)
    //         const price = parseFloat(item.price.$numberDouble || item.price);

    //         if (!categoryWiseRevenue[category]) {
    //           categoryWiseRevenue[category] = 0;
    //         }

    //         categoryWiseRevenue[category] += price;
    //       });
    //     }

    //     // Response
    //     res.status(200).json({
    //       paymentCount,
    //       userCount,
    //       menuCount,
    //       revenue,
    //       categoryWiseCount,
    //       categoryWiseRevenue, // Include category-wise revenue in the response
    //     });
    //   } catch (error) {
    //     console.error("Error fetching admin stats:", error);
    //     res.status(500).json({ success: false, message: "Failed to retrieve admin stats" });
    //   }
    // });

    app.get("/admin-stats/:email", verifyToken, async (req, res) => {
      try {
        const email = req?.params?.email;

        const menuCollection = db.collection("menu");
        const userCollection = db.collection("users");
        const paymentCollection = db.collection("payments");

        // Ensure the email in the token matches the requested email
        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "Forbidden access" });
        }

        // Basic counts
        const paymentCount = await paymentCollection.countDocuments({});
        const userCount = await userCollection.countDocuments({});
        const menuCount = await menuCollection.countDocuments({});

        // Aggregate total revenue
        const revenueResult = await paymentCollection
          .aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $toDouble: "$amount" } },
              },
            },
          ])
          .toArray();
        const revenue = revenueResult[0]?.totalRevenue || 0;

        // Category-wise item counts from menuCollection
        const categoryCounts = await menuCollection
          .aggregate([
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const categoryWiseCount = categoryCounts.reduce(
          (acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
          },
          {}
        );

        // Calculate category-wise revenue using aggregation
        const categoryWiseRevenueArray = await paymentCollection
          .aggregate([
            {
              $lookup: {
                from: "menu",
                localField: "itemIds",
                foreignField: "_id",
                as: "menuItems",
              },
            },
            { $unwind: "$menuItems" }, // Deconstruct the menuItems array
            {
              $group: {
                _id: "$menuItems.category",
                totalRevenue: { $sum: { $toDouble: "$menuItems.price" } },
              },
            },
            {
              $project: {
                _id: 0,
                category: "$_id",
                totalRevenue: 1,
              },
            },
          ])
          .toArray();

        const categoryWiseRevenue = categoryWiseRevenueArray.reduce(
          (acc, { category, totalRevenue }) => {
            acc[category] = totalRevenue;
            return acc;
          },
          {}
        );

        // Response
        res.status(200).json({
          paymentCount,
          userCount,
          menuCount,
          revenue,
          categoryWiseCount,
          categoryWiseRevenue,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        res
          .status(500)
          .json({ success: false, message: "Failed to retrieve admin stats" });
      }
    });

    // AddReview.jsx page
    app.post("/reviews", verifyToken, async (req, res) => {
      try {
        const { name, rating, review, email } = req.body;

        // console.log("Review___________: ", name);
        // Insert review into the database
        const result = await reviewCollection.insertOne({
          name,
          rating: parseFloat(rating),
          details: review,
          date: new Date(),
          email,
        });

        // console.log(result);
        if (result.acknowledged) {
          res.status(201).send(result);
        }
      } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ message: "Failed to add review." });
      }
    });

    //______________________SSL Commerz Payment Gateway Integration


    const store_id = process.env.store_id;
    const store_passwd = process.env.store_passwd;
    const api_url = process.env.api_url;



    app.post("/create-ssl-payment", async (req, res) => {
      const paymentData = req.body;
      const { email, amount } = paymentData;

      // console.log('Email:', email, 'Amount:', amount);

      if (!email || !amount) {
        return res.status(400).json({ message: "Invalid payment data" });
      }

      const trxID = `REF${Date.now()}`;


      // step - 1
      const data = {
        store_id: store_id,
        store_passwd: store_passwd,
        total_amount: amount,
        currency: "BDT",
        tran_id: trxID,
        success_url: "https://cafebarisalserverside.vercel.app/success-payment",
        fail_url: "https://cafebarisal-by-mostafiz.netlify.app/fail-payment",
        cancel_url: "https://cafebarisal-by-mostafiz.netlify.app/cancel-payment",
        ipn_url: "https://cafebarisalserverside.vercel.app/ipn-payment",
        shipping_method: "Courier",
        product_name: "Product Name",
        product_category: "General",
        product_profile: "general",
        cus_name: email?.split("@")[0] || "Guest",
        cus_email: email,
        cus_add1: "Customer Address",
        cus_city: "City",
        cus_state: "State",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        ship_name: email?.split("@")[0] || "Guest",
        ship_add1: "Customer Address",
        ship_city: "City",
        ship_state: "State",
        ship_postcode: "1000",
        ship_country: "Bangladesh",
      };

      // console.log('Request Data:', data);

      try {

        // step - 2 make request on payment gateway url

        const response = await axios.post(api_url, data, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        // console.log('API Response:', response.data);


        // step - 3 get the url to redirect their
        // step - 4 in frontend go that url 
        const GatewayPageURL = response.data?.GatewayPageURL;
        if (GatewayPageURL) {
          // Save payment data to the database
          paymentData.transactionId = trxID;
          const result = await paymentCollection.insertOne(paymentData);
          return res.status(200).json({ redirectUrl: GatewayPageURL });
        } else {
          return res
            .status(400)
            .json({
              message: "Failed to initiate payment",
              error: response.data,
            });
        }
      } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res
          .status(500)
          .json({ message: "Internal server error", error: error.message });
      }
    });



// step -4 again validate payment by going their website
    app.post("/success-payment", async (req, res) => {
      try {
        const SSL_COMMERZ_VALIDATION_URL =
          "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";

        console.log("Body:", req.body);

        const { val_id } = req.body;

        if (!val_id) {
          return res.status(400).send("Validation ID is missing");
        }

        // Prepare request parameters for validation
        const params = {
          val_id: val_id,
          store_id: store_id,
          store_passwd: store_passwd,
          format: "json",
        };

        const response = await axios.get(SSL_COMMERZ_VALIDATION_URL, {
          params,
        });

        // console.log('Validation Response:', response.data);
        const tran_id = response.data?.tran_id;
        console.log(" tran_id : ", tran_id);

        if (response.data && response.data.status === "VALID") {
          const payment = await paymentCollection.updateOne(
            { transactionId: tran_id },
            { $set: { status: "success" } }
          );

          if (payment.modifiedCount > 0) {
            console.log("Payment successfully validated");

            // find updated payment
            const paymentFind = await paymentCollection.findOne({
              transactionId: tran_id,
            });

            console.log("Payment object : ", paymentFind);

            // find cart's id that payment done
            const query = {
              _id: {
                $in: paymentFind?.cartIds?.map((id) => new ObjectId(id)),
              },
            };

            console.log(query);

            const deleteResult = await cartCollection.deleteMany(query);

            console.log("deleted count : ", deleteResult?.deletedCount);

            if (deleteResult?.deletedCount > 0) {
              res.redirect("http://localhost:5173/dashboard/payment-history")
              // res.status(200).send("Payment successfully validated");
            }
          }
        } else {
          res.status(400).send("Payment validation failed");
        }
      } catch (error) {
        console.error("Error during payment validation:", error.message);
        res.status(500).send("An error occurred during payment validation");
      }
    });





    // Fail Callback
    app.post("/fail-payment", (req, res) => {
      console.log("Payment Failed:", req.body);
      res.send("Payment Failed");
    });

    // Cancel Callback
    app.post("/cancel-payment", (req, res) => {
      console.log("Payment Cancelled:", req.body);
      res.send("Payment Cancelled");
    });

    // IPN Callback
    app.post("/ipn-payment", (req, res) => {
      console.log("IPN Payment Data:", req.body);
      res.send("IPN Received");
    });

    // AllUsers.jsx
    //private route
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Server is running");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
