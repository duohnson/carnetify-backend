// rutas de peticiones http
import { Router } from 'express';
import { validarRegistro } from '../../middlewares/validarDatos';

const autentificar = Router();

function autentificarRoute() {

    // get para ver el estado
    autentificar.get('/estado', (req, res) => {
        res.status(200).json({
            mensaje: '[200] en route.ts'
        });
    });

    // post para registrar usuarios
    autentificar.post('/registro', validarRegistro, (req, res) => {
        res.status(501).json({
            mensaje: '[501] se ubica en validarDatos.ts'
        });
    });

    return autentificar;
}

const autentificado: Router = autentificarRoute();

export default autentificado;
