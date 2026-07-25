# Integracion de Jelou con SincroMed

Esta guia contiene todo lo que debe realizar la persona responsable de Jelou.
Las Edge Functions `jelou-bridge` y `jelou-evidence-webhook` ya estan
desplegadas en el proyecto Supabase `mzlirlpevnnybbkjxyuo`.

## 1. Datos de produccion

Webhook que debe configurar Jelou:

```text
POST https://mzlirlpevnnybbkjxyuo.supabase.co/functions/v1/jelou-evidence-webhook
Content-Type: application/json
x-webhook-secret: <SECRETO_CONFIGURADO_EN_SUPABASE>
```

El secreto no debe incluirse en el repositorio, frontend, capturas o logs.

## 2. Configurar secretos en Supabase

La persona responsable debe tener acceso al proyecto de Supabase y ejecutar,
desde la raiz del repositorio:

```powershell
pnpm dlx supabase login
pnpm dlx supabase link --project-ref mzlirlpevnnybbkjxyuo

$webhookSecret = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })

pnpm dlx supabase secrets set JELOU_WEBHOOK_SECRET="$webhookSecret"
pnpm dlx supabase secrets set JELOU_APPS_KEY="CLAVE_DE_APLICACION_DE_JELOU"
pnpm dlx supabase secrets set JELOU_MEDIA_HOSTS="media.jelou.ai,otro-host-autorizado.com"
```

Si la descarga de archivos requiere un bearer token:

```powershell
pnpm dlx supabase secrets set JELOU_MEDIA_TOKEN="TOKEN_PRIVADO_DE_MEDIOS"
```

Si el endpoint de funciones de Jelou es distinto al predeterminado, configurar:

```powershell
pnpm dlx supabase secrets set JELOU_FUNCTIONS_URL="https://host-real-de-jelou"
```

El valor predeterminado es `https://sincromed.fn.jelou.ai`. No es necesario
configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY` ni
`SUPABASE_SERVICE_ROLE_KEY`; Supabase las inyecta automaticamente.

Verificar que los nombres quedaron registrados:

```powershell
pnpm dlx supabase secrets list
```

No es necesario volver a desplegar las funciones despues de guardar secretos.

## 3. Configurar el envio desde Jelou

Al programar cada recordatorio, Jelou debe conservar:

- `patientId`: UUID del paciente.
- `doseEventId`: UUID de la toma programada.

Cuando llegue una respuesta de WhatsApp, Jelou debe enviar esos mismos
identificadores. No se debe resolver una toma solo mediante el telefono:
un cuidador puede estar asociado con varios pacientes.

Cada envio debe incluir un `messageId` unico y estable del proveedor de
WhatsApp. Los reintentos deben reutilizar ese mismo ID para evitar duplicados.

### Evidencia fotografica

```json
{
  "doseEventId": "UUID_DE_LA_TOMA",
  "patientId": "UUID_DEL_PACIENTE",
  "messageId": "ID_UNICO_DEL_MENSAJE_WHATSAPP",
  "type": "photo",
  "mediaUrl": "https://HOST_AUTORIZADO/ruta/foto.jpg",
  "mimeType": "image/jpeg",
  "fileName": "foto-whatsapp.jpg"
}
```

### Evidencia de audio

```json
{
  "doseEventId": "UUID_DE_LA_TOMA",
  "patientId": "UUID_DEL_PACIENTE",
  "messageId": "ID_UNICO_DEL_MENSAJE_WHATSAPP",
  "type": "audio",
  "mediaUrl": "https://HOST_AUTORIZADO/ruta/audio.ogg",
  "mimeType": "audio/ogg",
  "fileName": "confirmacion.ogg"
}
```

### Evidencia de texto

```json
{
  "doseEventId": "UUID_DE_LA_TOMA",
  "patientId": "UUID_DEL_PACIENTE",
  "messageId": "ID_UNICO_DEL_MENSAJE_WHATSAPP",
  "type": "text",
  "text": "Listo, ya tomo la medicina"
}
```

Tambien se acepta `mediaBase64` en lugar de `mediaUrl`. Se recomienda
`mediaUrl` para no aumentar innecesariamente el tamano del webhook.

## 4. Restricciones de archivos

- Tamano maximo: 10 MB.
- Imagenes: JPEG, PNG o WebP.
- Audio: MPEG, MP4, OGG o WebM.
- `mediaUrl` debe usar HTTPS.
- El hostname exacto de `mediaUrl` debe existir en `JELOU_MEDIA_HOSTS`.
- Si se usa `JELOU_MEDIA_TOKEN`, SincroMed lo envia como
  `Authorization: Bearer <token>` al descargar el archivo.
- La URL debe continuar disponible durante el procesamiento del webhook.

SincroMed descarga el archivo, lo guarda en el bucket privado `evidence`,
crea el registro y cambia la toma a `confirmed`.

## 5. Respuestas y reintentos

Exito:

```json
{
  "ok": true,
  "duplicate": false,
  "evidenceId": "UUID_DE_LA_EVIDENCIA",
  "doseEventId": "UUID_DE_LA_TOMA"
}
```

Mensaje ya procesado:

```json
{
  "ok": true,
  "duplicate": true,
  "evidenceId": "UUID_EXISTENTE",
  "doseEventId": "UUID_DE_LA_TOMA"
}
```

Jelou debe considerar ambos casos como exitosos. Puede reintentar errores `5xx`
con espera incremental. No debe reintentar indefinidamente errores `400`,
`401`, `404` o `409`; primero debe corregir el payload, secreto o estado.

## 6. Prueba obligatoria

Realizar una prueba real para cada tipo: foto, audio y texto. Para cada prueba:

1. Crear o seleccionar una toma pendiente en SincroMed.
2. Enviar la confirmacion desde WhatsApp.
3. Confirmar que el webhook responde HTTP `200`.
4. Abrir el historial de tomas y verificar estado `confirmed`.
5. Abrir Evidencias y comprobar foto, reproductor de audio o texto.
6. Reenviar exactamente el mismo payload y confirmar `duplicate: true`.
7. Recargar la pagina y comprobar que la evidencia continua visible.

## 7. Entrega requerida

La persona responsable debe confirmar por escrito:

- URL del webhook configurada en Jelou.
- Que `JELOU_APPS_KEY`, `JELOU_WEBHOOK_SECRET` y `JELOU_MEDIA_HOSTS` existen
  en Supabase, sin compartir sus valores.
- Si se configuro o no `JELOU_MEDIA_TOKEN`.
- Hostnames exactos autorizados para las descargas.
- Resultado HTTP y `messageId` de una prueba por foto, audio y texto.
- Confirmacion visual de que las tres evidencias aparecen en SincroMed.

Las evidencias historicas que solo guardaron el tipo `foto`, sin URL, ID del
mensaje ni archivo, no pueden recuperarse salvo que Jelou o el proveedor de
WhatsApp aun conserve el recurso original.
