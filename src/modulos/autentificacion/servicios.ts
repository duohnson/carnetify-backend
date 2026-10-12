// gestion log, regs, y acceso a data

import * as argon2 from 'argon2';
import { db } from '../ConexionBase';
import { v7 } from 'uuid';

interface DatosRegistro {
  nombre: string;
  apellido_1: string;
  email: string;
  contrasena: string;
  apellido_2?: string;
};

// desestructuracion de objetos, esta permite extraer varias propiedades de un objeto en una sola declaracion
// ejemplo, es lo mismo que:
// const nombre = datosUsuario.nombre;
// const apellido_1 = datosUsuario.apellido_1;

export async function crearUsuario(datosUsuario: DatosRegistro) {

  const { nombre, email, apellido_1, apellido_2, contrasena } = datosUsuario;
  const contrasenaHash = await argon2.hash(contrasena)
  // se crea una const contrasenaHash que espera el hasheo de la contrasena

  const id = v7();
  const resultadoConsulta = await db.query(prepararConsulta, [id, nombre, apellido_1, apellido_2, email, contrasenaHash])
  const usuarioCreado = resultadoConsulta.rows[0];

  return usuarioCreado;

};

const prepararConsulta = `

  INSERT INTO usuarios (
    id, nombre, apellido_1, apellido_2, email, contrasena_hash
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, email
  `;
