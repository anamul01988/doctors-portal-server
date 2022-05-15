const express = require('express')
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.opabz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// console.log(uri)
async function run() {
  try {
    await client.connect();
    // console.log('database connected')
    const serviceCollection = client.db('doctors_portal').collection('services');
    const bookingCollection = client.db('doctors_portal').collection('bookings');


    app.get('/service', async(req, res)=>{
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services)
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
     * app.delete('/booking/:id) //
    */
    app.get('/booking', async(req, res)=>{
      const patient = req.query.patient;
      const query = {patient: patient};
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings)
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