# Imagen de respaldo de la base de Carta (05_Operacion §4): pg_dump -Fc → age → R2 con rclone.
# Pensada para correr con horario en cualquier destino (servicio cron de Railway, cron del host
# en la VM). Un arranque = un respaldo; sale con código ≠ 0 si algo falla.
# El cliente es PostgreSQL 18 porque la base de la plantilla de Railway es 18: pg_dump se niega a
# volcar un servidor más nuevo que él. Alpine 3.22 no trae el cliente 18; 3.23 sí.
FROM alpine:3.23@sha256:469c9ea410b9215eaee7976ba6c0639039b444be8e5d638f7abbada189971eb2

RUN apk add --no-cache postgresql18-client age rclone ca-certificates tzdata \
    && addgroup -S respaldo \
    && adduser -S -G respaldo -h /home/respaldo respaldo

# Si el pg_dump del PATH no es el 18, la construcción falla aquí y no en producción.
RUN pg_dump --version | grep -q 'PostgreSQL) 18\.'

COPY respaldar.sh /usr/local/bin/respaldar.sh
RUN chmod 0755 /usr/local/bin/respaldar.sh

USER respaldo
WORKDIR /home/respaldo

CMD ["/usr/local/bin/respaldar.sh"]
