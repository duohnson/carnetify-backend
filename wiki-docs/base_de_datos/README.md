## - Estructura de base de datos -

La idea principal es que el sistema de base de datos permita almacenar y gestionar de manera eficiente la información relacionada con los usuarios y sus credenciales digitales. Es importante el hecho del crecimiento de la plataforma, por lo tanto se penso en un sistema escalable a la cual se le puedan agregar tantos modulos y funciones como se deseen.

Para lograr esta flexibilidad, se usara PostgreSQL.

Para evitar el cuello de botella en futuros registros y operaciones, se usa un metodo de arquitectura Multitenant (Multi-Inquilino) combinado con un diseño de esquema hibrido JSON para data dinamica.

Video bueno que encontre sobre explicación Multi Tenant : [https://www.youtube.com/watch?v=x-nh-ZmaIHw](https://www.youtube.com/watch?v=x-nh-ZmaIHw)
Creditos a su creador.

(FK guarda un identificador que apunta a un registro en otra tabla, cada user tiene su identificador unico, 
ejemplo: usuario 1 tiene identificador, y organizacion 1 tiene identificador, 
usuario 1 conecta con organizacion 1 en tenant_usuarios, ellos conectan los identificadores de las tablas tenant_principal (las empresas), y usuarios,

user_id | tenant_id | rol
101       500         empleado

el usuario con id 101 es empleado en la organizacion con id 500
),

Para ver la base, su estructura ir a: [https://github.com/duohnson/carnetify-backend/wiki-docs/base_de_datos/base_comentada.md](https://github.com/duohnson/carnetify-backend/wiki-docs/base_de_datos/base_comentada.md)

### Capa global para identidad.

Un usuario no debe pertenecer a una sola empresa. Si yo trabajo en la Empresa A y voy al Gimnasio B, ambas deberían poder emitirme un carnet de CARNETIFY hacia la misma cuenta y aplicación móvil.

user
- id (UUIDv7 / no usar ID autoincremental)
- nombre (varchar)
- apellido_1 (varchar)
- apellido_2 (varchar)
- email (varchar)
- contraseña 
- fecha_creacion (timestamp)
- fecha_actualizacion (timestamp)
- etc (otros campos adicionales que puedan ser necesarios)

### Capa Multitenant.

Aquí viven las organizaciones (hospitales, universidades, corporativos).

tenants (las empresas o organizaciones)
- id (UUIDv7 / no usar ID autoincremental) # Se utiliza binary(16), luego se realizara UUIDv7 desde backend.
- nombre (varchar)
- cedula_juridica (varchar) # Es varchar porque hay entidades de otros paises que usan alfanúmerico.
- direccion (varchar)
- email (varchar)
- telefono (varchar)
- fecha_creacion (timestamp)
- fecha_actualizacion (timestamp)
- tipo_organizacion (varchar)
- etc (otros campos adicionales que puedan ser necesarios)
(guardar empresa;)

tenants_usuarios (tabla pivote, quien pertenece a qué empresa)
- user_id (UUIDv7 / no usar ID autoincremental)
- tenant_id (UUIDv7 / no usar ID autoincremental; (FK))
- fecha_creacion (timestamp)
- fecha_actualizacion (timestamp)
- rol (varchar) (ej. 'admin', 'miembro', 'invitado' con futuras acciones)
- etc (otros campos adicionales que puedan ser necesarios)
Primera key pertenece a user_id y la segunda a tenant_id.
(que usuario pertenece a cual empresa;)

### Motor de Extensibilidad

carnets_reglas
- id (UUIDv7 / no usar ID autoincremental)
- tenant_id (UUIDv7 / no usar ID autoincremental)
- nombre (varchar)
- descripcion (varchar)
- fecha_creacion (timestamp)
- fecha_actualizacion (timestamp)
- reglas (JSONB) -> Aquí guardas las reglas. Ej: {"matricula": [{"nombre": "tipo_de_identificacion", "tipo": "string", "requerido": true}]}
El objetivo de esta tabla es permitir que cada empresa defina sus propias reglas y estructuras de datos para los carnets, de manera que el sistema sea altamente extensible y adaptable a diferentes necesidades.

credenciales (los carnets emitidos a los usuarios)
- id (UUIDv7 / no usar ID autoincremental)
- user_id (UUIDv7 / no usar ID autoincremental)
- tenant_id (UUIDv7 / no usar ID autoincremental)
- carnet_regla_id (UUIDv7 / no usar ID autoincremental)
- datos (JSONB) -> Aquí guardas los datos específicos del carnet según las reglas definidas.
- fecha_creacion (timestamp)
- fecha_actualizacion (timestamp)
- estado (varchar) -> Estado actual del carnet (ej. 'activo', 'revocado', 'expirado').
- expiracion (timestamp) -> Fecha de expiración del carnet.
- dynamic_data (JSONB) -> Se guarda la data exacta del usuario sin alterar columnas: {"puesto_laboral": "administrador", "hora_de_entrada": "08:00"}. Se puede indexar llaves específicas del JSONB si se necesita buscar por ellas.

### Capa de Alta Transaccionalidad (logs y accesos)
escanear_eventos
- id (UUIDv7 / no usar ID autoincremental)
- user_id (UUIDv7 / no usar ID autoincremental)
- tenant_id (UUIDv7 / no usar ID autoincremental)
- credencial_id (UUIDv7 / no usar ID autoincremental)
- fecha (timestamp) -> Fecha y hora del escaneo.
- ubicacion (varchar) -> Ubicación donde se realizó el escaneo.
- resultado (varchar) -> Resultado del escaneo (ej. 'exitoso', 'fallido').
- fecha_creacion (timestamp)
- fecha_actualizacion (timestamp)
- etc (otros campos adicionales que puedan ser necesarios)

El esquema es un "aislamiento total", en el sentido logico, cada tenant opera de manera independiente y no comparte datos con otros tenants.

Ejemplo: 

-- 1. Activar el aislamiento en la tabla de carnets
ALTER TABLE credenciales ENABLE ROW LEVEL SECURITY;

-- 2. Crear la regla de aislamiento total
CREATE POLICY tenant_isolation_policy ON credenciales
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

Actualmente se esta pensando en un agregado de replicación para mejorar la disponibilidad y la tolerancia a fallos.
