FROM openjdk:8-jdk-alpine
ARG JAR_FILE=signaling-server-0.0.1-SNAPSHOT
CMD echo ${pwd}
COPY ${JAR_FILE} /mnt/sda1/var/lib/docker/tmp/docker
CMD ["java", "-jar", "/signaling-server.jar"]