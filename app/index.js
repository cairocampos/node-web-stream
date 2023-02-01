const API_URL = 'http://localhost:3000';
let counter = 0;
async function consumeAPI(signal) {
  const response = await fetch(API_URL, {
    signal
  });

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
    // .pipeTo(new WritableStream({
    //   write(chunk) {
    //     console.log(++counter, 'chunk', chunk)
    //   }
    // }))
  
  return reader;
}

function appendToHTML(element) {
  return new WritableStream({
    write({title, description, url_anime}) {
      element.innerHTML += `
        <article>
          <div class="text">
            <h3>[${++counter}] ${title}</h3>
            <p>${description.slice(0,100)}</p>
            <a href="${url_anime}" target="_blank">Conferir</a>
          </div>
        </article>
      `
    },
    abort(reason) {
      console.log('aborted***', reason)
    }
  })
}

// Essa funnção vai se certificar que caso dois chunks cheguem em uma unica 
// transmissão converta corretamente para JSON
// dado: {}\n{}
// deve
// {}
// {}
function parseNDJSON() {
  let ndjsonBuffer = ''
  return new TransformStream({
    transform(chunk, controller) {
      ndjsonBuffer += chunk;
      const items = ndjsonBuffer.split('\n');
      items.slice(0,-1)
        .forEach(item => controller.enqueue(JSON.parse(item)))

      ndjsonBuffer = items[items.length - 1];
    },
    flush(controller) {
      if(!ndjsonBuffer) return;
      controller.enqueue(JSON.parse(ndjsonBuffer));
    },
  });
}

const [
  start,
  stop,
  cards
] =  ['start', 'stop', 'cards'].map(item => document.getElementById(item))

let abortController = new AbortController();
start.addEventListener('click', async () => {
  const readable = await consumeAPI(abortController.signal);
  readable.pipeTo(appendToHTML(cards))
})

stop.addEventListener('click', function () {
  abortController.abort();
  console.log('aborting...')
  abortController = new AbortController();
});