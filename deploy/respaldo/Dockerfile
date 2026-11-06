# Imagen de respaldo de la base de Carta (05_Operacion §4): pg_dump -Fc → age → R2 con rclone.
# Pensada para correr con horario en cualquier destino (servicio cron de Railway, cron del host
# en la VM). Un arranque = un respaldo; sale con código ≠ 0 si algo falla.
FROM alpine:3.22@sha256:bfe7ceb9f09ec0566c48fb93356e45a47a00be5a1dd14fa5b909e7709c66b034

RUN apk add --no-cache postgresql16-client age rclone ca-certificates tzdata \
    && addgroup -S respaldo \
    && adduser -S -G respaldo -h /home/respaldo respaldo

COPY respaldar.sh /usr/local/bin/respaldar.sh
RUN chmod 0755 /usr/local/bin/respaldar.sh

USER respaldo
WORKDIR /home/respaldo

CMD ["/usr/local/bin/respaldar.sh"]
