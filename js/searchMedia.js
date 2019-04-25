const fetch = require("node-fetch");
const dotenv = require("dotenv");
dotenv.config();

const MAX_POOLS = process.env.MAX_POOLS ? parseInt(process.env.MAX_POOLS) : 1;
const CHECK_POOLS = process.env.CHECK_POOLS
  ? process.env.CHECK_POOLS.split(",").map(i => parseInt(i))
  : null;
const CHUNK_SIZE = 10;

const baseUri = "http://ddmmedia03.deseretdigital.com";
const baseHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "Client-Access-Token": process.env.MEDIA_API_KEY
};

async function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  let url = `${baseUri}/search?q=client_id:10 AND NOT pools:6 AND pools:10&limit=500&offset=0`;
  if (process.env.MEDIA_ID) {
    url = `${baseUri}/search?q=id_hash:${process.env.MEDIA_ID}`;
  }
  const resp = await fetch(url, {
    method: "GET",
    headers: baseHeaders
  });
  const results = await resp.json();
  log(`Results length: ${results.data.length} {${url}}`);
  // console.log(results.data);
  const slices = Math.ceil(results.data.length / CHUNK_SIZE);
  for (let i = 0; i < slices; i++) {
    await Promise.all(
      results.data
        .slice(i * CHUNK_SIZE, i * CHUNK_SIZE + CHUNK_SIZE)
        .map(async item => {
          if (MAX_POOLS) {
            if (item.pools.length > MAX_POOLS) {
              logItem(item, "Too many pools", item.pools.join(","));
              return;
            }
          }
          if (CHECK_POOLS) {
            if (CHECK_POOLS.indexOf(item.pools[0]) === -1) {
              logItem(item, "In the wrong pool", item.pools.join(","));
              return;
            }
          }

          logItem(item, "Triggering delete");

          // const itemInfo = await info(item);

          // console.log(itemInfo.data);

          const removedResp = await remove(item);
          logItem(item, "Deleted", JSON.stringify(removedResp));
        })
    );
    await timeout(100);
  }
  await timeout(1000);
}

async function info(item = {}) {
  const resp = await fetch(`${baseUri}/doc/${item.id}`, {
    method: "GET",
    headers: baseHeaders
  });
  return await resp.json();
}
async function remove(item = {}) {
  const resp = await fetch(`${baseUri}/doc/${item.id}`, {
    method: "DELETE",
    headers: baseHeaders
  });
  return await resp.json();
}

function log(text) {
  console.log(`[${new Date().toISOString()}] ${text}`);
}
function logItem(item = {}, text = "", ...extras) {
  log(`{id:${item.id}} {hash:${item.id_hash}} ${text} ${extras.join("; ")}`);
}

run();
