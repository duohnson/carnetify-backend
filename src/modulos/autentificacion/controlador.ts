// recibe y devuelve peticiones http,
// controlador.ts: recibe los datos y decide q respuesta HTTP devuelve

import type { RequestHandler } from 'express';

export const registrarUsuario: RequestHandler = (req, res) => {
  const nombre = req.body.nombre;
  const apellido_1 = req.body.apellido_1;
  const apellido_2 = req.body.apellido_2;
  const email = req.body.email;
  const contrasena = req.body.contrasena;

  res.status(501).json({
    estado: '[501] Sin registro',
    mensaje: 'Ingresa pero aun sin registros'
  });


};
