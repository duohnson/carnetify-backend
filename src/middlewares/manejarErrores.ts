import type { ErrorRequestHandler } from 'express';

// ver errores backend
const manejarErrores: ErrorRequestHandler = (error, req, res, next) => {

    // mostrar el error en console
    console.error('[Error proviene de manejarErrores.ts]:', error);

    // comprob si el server envia una respuesta
    if (res.headersSent) {
        return next(error);
    }

    // enviar un error HTTP 500
    res.status(500).json({
        estado: 'ERROR',
        mensaje: 'Error interno, ver console o comunicar a un admin'
    });

};

export default manejarErrores;
