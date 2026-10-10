// npx tsx test/verificarconexion.ts

import { db } from '../src/modulos/ConexionBase';

async function probarConexion() {
    try {
        const resultado = await db.query('SELECT NOW()');
        console.log("[200]");
        console.log(resultado.rows);

    } catch (error) {
        console.error("[EROR]", error);

    } finally {
        await db.end();
    }
}

probarConexion();
