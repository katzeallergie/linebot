// 3:00 worlds edge -> storm point -> broken moon
"use strict";

const express = require("express");
const line = require("@line/bot-sdk");
const res = require("express/lib/response");
const PORT = process.env.PORT || 3000;
const request = require("request");

const config = {
  channelSecret: "2c05ab391c5128945522d9605944d99f",
  channelAccessToken:
    "i+DP6AiUz3yPt6LEM1lXC2vRVURiGatGwI35Ocx+0yhDQWIrNVTsO7ZpUjoD/04zY+D9jg81W5j+zvUFQi/Kb6KDE+9qUF0GijRUktRM9LSGMl339ctTwbWsrVtaA2n+FHpixdPMNq6vF0Ppa5EZcQdB04t89/1O/w1cDnyilFU=",
};

getRankMap();

const app = express();

app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)")); //ブラウザ確認用(無くても問題ない)
app.get("/apex", (req, res) => {
  (async () => {
    const data_origin = await getProfile("origin", "glucose121");
    const data_ps4 = await getProfile("psn", "glucose121");
    let rank;
    if (typeof data_origin.errors === "undefined") {
      rank = data_origin.data.segments[0].stats.rankScore;
    } else {
      console.log(data_ps4);
      rank = data_ps4.data.segments[0].stats.rankScore;
    }
    res.send("rank: " + rank.metadata.rankName + ", point: " + rank.value);
  })();
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
  const re = /のランク教えて$/;
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
  } else if (message === "こめのランク教えて") {
    const data = await getProfile("origin", "ramen2100");
    const rank = data.data.segments[0].stats.rankScore;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
        "こめの現在のランクは『" +
        rank.metadata.rankName +
        " (" +
        rank.value +
        "RP)』です。",
    });
  } else if (message === "こうたのランク教えて") {
    const data = await getProfile("origin", "skx4koukyou");
    const rank = data.data.segments[0].stats.rankScore;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
        "こうたの現在のランクは『" +
        rank.metadata.rankName +
        " (" +
        rank.value +
        "RP)』です。",
    });
  } else if (message === "たつひこのランク教えて") {
    const data = await getProfile("psn", "glucose121");
    const rank = data.data.segments[0].stats.rankScore;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
        "たつひこの現在のランクは『" +
        rank.metadata.rankName +
        " (" +
        rank.value +
        "RP)』です。",
    });
  } else if (re.test(message)) {
    const id = message.split("のランク教えて")[0];
    const data_origin = await getProfile("origin", id);
    const data_ps4 = await getProfile("psn", id);
    let rank;
    if (typeof data_origin.errors === "undefined") {
      rank = data_origin.data.segments[0].stats.rankScore;
    } else {
      rank = data_ps4.data.segments[0].stats.rankScore;
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
        id +
        "の現在のランクは『" +
        rank.metadata.rankName +
        " (" +
        rank.value +
        "RP)』です。",
    });
  }

  // return client.replyMessage(event.replyToken, {
  //   type: "text",
  //   text: event.message.text, //実際に返信の言葉を入れる箇所
  // });
}

function getRankMap() {
  const startDate = new Date(2023, 1, 15, 2); // TODO: ランクリセットされたら開始日を変更
  const now = new Date();
  const diff = now - startDate;
  const diffDay = Math.floor(diff / (1000 * 60 * 60 * 24));
  const mapNames = ["オリンパス", "ストームポイント", "ブロークンムーン"]; // TODO: ランクリセットされたらマップローテを変更
  const currentMapName = mapNames[diffDay % 3];
  return "現在のマップは『" + currentMapName + "』です";
}

function getRestRankDay() {
  const endDate = new Date(2023, 4, 10, 3); // TODO: ランクリセットされたら終了日を変更
  const now = new Date();
  const diff = endDate - now;
  const diffDay = Math.floor(diff / (1000 * 60 * 60 * 24));
  return "今スプリットは残り" + diffDay + "日です";
}

//const APEX_REQUEST = "https://public-api.tracker.gg/v2/apex/standard/profile/{platform}/{platformUserIdentifier}"
const API_KEY = "41431d85-7e52-4250-9747-631de1368506";

function getProfile(platform, playerId) {
  // const result = await fetch(
  //   `https://public-api.tracker.gg/v2/apex/standard/profile/${platform}/${playerId}`,
  //   { headers: { "TRN-Api-Key": API_KEY } }
  // ).then((res) => res.json);
  // console.log(result);
  // return result;

  return new Promise((resolve, reject) => {
    request.get(
      {
        uri: `https://public-api.tracker.gg/v2/apex/standard/profile/${platform}/${playerId}`,
        headers: { "TRN-Api-Key": API_KEY },
        json: true,
      },
      (err, req, res) => {
        //resolve(res.data.segments[0].stats.rankScore);
        resolve(res);
      }
    );
  });
}

process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);
