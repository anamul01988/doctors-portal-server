const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.opabz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  // console.log('abc')
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    // console.log('database connected')
    const serviceCollection = client.db('doctors_portal').collection('services');
    const bookingCollection = client.db('doctors_portal').collection('bookings');
    const userCollection = client.db('doctors_portal').collection('users');


    app.get('/service', async(req, res)=>{
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services)
    })



    // app.get('/user', verifyJWT, async (req, res) => {
    //   const users = await userCollection.find().toArray();
    //   res.send(users);
    // });
    // app.get('/admin/:email', async(req, res) =>{
    //   const email = req.params.email;
    //   const user = await userCollection.findOne({email: email});
    //   const isAdmin = user.role === 'admin';
    //   res.send({admin: isAdmin})
    // })

    // app.put('/user/admin/:email', verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   const requester = req.decoded.email;
    //   const requesterAccount = await userCollection.findOne({ email: requester });
    //   if (requesterAccount.role === 'admin') {
    //     const filter = { email: email };
    //     const updateDoc = {
    //       $set: { role: 'admin' },
    //     };
    //     const result = await userCollection.updateOne(filter, updateDoc);
    //     res.send(result);
    //   }
    //   else{
    //     res.status(403).send({message: 'forbidden'});
    //   }

    // })





    // app.put('/user/:email', async (req, res) => {
    //   const email = req.params.email;
    //   const user = req.body;
    //   const filter = { email: email };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: user,
    //   };
    //   const result = await userCollection.updateOne(filter, updateDoc, options);
    //   const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    //   res.send({ result, token });
    // })
    
    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })

    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
      else{
        res.status(403).send({message: 'forbidden'});
      }

    })





    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    })

    // this is not the proper way to use query.
    //after learning more about mongodb . use aggregate lookup , pipeline, mathc, group
  app.get('/available', async(req, res)=>{
      const date = req.query.date;
      //step 1: get all services
      const services = await serviceCollection.find().toArray();
      // res.send(services)

      //step 2: get the booking of that day
      const query = {date: date};
      // console.log(query)
      const bookings = await bookingCollection.find(query).toArray();
      // res.send(bookings)
      // console.log(bookings)

      //step 3: for each service, find bookings for that service
      services.forEach(service =>{
        //step 4: find bookings for that service . 
        const serviceBookings = bookings.filter(book => book.treatment === service.name)
        // console.log(serviceBookings)
        //step 5: select slots for the service Bookings
        const bookedSlots = serviceBookings.map(book=>book.slot)
        // console.log(booked)
        //step 6: select those slots that are not in bookedSlots
        const available = service.slots.filter(slot=>!bookedSlots.includes(slot));
        //  console.log(available)
        //step 7: set available to slots to make it easier
         service.slots = available;
       
      })
     res.send(services)
  })

   /**
     * API Naming Convention
     * app.get('/booking') // get all bookings in this collection. or get more than one or by filter
     * app.get('/booking/:id') // get a specific booking 
     * app.post('/booking') // add a new booking
     * app.patch('/booking/:id) //
     * app.put('/booking/:id') // upsert ==> update (if exists) or insert (if doesn't exist)
     * app.delete('/booking/:id) //
    */
    app.get('/booking', verifyJWT, async(req, res)=>{
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    })


    app.post('/booking', async(req, res)=>{
      // console.log(req.body)
       const booking = req.body;
       const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient}
       console.log(query)
       const exists = await bookingCollection.findOne(query);
       if(exists){
         return res.send({success: false, booking: exists})
       }
       const result = await bookingCollection.insertOne(booking);
       return res.send({success: true, result});
    })

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hellow from Doctor Uncle!')
})

app.get('/invalid', (req, res)=>{
  res.send('invalid heroku url ')
})

app.listen(port, () => {
  console.log(`Doctor app listening on port ${port}`)
})