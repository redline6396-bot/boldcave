const mongoose = require('mongoose');

const uri = "mongodb+srv://redline6396_db_user:iJm6kDiS3rtuwER8@cluster0.kio8u8x.mongodb.net/?appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  const orders = db.collection('orders');

  const q1 = await orders.find({ orderNumber: { $in: ['ORD-20260922-LH5ZUR', 'ORD-20260922-LH5ZZZ'] } }).toArray();
  console.log('--- Orders by orderNumber ---');
  console.log(JSON.stringify(q1, null, 2));

  const q2 = await orders.find({ 'delhivery.waybill': { $in: ['66519010000195', '66519010000184'] } }).toArray();
  console.log('\n--- Orders by AWBs ---');
  console.log(JSON.stringify(q2, null, 2));

  // Also check if any order has these AWBs in shadowfax or shiprocket just in case
  const q3 = await orders.find({ 
    $or: [
      { 'shadowfax.awbNumber': { $in: ['66519010000195', '66519010000184'] } },
      { 'shiprocket.awbCode': { $in: ['66519010000195', '66519010000184'] } }
    ]
  }).toArray();
  console.log('\n--- Orders by AWBs (Other Providers) ---');
  console.log(JSON.stringify(q3, null, 2));

  mongoose.disconnect();
}

run().catch(console.error);
