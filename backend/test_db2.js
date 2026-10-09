import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://adityalashkari67_db_user:yL9wjMType8fiZef@aura.qnqwicg.mongodb.net/?appName=Aura')
  .then(async () => {
    const Song = (await import('./src/models/Song.js')).default;
    const s = await Song.findOne({ audioUrl: { $regex: '^http' } });
    console.log(JSON.stringify(s));
    process.exit(0);
  }).catch(e => { console.error(e); process.exit(1); });
