FROM node:6.14.3

COPY . /home/zw/
WORKDIR /home/zw

RUN npm i

ENV NODE_ENV=production
ENV ZIPKIN_API=http://localhost:9411

EXPOSE 8080/tcp

CMD npm run prod
