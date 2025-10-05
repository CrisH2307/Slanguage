import * as bcrypt from 'bcrypt';
import * as mongodb from 'mongodb';

async function create(user, callback) {
    const MongoClient = mongodb.MongoClient;
    const client = new MongoClient('mongodb+srv://wangirene2008_db_user:Rl5KWsftAXXVC0J8@slanguage.1siztys.mongodb.net/?retryWrites=true&w=majority&appName=Slanguage');
  
    await client.connect();

    const db = client.db('Slanguage');
    const users = db.collection('users');

    console.log('Connected to database');

    await users.insertOne({ email: user.email, password: user.password });
    console.log('Inserted user:', user);

    client.close();
    callback(null);
  
      // users.findOne({ email: user.email }, function (err, withSameMail) {
      //   if (err || withSameMail) {
      //     client.close();
      //     return callback(err || new Error('the user already exists'));
      //   }
  
      //   bcrypt.hash(user.password, 10, function (err, hash) {
      //     if (err) {
      //       client.close();
      //       return callback(err);
      //     }
  
      //     user.password = hash;
      //     users.insert(user, function (err, inserted) {
      //       client.close();

      //       console.log('Inserted user:', inserted);
  
      //       if (err) return callback(err);
      //       callback(null);
      //     });
      //   });
      // });
  }
  
create({ email: 'bruh', password: 'bruh' }, function (err) {
    if (err) {
      console.error('Error creating user:', err);
    } else {
      console.log('User created successfully');
    }
  });