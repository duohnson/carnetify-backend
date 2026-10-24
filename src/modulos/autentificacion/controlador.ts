// recibe y devuelve peticiones http,
// controlador.ts: recibe los datos y decide q respuesta HTTP devuelve

import type { RequestHandler } from 'express';
import { crearUsuario } from './servicios';

export const registrarUsuario: RequestHandler = async (req, res) => {
  const nombre = req.body.nombre;
  const apellido_1 = req.body.apellido_1;
  const apellido_2 = req.body.apellido_2;
  const email = req.body.email;
  const contrasena = req.body.contrasena;

  const datosRegistro = {
    nombre,
    apellido_1,
    apellido_2,
    email,
    contrasena
  };

  const usuarioCreado = await crearUsuario(datosRegistro);


  res.status(201).json({
    estado: '[201] Registro exitoso.',
    mensaje: 'Se procedio a realizar el registro',
    usuario: usuarioCreado
  });


};
