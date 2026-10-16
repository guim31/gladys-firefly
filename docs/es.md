# Firefly III

Sus finanzas personales en Gladys: el saldo de sus cuentas, el estado de sus presupuestos del mes, las
facturas próximas y sus huchas, leídos de su propio [Firefly III](https://www.firefly-iii.org), el gestor de
finanzas personales autoalojado.

La integración solo lee: nunca escribe en Firefly III ni crea ningún movimiento. Habla directamente con su
Firefly III en su red, con un token de acceso personal. Sin afiliación con Firefly III.

## Lo que obtiene

- Un **dispositivo por cuenta de activo** (cuenta corriente, ahorro, tarjeta de crédito…): su saldo, en la
  divisa de la cuenta, con su historial.
- Un **dispositivo por presupuesto**: gastado, presupuestado, restante y parte consumida en el periodo del
  presupuesto (normalmente el mes).
- Un **dispositivo por factura** (suscripción): importe previsto, días hasta el próximo vencimiento y esa
  fecha.
- Un **dispositivo por hucha**: ahorrado, objetivo y progreso.
- Un **dispositivo de resumen por divisa**: patrimonio neto, gastado y ganado este mes, disponible para
  gastar, facturas pendientes.
- Un **widget del panel**: el saldo de sus cuentas y los presupuestos del mes.
- Dos **desencadenantes de escena**: una factura que vence en pocos días, un presupuesto que alcanza el 50,
  75, 90 o 100 %.
- Tres **acciones de escena**: leer los saldos, los presupuestos o las próximas facturas, en una frase para
  enviar por mensaje o hacer leer en voz alta.

## Requisitos

- Gladys Assistant 5.1 o posterior.
- Firefly III 6 o posterior (probado con la 6.7.9), accesible desde el equipo de Gladys (misma red, VPN o
  dirección pública).
- Un token de acceso personal de Firefly III.

## Configuración

### Crear un token de acceso personal

1. En Firefly III, abra **Opciones → Perfil**, pestaña **OAuth**.
2. En **Tokens de acceso personal**, haga clic en **Crear nuevo token**, dele un nombre (`Gladys`) y confirme.
3. Copie el token que aparece: Firefly III solo lo muestra una vez. Es largo, cópielo entero.

El token da acceso a toda la cuenta de su usuario: guárdelo tan en secreto como su contraseña. Revóquelo desde
la misma página para cortar el acceso.

### Ajustes

| Ajuste                             | Qué hace                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Dirección de Firefly III           | La dirección con la que abre Firefly III, p. ej. `http://192.168.1.20:8080` o `https://dinero.mi.casa` |
| Token de acceso personal           | El token creado arriba                                                                                 |
| Aceptar un certificado autofirmado | Solo para una dirección `https` cuyo certificado haya creado usted mismo                               |
| Intervalo de actualización         | 5, 10, 15 (por defecto), 30 o 60 minutos                                                               |
| Idioma de los textos               | Nombres de las funciones (al crearlas) y frases de las escenas                                         |

Guarde y haga clic en **Probar la conexión**: la respuesta indica la versión de Firefly III y cuántas cuentas,
presupuestos, facturas y huchas contiene. Después abra la pestaña **Descubrir** y añada a Gladys los
dispositivos que desee. **Solo se siguen los dispositivos añadidos**: sus estados, el widget, los
desencadenantes y las acciones solo los tienen en cuenta a ellos.

## Dispositivos

| Dispositivo | Funciones                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Cuenta      | Saldo (negativo para una tarjeta de crédito con deuda)                                           |
| Presupuesto | Gastado, Presupuestado, Restante (negativo si se supera), Presupuesto consumido (%)              |
| Factura     | Importe previsto (media del mínimo y del máximo), Días hasta el vencimiento, Próximo vencimiento |
| Hucha       | Ahorrado, Objetivo, Progreso (%)                                                                 |
| Resumen     | Patrimonio neto, Gastado este mes, Ganado este mes, Disponible para gastar, Facturas pendientes  |

Los importes en euros, dólares o libras muestran su unidad; otra divisa se añade al nombre del dispositivo
(`Ahorro (CHF)`). Solo se proponen las cuentas, presupuestos y facturas activos. Un presupuesto sin importe
para el periodo en curso solo da lo gastado este mes. El periodo de un presupuesto es el de su importe en
Firefly III (una semana, un mes…).

Para recibir un aviso cuando un saldo baje de un umbral, use el desencadenante estándar de Gladys **«Cambio de
estado del dispositivo»** sobre el **Saldo** de la cuenta, con la condición «inferior»: no hace falta un
desencadenante de la integración.

## Widget del panel

**Resumen de Firefly III** muestra las cuentas añadidas a Gladys con su saldo (en rojo si es negativo), y
después los presupuestos añadidos (8 como máximo) con lo gastado de su importe y la parte consumida: verde por
debajo del 75 %, naranja por debajo del 100 %, rojo por encima. Toque un presupuesto para ver lo que queda y
su periodo. El pie indica la hora de la última lectura.

## Desencadenantes de escena

- **Firefly III: factura próxima**: se espera una factura añadida a Gladys hoy, mañana, dentro de 2, 3 o 7
  días (a elegir). Se activa una vez por factura y vencimiento, ese día. Variables: nombre de la factura,
  importe previsto, divisa, vencimiento (AAAA-MM-DD) y una frase ya preparada.
- **Firefly III: umbral de presupuesto alcanzado**: el gasto de un presupuesto añadido a Gladys alcanza el 50,
  75, 90 o 100 % de su importe (100 %: agotado o superado). Se activa una vez por umbral y por periodo. El
  umbral ya alcanzado en la primera lectura del presupuesto es el punto de partida y no activa nada.
  Variables: nombre, gastado, presupuestado, parte consumida (%), divisa y una frase.

Lo que se ha activado se guarda en los datos de la integración: un reinicio no activa nada dos veces.

## Acciones de escena

- **Firefly III: leer los saldos**: el saldo de cada cuenta añadida, en una frase. Salidas: `text`, `count`.
- **Firefly III: leer los presupuestos**: lo que cada presupuesto añadido ha gastado de su importe. Salidas:
  `text`, `count`, `over_count` (presupuestos agotados o superados).
- **Firefly III: leer las próximas facturas**: las facturas añadidas previstas en los próximos 7, 14 o 31
  días, la más cercana primero. Salidas: `text`, `count`.

Una acción vuelve a leer Firefly III cuando la última lectura es más antigua que el intervalo de
actualización.

## Ejemplos de escenas

- **Recordatorio antes de una factura**: desencadenante «factura próxima», 3 días, sobre el alquiler; acción:
  enviar un mensaje con `{{triggerEvent.data.text}}`.
- **Presupuesto de compras casi agotado**: desencadenante «umbral de presupuesto alcanzado», 90 %, sobre el
  presupuesto de compras; acción: avisar a la familia por Telegram.
- **Resumen del lunes por la mañana**: cada lunes a las 8, acción «leer los presupuestos», y luego hacer leer
  `{{output.text}}` por el altavoz de la cocina.

## Privacidad y datos

- La integración lee Firefly III y nunca escribe en Firefly III.
- Gladys guarda el token como cualquier ajuste secreto, y nunca se escribe en los registros.
- Los registros nunca contienen un importe, un nombre de cuenta, presupuesto o factura, un IBAN ni la
  dirección de Firefly III, ni siquiera en modo debug: solo cantidades, identificadores y umbrales.
- Ningún IBAN ni número de cuenta se guarda en Gladys. Los nombres de las cuentas y presupuestos pasan a ser
  los nombres de los dispositivos, que puede cambiar.
- El volumen de datos de la integración solo guarda los desencadenantes enviados (identificadores, fechas y
  umbrales).

## Solución de problemas

| Mensaje                                          | Qué hacer                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Firefly III rechaza el token                     | El token se revocó o se copió solo en parte: cree uno nuevo                                          |
| Firefly III no responde                          | Compruebe la dirección desde el equipo de Gladys (puerto, `http`/`https`) y que Firefly III funciona |
| El certificado de Firefly III no es de confianza | Use la dirección `http` de la red local, o active «Aceptar un certificado autofirmado»               |
| Esta dirección no responde como la API           | La dirección lleva a otra página (portal de acceso, proxy): indique la del propio Firefly III        |
| Un dispositivo no tiene valor                    | Añádalo en la pestaña Descubrir: solo se siguen los dispositivos añadidos                            |

Los registros de la integración (Integraciones → Firefly III → registros) indican lo ocurrido; ajuste
`LOG_LEVEL=debug` para más detalle.

## Límites

- Solo lectura: no se puede crear ningún movimiento desde Gladys.
- Un solo Firefly III, un solo usuario (el del token).
- Las facturas atrasadas no se señalan: solo cuenta el próximo vencimiento previsto.
- Los importes de otras divisas no se convierten; el resumen tiene un dispositivo por divisa.
- Los valores siguen el intervalo de actualización: un movimiento aparece en Gladys en la lectura siguiente.
- Probada con un Firefly III 6.7.9 real en Docker, aún no en una instalación de Gladys con cuentas reales: sus
  comentarios son bienvenidos.
