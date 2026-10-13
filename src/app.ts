import express from 'express';
import config from './config';
import routes from './routes';
import notFound from './middleware/notFound';
import errorHandler from './middleware/errorHandler';
import { requestId } from './middleware/requestId';

const app = express();

app.set('trust proxy', config.trustProxy);

app.use(requestId);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'API is running' });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
