BEGIN;
CREATE TABLE usuarios (
 id uuid PRIMARY KEY, nombre varchar(150) NOT NULL, apellido_1 varchar(150) NOT NULL,
 apellido_2 varchar(150), email varchar(255) NOT NULL,
 contrasena_hash varchar(255) NOT NULL,
 fecha_creacion timestamptz NOT NULL DEFAULT now(),
 fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT usuarios_email_no_vacio CHECK (btrim(email) <> '')
);
CREATE UNIQUE INDEX usuarios_email_unique_ci ON usuarios (lower(email));
CREATE TABLE tenant_principal (
 id uuid PRIMARY KEY, nombre varchar(255) NOT NULL,
 cedula_juridica varchar(64), direccion varchar(255), email varchar(255) NOT NULL,
 telefono varchar(45), tipo_organizacion varchar(100) NOT NULL,
 fecha_creacion timestamptz NOT NULL DEFAULT now(),
 fecha_actualizacion timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tenant_usuarios (
 user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
 tenant_id uuid NOT NULL REFERENCES tenant_principal(id) ON DELETE RESTRICT,
 rol varchar(45) NOT NULL DEFAULT 'miembro',
 fecha_creacion timestamptz NOT NULL DEFAULT now(),
 fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, tenant_id),
 CONSTRAINT tenant_usuarios_rol_valido CHECK (rol IN ('admin','miembro','invitado'))
);
CREATE INDEX tenant_usuarios_tenant_idx ON tenant_usuarios(tenant_id);
CREATE TABLE carnet_reglas (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenant_principal(id) ON DELETE RESTRICT,
 nombre varchar(150) NOT NULL, descripcion text,
 reglas jsonb NOT NULL DEFAULT '{}'::jsonb,
 fecha_creacion timestamptz NOT NULL DEFAULT now(),
 fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT carnet_reglas_json_objeto CHECK (jsonb_typeof(reglas) = 'object'),
 UNIQUE (tenant_id, id)
);
CREATE INDEX carnet_reglas_tenant_idx ON carnet_reglas(tenant_id);
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
CREATE INDEX credenciales_usuario_idx ON credenciales(user_id);
CREATE INDEX credenciales_tenant_estado_idx ON credenciales(tenant_id,estado);
CREATE INDEX credenciales_regla_idx ON credenciales(carnet_regla_id);
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
CREATE INDEX escanear_eventos_tenant_fecha_idx ON escanear_eventos(tenant_id,fecha DESC);
CREATE INDEX escanear_eventos_credencial_idx ON escanear_eventos(credencial_id);
CREATE INDEX escanear_eventos_usuario_idx ON escanear_eventos(user_id);
CREATE FUNCTION credid_set_fecha_actualizacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.fecha_actualizacion = now(); RETURN NEW; END; $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['usuarios','tenant_principal','tenant_usuarios','carnet_reglas','credenciales'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION credid_set_fecha_actualizacion()', 'trg_'||t||'_actualizacion', t);
 END LOOP;
END $$;
COMMIT;
