import 'dotenv/config';
import express from 'express';

const app = express();

app.set('trust proxy', true);

app.get('/api/ip-info', async (req, res) => {
  try {
    const USER_IP = '115.111.183.122' || req.ip.replace(/^::ffff:/, '');

    console.log('USER_IP:', USER_IP);

    const response = await fetch(`https://api.ipwho.org/me?apiKey=${process.env.IPWHO_API_KEY}`);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get IP information' });
  }
});

app.listen(3000);
