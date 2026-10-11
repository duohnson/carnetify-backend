import express from 'express';

const app = express();

app.get('/', (req, res) => {
    res.send('Servicio en [200]');
});

app.listen(3007, () => {
    console.log('[200] - http://localhost:3007');
});
