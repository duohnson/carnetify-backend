import express from 'express';
import helmet from 'helmet'; // encabezados http seguridad
import autentificado from './modulos/autentificacion/rutas';
import manejarErrores from './middlewares/manejarErrores';

const app = express();

app.set('trust proxy', 'loopback');

app.disable('x-powered-by'); // deshab encabezado q identifica a express en respuestas http, esto realmente, da casi igual, en el mismo github digo que tecnologia utilice,
// unicamente sirve para desactivar el: "X-Powered-By: Express" que devuelve una una peticion curl -I

app.use(helmet());
app.use(express.json({ limit: '16kb' }));
// establece un limite de kgs para la peticion json enviada

app.use('/api/auth', autentificado); //

app.get('/', (req, res) => {
  console.log('IP:', req.ip);
    res.send('Servicio en [200]');
});

app.use(manejarErrores);

app.listen(3007, () => {
    console.log('[200] - http://localhost:3007');
});
