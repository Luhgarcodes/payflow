import express from 'express';
import config from './config';
import routes from './routes';
import notFound from './middleware/notFound';
import errorHandler from './middleware/errorHandler';

const app = express();

app.set('trust proxy', config.trustProxy);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'API is running' });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
