import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'; 
import { WritableStream, TransformStream } from 'node:stream/web'
import { Readable, Transform } from 'node:stream';
import csvtojson from 'csvtojson'
import { setTimeout } from 'node:timers/promises'

const PORT = 3000;
// curl -i -X OPTIONS -N localhost:3000
// curl -N localhost:3000
createServer(async (request, response) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*'
  }

  if(request.method === 'OPTIONS') {
    response.writeHead(204, headers)
    response.end()
    return;
  } 
  let items = 0
  request.once('close', () => console.log(`connecttion was closed!`, items))
  Readable.toWeb(createReadStream('./animeflv.csv'))
    // o passo a passo que cada item individual vai trafegar
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(new TransformStream({
      transform(chunk: ArrayBuffer, controller) {
        const data = JSON.parse(Buffer.from(chunk).toString());
        const mappedData = {
          title: data.title,
          description: data.description,
          url_anime: data.url_anime
        }

        // quebra de linha pois é um NDJSON
        controller.enqueue(JSON.stringify(mappedData).concat('\n'))
      }
    }))
    // pipeTo é a última etapa
    .pipeTo(new WritableStream({
      async write(chunk) {
        await setTimeout(200)
        items++;
        response.write(chunk)
      },
      // Quando terminar de ler o arquivo, esse método será executado
      close() {
        response.end()
      }
    }))
    response.writeHead(200, headers)
})
.listen(PORT)
.on('listening', () => console.log(`Server is running at ${PORT}`))