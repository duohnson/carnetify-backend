// rutas de peticiones http
import { Router } from 'express';
import { validarRegistro } from '../../middlewares/validarDatos';
import { registrarUsuario } from './controlador';
import { validarLogeo } from '../../middlewares/validarDatos';
import { iniciarSesion } from './controlador';

const autentificar = Router();

function autentificarRoute() {

    // get para ver el estado
    autentificar.get('/estado', (req, res) => {
        res.status(200).json({
            mensaje: '[200] en route.ts'
        });
    });

    // post para registrar usuarios
  autentificar.post('/registro', validarRegistro, registrarUsuario);

  autentificar.post('/sesion', validarLogeo, iniciarSesion);

    return autentificar;
}

const autentificado: Router = autentificarRoute();

export default autentificado;
