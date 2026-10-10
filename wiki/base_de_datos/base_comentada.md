El uso del workbench era para usar diagrama, y ver o entender yo el flujo para crear la base,
ahora, ya creada, voy a escribir la base postgreSQL.

Para ver el .sql de la base ir a -->: [https://github.com/duohnson/credid-backend/wiki/base_de_datos/esquema_postgre.sql](https://github.com/duohnson/credid-backend/wiki/base_de_datos/esquema_postgre.sql)

BEGIN;

  - Begin lo que hace es iniciar un tipo de estado al crear la base, asi, si la base genera error en medio script, no crea medio esquema y deja lo demás sin finalizar, si que no con rollback; me permite deshacer todo, asi a la hora de usar el script se completa una vez corregido.

  ```
  CREATE TABLE usuarios (
   id uuid PRIMARY KEY, nombre varchar(150) NOT NULL, apellido_1 varchar(150) NOT NULL,
   apellido_2 varchar(150), email varchar(255) NOT NULL,
   contrasena_hash varchar(255) NOT NULL,
   fecha_creacion timestamptz NOT NULL DEFAULT now(),
   fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
   CONSTRAINT usuarios_email_no_vacio CHECK (btrim(email) <> '')
  );
  ```

  - La tabla de usuarios permite a ñla persona estar asociado a un trabajo, universidad y gimnasio pero su identidad global solo es una, la del id; CONSTRAINT --> obliga a declarar restriccion, entonces, se traduce de esta forma, usuarios_email_no_vacio es regla que usa CHECK --> <VACIO> ... OBLIGA a que no posea espacios, ni que este vacio, lo hace obligatorio el email.

   ```
   CREATE UNIQUE INDEX usuarios_email_unique_ci ON usuarios (lower(email));
   ```

  - El unique INDEX lo que permite es UNIQUE, para evitar crear usuarios con correo duplicado y el INDEX busqueda facilitada, asi evitamos que se creen usuarios con duplicidad de email.

  ```
  CREATE TABLE tenant_principal (
   id uuid PRIMARY KEY, nombre varchar(255) NOT NULL,
   cedula_juridica varchar(64), direccion varchar(255), email varchar(255) NOT NULL,
   telefono varchar(45), tipo_organizacion varchar(100) NOT NULL,
   fecha_creacion timestamptz NOT NULL DEFAULT now(),
   fecha_actualizacion timestamptz NOT NULL DEFAULT now()
  );
  ```
  
  - La tabla tenant_principal permite registrar las organizaciones que van a utilizar CREDID, ya sean empresas, universidades, hospitales o gimnasios. Cada una tendrá su propio id UUID, que será su identificador único dentro de la base; PRIMARY KEY obliga a que ese id no se repita y tampoco sea NULL.
  
  - Los campos que tienen NOT NULL son obligatorios, aunque esto no impide por sí solo que alguien envíe un texto vacío. La cedula_juridica es varchar(64) porque no todos los países utilizan únicamente números para identificar sus organizaciones; direccion y telefono son opcionales porque no tienen NOT NULL. tipo_organizacion permite identificar qué clase de institución estamos registrando.
  
  - fecha_creacion y fecha_actualizacion utilizan timestamptz para guardar la fecha y hora considerando las zonas horarias. DEFAULT now() asigna automáticamente el momento actual si no enviamos otro valor al insertar el registro. Sin embargo, fecha_actualizacion todavía no cambia automáticamente al modificar datos; para eso utilizaremos un TRIGGER más adelante.
  
   ```
  CREATE TABLE tenant_usuarios (
   user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
   tenant_id uuid NOT NULL REFERENCES tenant_principal(id) ON DELETE RESTRICT,
   rol varchar(45) NOT NULL DEFAULT 'miembro',
   fecha_creacion timestamptz NOT NULL DEFAULT now(),
   fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
   PRIMARY KEY (user_id, tenant_id),
   CONSTRAINT tenant_usuarios_rol_valido CHECK (rol IN ('admin','miembro','invitado'))
  );
  ```
  
  - La tabla tenant_usuarios relaciona los usuarios con las organizaciones. Aquí es donde permitimos que una persona pueda pertenecer a una universidad, empresa y gimnasio al mismo tiempo, pero manteniendo una sola identidad global dentro de CREDID.
  
  - REFERENCES --> Permite declarar una FOREIGN KEY, o clave foránea, que obliga a que el identificador exista en la tabla relacionada. user_id apunta al id de usuarios, mientras que tenant_id apunta al id de tenant_principal. Esto no crea ni copia los usuarios automáticamente, solamente establece una relación entre registros que ya existen.
  
  - ON DELETE RESTRICT --> Impide eliminar un usuario o una organización mientras existan registros en esta tabla que dependan de ellos. Así evitamos borrar información que todavía está relacionada con otras tablas.
  
  - PRIMARY KEY (user_id, tenant_id) --> Es una clave primaria compuesta, significa que se utilizan dos columnas para identificar una relación única. Por ejemplo, un usuario puede pertenecer a tres organizaciones, pero no puede tener dos registros con el mismo user_id y tenant_id.
  
  - rol varchar(45) NOT NULL DEFAULT 'miembro' --> Permite establecer el rol del usuario dentro de la organización. Si no indicamos ningún rol al crear la relación, automáticamente será miembro.
  
  - CONSTRAINT tenant_usuarios_rol_valido CHECK --> Crea una restricción que permite únicamente los roles admin, miembro e invitado. Si intentamos introducir otro valor, PostgreSQL rechazará la operación. Esto evita guardar roles que todavía no están contemplados dentro del sistema.
  
  ```
  CREATE INDEX tenant_usuarios_tenant_idx ON tenant_usuarios(tenant_id);
  ```
  
  - El INDEX permite facilitar las búsquedas mediante tenant_id. Por ejemplo, si una universidad quiere consultar todos sus usuarios registrados, PostgreSQL podrá utilizar este índice para encontrar las relaciones de esa organización sin necesidad de recorrer siempre toda la tabla. El índice no obliga a que los valores sean únicos, porque aquí no utilizamos UNIQUE.
  
  ```
  CREATE TABLE carnet_reglas (
   id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenant_principal(id) ON DELETE RESTRICT,
   nombre varchar(150) NOT NULL, descripcion text,
   reglas jsonb NOT NULL DEFAULT '{}'::jsonb,
   fecha_creacion timestamptz NOT NULL DEFAULT now(),
   fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
   CONSTRAINT carnet_reglas_json_objeto CHECK (jsonb_typeof(reglas) = 'object'),
   UNIQUE (tenant_id, id)
  );
  ```
  
  - La tabla carnet_reglas permite que cada organización tenga sus propias configuraciones de carnets. Por ejemplo, una universidad puede crear una configuración de carnet estudiantil, mientras que una empresa puede crear otra para sus empleados. Cada configuración tendrá su id y estará relacionada con una organización mediante tenant_id.
  
  - nombre varchar(150) NOT NULL --> Obliga a indicar un nombre para la configuración del carnet, mientras que descripcion text permite guardar una explicación adicional sin establecer un límite fijo pequeño de caracteres.
  
  - reglas jsonb --> Permite almacenar configuraciones utilizando objetos JSON. Esto es útil porque no todas las organizaciones necesitan los mismos datos o características en sus carnets. Por ejemplo, una universidad podría configurar la carrera del estudiante, mientras que una empresa podría configurar el departamento del empleado.
  
  - DEFAULT '{}'::jsonb --> Indica que, si no enviamos ninguna configuración, PostgreSQL guardará un objeto JSON vacío. El ::jsonb convierte ese valor al tipo JSONB que utiliza la columna.
  
  - CONSTRAINT carnet_reglas_json_objeto CHECK --> Obliga a que reglas sea un objeto JSON. jsonb_typeof(reglas) comprueba su tipo y exige que sea object; si enviamos un arreglo, número o texto JSON en lugar de un objeto, la operación será rechazada. Esto no verifica todavía qué propiedades debe contener ese objeto.
  
  - UNIQUE (tenant_id, id) --> Obliga a que la combinación de organización y configuración sea única. Aunque id ya es único por ser PRIMARY KEY, declaramos esta combinación para que otras tablas puedan crear una FOREIGN KEY que compruebe ambos identificadores al mismo tiempo.
  
  ```
  CREATE INDEX carnet_reglas_tenant_idx ON carnet_reglas(tenant_id);
  ```
  
  - Este INDEX facilita buscar todas las configuraciones de carnets que pertenecen a una organización. Por ejemplo, cuando una universidad necesite consultar qué tipos de carnets puede emitir a sus estudiantes.
  
  ```
  CREATE TABLE credenciales (
   id uuid PRIMARY KEY, user_id uuid NOT NULL, tenant_id uuid NOT NULL,
   carnet_regla_id uuid NOT NULL, datos jsonb, dynamic_data jsonb,
   fecha_creacion timestamptz NOT NULL DEFAULT now(),
   fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
   estado varchar(20) NOT NULL DEFAULT 'activo', expiracion timestamptz,
   CONSTRAINT credenciales_estado_valido CHECK (estado IN ('activo','revocado','expirado')),
   CONSTRAINT credenciales_usuario_fk FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
   CONSTRAINT credenciales_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenant_principal(id) ON DELETE RESTRICT,
   CONSTRAINT credenciales_regla_tenant_fk FOREIGN KEY (tenant_id,carnet_regla_id)
    REFERENCES carnet_reglas(tenant_id,id) ON DELETE RESTRICT,
   UNIQUE (tenant_id,id)
  );
  ```
  
  - La tabla credenciales es donde se registran los carnets que las organizaciones emiten a los usuarios. Aquí se relacionan tres elementos importantes: el usuario que recibe el carnet, la organización que lo emite y la configuración que se utilizó para crearlo.
  
  - id uuid PRIMARY KEY --> Identifica de forma única cada credencial. No es lo mismo que el id del usuario, porque una misma persona puede tener diferentes credenciales dentro de CREDID.
  
  - user_id, tenant_id y carnet_regla_id --> Permiten identificar a quién pertenece el carnet, qué organización lo emitió y qué reglas se utilizaron para crearlo. Aunque declaramos los tres como uuid, las relaciones se establecen realmente mediante las FOREIGN KEY que aparecen más abajo.
  
  - datos jsonb y dynamic_data jsonb --> Permiten almacenar información variable dentro de la credencial. Esto evita tener que agregar una columna nueva cada vez que una organización necesita un dato diferente. La diferencia exacta entre datos y dynamic_data tendremos que definirla desde el backend, ya que PostgreSQL solamente sabe que ambas columnas contienen JSONB y pueden ser NULL.
  
  - estado varchar(20) NOT NULL DEFAULT 'activo' --> Permite registrar el estado del carnet, que inicialmente será activo si no indicamos otro valor. La columna expiracion permite guardar hasta qué fecha será válido, pero no cambia automáticamente el estado a expirado cuando llegue esa fecha.
  
  - CONSTRAINT credenciales_estado_valido CHECK --> Obliga a que el estado sea únicamente activo, revocado o expirado. Si intentamos guardar cualquier otro estado, PostgreSQL rechazará la operación.
  
  - CONSTRAINT credenciales_usuario_fk FOREIGN KEY --> Obliga a que el user_id de la credencial exista en la tabla usuarios. Así no podemos emitir una credencial para un usuario inexistente.
  
  - CONSTRAINT credenciales_tenant_fk FOREIGN KEY --> Obliga a que el tenant_id exista dentro de tenant_principal. Esto permite identificar una organización válida que está emitiendo el carnet.
  
  - CONSTRAINT credenciales_regla_tenant_fk FOREIGN KEY (tenant_id,carnet_regla_id) --> Aquí utilizamos una clave foránea compuesta. Esto obliga a que la configuración del carnet pertenezca a la misma organización que está emitiendo la credencial. Por ejemplo, una empresa no puede utilizar por error una configuración que pertenece a otra universidad.
  
  - UNIQUE (tenant_id,id) --> Declara como única la combinación entre organización y credencial, permitiendo que otras tablas puedan verificar mediante FOREIGN KEY que una credencial corresponde a determinada organización.
  
  - Hay un detalle importante: actualmente validamos que el usuario exista y que la organización exista, pero no que ese usuario esté asociado a esa organización en tenant_usuarios. Si queremos obligar a que exista esa relación antes de emitir un carnet, tendremos que agregar otra FOREIGN KEY compuesta. Esto dependerá de si CREDID permitirá emitir credenciales a usuarios externos sin afiliarlos previamente.
  
  ```
  CREATE INDEX credenciales_usuario_idx ON credenciales(user_id);
  CREATE INDEX credenciales_tenant_estado_idx ON credenciales(tenant_id,estado);
  CREATE INDEX credenciales_regla_idx ON credenciales(carnet_regla_id);
  ```
  
  - credenciales_usuario_idx --> Facilita buscar todas las credenciales que pertenecen a una persona. Por ejemplo, cuando inicia sesión en CREDID y necesita visualizar todos sus carnets.
  
  - credenciales_tenant_estado_idx --> Es un índice compuesto que utiliza tenant_id y estado. Sirve para facilitar consultas de credenciales de una organización filtradas por estado, por ejemplo buscar todos los carnets activos de una universidad.
  
  - credenciales_regla_idx --> Facilita buscar todas las credenciales que fueron creadas utilizando una configuración específica de carnet.
  
  ```
  CREATE TABLE escanear_eventos (
   id uuid PRIMARY KEY, user_id uuid, tenant_id uuid NOT NULL,
   credencial_id uuid, fecha timestamptz NOT NULL DEFAULT now(),
   ubicacion varchar(255), resultado varchar(30) NOT NULL,
   fecha_creacion timestamptz NOT NULL DEFAULT now(),
   fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
   CONSTRAINT escanear_eventos_usuario_fk FOREIGN KEY(user_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
   CONSTRAINT escanear_eventos_tenant_fk FOREIGN KEY(tenant_id) REFERENCES tenant_principal(id) ON DELETE RESTRICT,
   CONSTRAINT escanear_eventos_credencial_tenant_fk FOREIGN KEY(tenant_id,credencial_id)
   REFERENCES credenciales(tenant_id,id) ON DELETE RESTRICT,
   CONSTRAINT escanear_eventos_resultado_valido CHECK (resultado IN ('exitoso','fallido'))
  );
  ```
  
  - La tabla escanear_eventos permite registrar el historial de verificaciones de los carnets. Por ejemplo, cuando un estudiante presenta su carnet en una universidad, podemos registrar la fecha, ubicación y resultado del escaneo. Esto nos permitirá consultar posteriormente los eventos registrados.
  
  - id uuid PRIMARY KEY --> Identifica de forma única cada evento. user_id permite asociarlo con un usuario, tenant_id identifica la organización y credencial_id permite saber qué carnet fue escaneado.
  
  - user_id y credencial_id no tienen NOT NULL --> Esto significa que pueden quedar en NULL. Por ejemplo, cuando se registra un intento de escaneo fallido donde no fue posible identificar al usuario o su credencial.
  
  - fecha timestamptz NOT NULL DEFAULT now() --> Guarda automáticamente la fecha y hora del escaneo cuando no se proporciona otra. ubicacion varchar(255) permite indicar dónde ocurrió, como una entrada principal o una oficina.
  
  - resultado varchar(30) NOT NULL --> Obliga a guardar un resultado para cada evento, el cual será validado mediante CHECK.
  
  - CONSTRAINT escanear_eventos_usuario_fk --> Verifica que user_id exista realmente en usuarios cuando se proporciona un identificador.
  
  - CONSTRAINT escanear_eventos_tenant_fk --> Obliga a que la organización exista dentro de tenant_principal.
  
  - CONSTRAINT escanear_eventos_credencial_tenant_fk --> Es una FOREIGN KEY compuesta que comprueba que la credencial pertenezca a la organización del evento. Si credencial_id es NULL, esta relación no se comprueba, lo cual permite registrar eventos sin una credencial identificada.
  
  - CONSTRAINT escanear_eventos_resultado_valido CHECK --> Obliga a que resultado sea exitoso o fallido. Cualquier valor diferente será rechazado por PostgreSQL.
  
  - Hay que tener presente que las FOREIGN KEY actuales no verifican que user_id sea el verdadero propietario de credencial_id. Esa relación debe validarse adicionalmente si queremos impedir inconsistencias en los registros de escaneos.
  
  ```
  CREATE INDEX escanear_eventos_tenant_fecha_idx ON escanear_eventos(tenant_id,fecha DESC);
  CREATE INDEX escanear_eventos_credencial_idx ON escanear_eventos(credencial_id);
  CREATE INDEX escanear_eventos_usuario_idx ON escanear_eventos(user_id);
  ```
  
  - escanear_eventos_tenant_fecha_idx --> Permite facilitar búsquedas de eventos por organización y fecha. DESC indica que el índice almacena la fecha en orden descendente, lo que resulta útil para consultar los eventos más recientes primero.
  
  - escanear_eventos_credencial_idx --> Facilita consultar el historial de verificaciones de una credencial específica.
  
  - escanear_eventos_usuario_idx --> Facilita buscar todos los eventos asociados a un usuario. Esto puede servir para mostrar un historial de escaneos o realizar una auditoría.
  
  ```
  CREATE FUNCTION credid_set_fecha_actualizacion() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN NEW.fecha_actualizacion = now(); RETURN NEW; END; $$;
  ```
  
  - CREATE FUNCTION --> Crea una función dentro de PostgreSQL. Esta función tiene como propósito actualizar automáticamente el campo fecha_actualizacion cuando modificamos un registro de las tablas que tengan asociado su TRIGGER.
  
  - RETURNS trigger --> Indica que la función será ejecutada mediante un TRIGGER, el cual es un disparador que responde a operaciones sobre una tabla, como UPDATE.
  
  - LANGUAGE plpgsql --> Indica que estamos utilizando PL/pgSQL, un lenguaje procedural de PostgreSQL que permite ejecutar instrucciones, utilizar variables y crear condiciones.
  
  - BEGIN y END --> Delimitan las instrucciones de la función. Este BEGIN no es el mismo que utilizamos al principio del script para iniciar una transacción.
  
  - NEW.fecha_actualizacion = now() --> NEW representa el registro con los nuevos valores que se está actualizando. Aquí cambiamos su fecha_actualizacion por el momento actual.
  
  - RETURN NEW --> Devuelve el registro modificado para que PostgreSQL continúe con la actualización utilizando esos valores.
  
  - Esta función todavía no se ejecutará automáticamente hasta que creemos los TRIGGERS correspondientes en las tablas.
  
  ```
  DO $$ DECLARE t text; BEGIN
   FOREACH t IN ARRAY ARRAY['usuarios','tenant_principal','tenant_usuarios','carnet_reglas','credenciales'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION credid_set_fecha_actualizacion()', 'trg_'||t||'_actualizacion', t);
   END LOOP;
  END $$;
  ```
  
  - DO $$ --> Permite ejecutar un bloque de instrucciones PL/pgSQL sin tener que crear otra función permanente dentro de PostgreSQL.
  
  - DECLARE t text --> Declara una variable llamada t de tipo texto. Esta variable almacenará temporalmente el nombre de cada tabla que vamos a recorrer.
  
  - FOREACH t IN ARRAY --> Es un ciclo que recorre el arreglo que contiene los nombres de las tablas. En cada vuelta, t toma el nombre de una tabla diferente.
  
  - LOOP --> Indica el inicio de las instrucciones que se repetirán por cada tabla del arreglo, hasta llegar a END LOOP.
  
  - EXECUTE format() --> Permite construir y ejecutar una instrucción SQL dinámicamente. En este caso, lo utilizamos para crear automáticamente un TRIGGER por cada tabla, sin tener que escribir manualmente cinco CREATE TRIGGER diferentes.
  
  - CREATE TRIGGER --> Crea el disparador que ejecutará nuestra función cuando ocurra una actualización en la tabla correspondiente.
  
  - BEFORE UPDATE --> Significa que el TRIGGER se ejecutará antes de que el registro sea actualizado dentro de PostgreSQL.
  
  - FOR EACH ROW --> Indica que el TRIGGER se ejecutará para cada fila que esté siendo modificada. Si actualizamos diez usuarios mediante una consulta, la función se ejecutará para cada uno de esos diez registros.
  
  - EXECUTE FUNCTION credid_set_fecha_actualizacion() --> Indica que el TRIGGER debe llamar a la función que creamos anteriormente, para modificar automáticamente la fecha de actualización.
  
  - 'trg_'||t||'_actualizacion' --> Construye el nombre del TRIGGER. El operador || permite concatenar cadenas de texto; por ejemplo, para usuarios se generará trg_usuarios_actualizacion.
  
  - De esta manera, cada vez que utilicemos UPDATE sobre usuarios, tenant_principal, tenant_usuarios, carnet_reglas o credenciales, PostgreSQL actualizará automáticamente el campo fecha_actualizacion sin que tengamos que hacerlo manualmente desde el backend.
  
  - Hay que considerar que escanear_eventos no está incluido en el arreglo. Por lo tanto, los registros de esa tabla no tendrán este mecanismo automático de actualización.
  
  ```
  COMMIT;
  ```
  
  - COMMIT --> Finaliza la transacción que iniciamos al principio con BEGIN; y confirma todos los cambios realizados. Si el script se ejecuta correctamente, las tablas, índices, función y TRIGGERS quedarán guardados.
  
  - Si una instrucción genera un error que deja la transacción fallida, podemos utilizar ROLLBACK; para deshacer los cambios realizados durante esa transacción. Así corregimos el problema y ejecutamos nuevamente el script, evitando dejar un esquema creado parcialmente.
