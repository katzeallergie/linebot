// 3:00 worlds edge -> storm point -> broken moon
"use strict";

const express = require("express");
const line = require("@line/bot-sdk");
const res = require("express/lib/response");
const PORT = process.env.PORT || 3000;

const config = {
  channelSecret: "2c05ab391c5128945522d9605944d99f",
  channelAccessToken:
    "i+DP6AiUz3yPt6LEM1lXC2vRVURiGatGwI35Ocx+0yhDQWIrNVTsO7ZpUjoD/04zY+D9jg81W5j+zvUFQi/Kb6KDE+9qUF0GijRUktRM9LSGMl339ctTwbWsrVtaA2n+FHpixdPMNq6vF0Ppa5EZcQdB04t89/1O/w1cDnyilFU=",
};

getRankMap();

const app = express();

app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)")); //ブラウザ確認用(無くても問題ない)
app.get("/apex", (req, res) => {
  const kome = getProfile("origin", "BIG_KOME_SYAR");
  res.send(kome);
});
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);

  //ここのif分はdeveloper consoleの"接続確認"用なので削除して問題ないです。
  if (
    req.body.events[0].replyToken === "00000000000000000000000000000000" &&
    req.body.events[1].replyToken === "ffffffffffffffffffffffffffffffff"
  ) {
    res.send("Hello LINE BOT!(POST)");
    console.log("疎通確認用");
    return;
  }

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const message = event.message.text;
  if (message === "ランクのマップ教えて") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: getRankMap(), //実際に返信の言葉を入れる箇所
    });
  } else if (message === "ランクあと何日") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: getRestRankDay(), //実際に返信の言葉を入れる箇所
    });
  } else if (message === "ランク") {
    const profile = await getProfile("origin", "BIG_KOME_SYAR");
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: profile,
    });
  }

  // return client.replyMessage(event.replyToken, {
  //   type: "text",
  //   text: event.message.text, //実際に返信の言葉を入れる箇所
  // });
}

function getRankMap() {
  const startDate = new Date(2023, 1, 15, 3);
  const now = new Date();
  const diff = now - startDate;
  const diffDay = Math.floor(diff / (1000 * 60 * 60 * 24));
  const mapNames = ["ワールズエッジ", "ストームポイント", "ブロークンムーン"];
  const currentMapName = mapNames[diffDay % 3];
  return "現在のマップは『" + currentMapName + "』です";
}

function getRestRankDay() {
  const endDate = new Date(2023, 3, 5, 3);
  const now = new Date();
  const diff = endDate - now;
  const diffDay = Math.floor(diff / (1000 * 60 * 60 * 24));
  return "今スプリットは残り" + diffDay + "日です";
}

//const APEX_REQUEST = "https://public-api.tracker.gg/v2/apex/standard/profile/{platform}/{platformUserIdentifier}"
const API_KEY = "41431d85-7e52-4250-9747-631de1368506";

async function getProfile(platform, playerId) {
  // const result = await fetch(
  //   `https://public-api.tracker.gg/v2/apex/standard/profile/${platform}/${playerId}`,
  //   { headers: { "TRN-Api-Key": API_KEY } }
  // ).then((res) => res.json);
  // console.log(result);
  // return result;
}

process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);
