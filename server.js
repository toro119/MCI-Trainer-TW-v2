
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 20000,
  pingInterval: 10000
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "MCI Trainer TW v2" }));

const rooms = new Map();

const PATIENT_TEMPLATES = [
  { age:28, sex:"男", walk:false, breath:true, afterAirway:false, rr:34, pulse:false, command:false, correct:"red", note:"右大腿開放性骨折，股動脈大量出血", mechanism:"車體夾擊", signs:"皮膚濕冷、橈動脈摸不到" },
  { age:45, sex:"女", walk:true, breath:true, afterAirway:false, rr:22, pulse:true, command:true, correct:"green", note:"額頭撕裂傷及多處擦傷，可自行行走", mechanism:"車內碰撞", signs:"意識清楚、情緒焦慮" },
  { age:61, sex:"男", walk:false, breath:false, afterAirway:false, rr:0, pulse:false, command:false, correct:"black", note:"無呼吸，開放呼吸道後仍無呼吸", mechanism:"拋出車外", signs:"無反應" },
  { age:34, sex:"女", walk:false, breath:true, afterAirway:false, rr:24, pulse:true, command:true, correct:"yellow", note:"骨盆疼痛且無法站立，疑似骨盆骨折", mechanism:"車體擠壓", signs:"生命徵象暫時穩定" },
  { age:52, sex:"男", walk:false, breath:true, afterAirway:false, rr:29, pulse:false, command:true, correct:"red", note:"胸部鈍傷，疑似張力性氣胸", mechanism:"方向盤撞擊", signs:"呼吸急促、橈動脈摸不到" },
  { age:31, sex:"女", walk:false, breath:true, afterAirway:false, rr:20, pulse:true, command:true, correct:"yellow", note:"左小腿明顯變形，疑似閉鎖性骨折", mechanism:"跌落", signs:"末梢循環尚可" },
  { age:19, sex:"男", walk:true, breath:true, afterAirway:false, rr:18, pulse:true, command:true, correct:"green", note:"雙手玻璃割傷，少量出血", mechanism:"玻璃碎裂", signs:"可自行走動" },
  { age:73, sex:"男", walk:false, breath:true, afterAirway:false, rr:26, pulse:true, command:false, correct:"red", note:"頭部外傷，意識混亂，無法遵從命令", mechanism:"頭部撞擊", signs:"反應遲鈍" },
  { age:40, sex:"女", walk:false, breath:false, afterAirway:true, rr:12, pulse:true, command:false, correct:"red", note:"原無呼吸，開放呼吸道後恢復呼吸", mechanism:"吸入性嗆傷", signs:"意識不清" },
  { age:56, sex:"女", walk:false, breath:true, afterAirway:false, rr:36, pulse:true, command:true, correct:"red", note:"胸部疼痛，呼吸速率36次／分", mechanism:"胸部擠壓", signs:"呼吸窘迫" },
  { age:8, sex:"男童", walk:true, breath:true, afterAirway:false, rr:24, pulse:true, command:true, correct:"green", note:"膝部擦傷與手臂挫傷", mechanism:"座椅跌落", signs:"哭泣但可行走" },
  { age:67, sex:"女", walk:false, breath:true, afterAirway:false, rr:28, pulse:true, command:true, correct:"yellow", note:"右髖部疼痛，疑似股骨頸骨折", mechanism:"跌落地面", signs:"無法站立" },
  { age:25, sex:"男", walk:false, breath:true, afterAirway:false, rr:22, pulse:true, command:false, correct:"red", note:"腹部穿刺傷，意識逐漸下降", mechanism:"金屬物刺入", signs:"無法遵從命令" },
  { age:48, sex:"男", walk:false, breath:true, afterAirway:false, rr:30, pulse:true, command:true, correct:"yellow", note:"左前臂開放性骨折，出血已控制", mechanism:"重物砸傷", signs:"橈動脈可觸及" },
  { age:36, sex:"女", walk:true, breath:true, afterAirway:false, rr:20, pulse:true, command:true, correct:"green", note:"頸部疼痛及輕微擦傷，可自行行走", mechanism:"甩鞭傷", signs:"意識清楚" },
  { age:29, sex:"男", walk:false, breath:true, afterAirway:false, rr:32, pulse:true, command:true, correct:"red", note:"疑似吸入性灼傷，聲音沙啞", mechanism:"火災濃煙暴露", signs:"呼吸速率大於30" },
  { age:42, sex:"女", walk:false, breath:true, afterAirway:false, rr:24, pulse:false, command:true, correct:"red", note:"腹部鈍傷合併休克徵象", mechanism:"安全帶撞擊", signs:"橈動脈摸不到、皮膚蒼白" },
  { age:15, sex:"男童", walk:true, breath:true, afterAirway:false, rr:22, pulse:true, command:true, correct:"green", note:"右肩挫傷及輕微流鼻血", mechanism:"車內碰撞", signs:"可自行走動" }
];

function makePatients(count) {
  return Array.from({ length: count }, (_, index) => ({
    ...PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length],
    id: `T${String(index + 1).padStart(3, "0")}`,
    mobilityDescription: PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length].walk
      ? "聽到指示後，可自行站起並走到指定區域。"
      : (!PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length].command
          ? "對呼喊反應不佳，無法配合站立或行走指令。"
          : ((PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length].mechanism.includes("夾擊")
              || PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length].mechanism.includes("擠壓"))
              ? "下肢或身體受困，暫時無法自行站立與移動。"
              : "嘗試坐起或站立時，因疼痛或傷勢無法行走。")),
    radialPulseDescription: PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length].pulse
      ? ((PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length].signs.includes("濕冷")
          || PATIENT_TEMPLATES[index % PATIENT_TEMPLATES.length].note.includes("休克"))
          ? "橈動脈可觸及，但脈搏細弱、快速。"
          : "橈動脈規則且清楚可觸及。")
      : "雙側橈動脈觸診約5至10秒，皆無法觸及。",
    primaryResult: null,
    primaryBy: "",
    secondaryResult: null,
    secondaryBy: "",
    primaryStartedAt: null,
    primaryDurationSec: 0,
    secondaryStartedAt: null,
    secondaryDurationSec: 0,
    transported: false,
    transportAmbulance: "",
    transportHospital: "",
    lockedBy: null,
    lockedByName: ""
  }));
}

function makeScenario(type, count) {
  const map = {
    "遊覽車翻覆": {
      location: "快速道路交流道附近",
      brief: `一輛載有乘客的遊覽車疑似失控翻覆，部分乘客受困車內，另有多名傷患散落於車道及路肩。現場預估 ${count} 名傷患。`,
      hazards: "車體不穩、玻璃碎片、油料外洩、後方來車"
    },
    "工廠爆炸": {
      location: "工業區化學工廠",
      brief: `工廠內發生爆炸並伴隨局部火勢，多名員工遭爆震、灼傷與物體砸傷。現場預估 ${count} 名傷患。`,
      hazards: "二次爆炸、化學物質外洩、火勢延燒、建物坍塌"
    },
    "大型火災": {
      location: "集合住宅或商場",
      brief: `建築物發生大型火災，多名民眾因濃煙、灼傷與逃生跌落受傷。現場預估 ${count} 名傷患。`,
      hazards: "濃煙、高溫、坍塌、逃生動線壅塞"
    },
    "地震災害": {
      location: "市區建築物倒塌現場",
      brief: `強震造成建築物局部倒塌，多名民眾遭壓傷、跌落及玻璃割傷。現場預估 ${count} 名傷患。`,
      hazards: "餘震、建物不穩、瓦斯外洩、電線掉落"
    },
    "化學災害": {
      location: "槽車或化學品倉儲區",
      brief: `化學品外洩造成多人吸入、眼部刺激及皮膚暴露。現場預估 ${count} 名傷患。`,
      hazards: "有毒氣體、風向變化、污染擴散、二次暴露"
    }
  };
  return map[type] || {
    location: "事故現場",
    brief: `大量傷病患事件，現場預估 ${count} 名傷患。`,
    hazards: "危害尚待確認"
  };
}

function defaultHospitals() {
  return [
    { name:"林口長庚", capacity:{ red:3, yellow:5, green:8 } },
    { name:"部立桃園醫院", capacity:{ red:2, yellow:4, green:6 } },
    { name:"聯新國際醫院", capacity:{ red:2, yellow:4, green:6 } },
    { name:"桃園榮民總醫院", capacity:{ red:1, yellow:3, green:5 } }
  ];
}

function publicState(room) {
  return {
    roomCode: room.roomCode,
    scenario: room.scenario,
    patients: room.patients,
    resources: room.resources,
    hospitals: room.hospitals,
    transportLogs: room.transportLogs,
    exercise: room.exercise || {
      status: "waiting",
      startedAt: null,
      pausedAt: null,
      pausedTotalMs: 0,
      endedAt: null
    },
    logs: room.logs.slice(0, 150),
    members: room.members.map(({ socketId, ...member }) => member)
  };
}

function addLog(room, text) {
  room.logs.unshift({
    time: new Date().toLocaleTimeString("zh-TW", { hour12: false }),
    text
  });
}

function currentRoom(socket) {
  return rooms.get(socket.data.roomCode);
}

function broadcast(room) {
  io.to(room.roomCode).emit("state", publicState(room));
}

io.on("connection", (socket) => {
  socket.on("createRoom", (payload, callback) => {
    let roomCode;
    do {
      roomCode = String(Math.floor(100000 + Math.random() * 900000));
    } while (rooms.has(roomCode));

    const patientCount = Math.max(1, Number(payload.patientCount) || 12);
    const type = payload.scenarioType || "遊覽車翻覆";
    const room = {
      roomCode,
      scenario: {
        name: payload.scenarioName || "大量傷病患演練",
        type,
        ...makeScenario(type, patientCount)
      },
      patients: makePatients(patientCount),
      resources: [],
      hospitals: defaultHospitals(),
      transportLogs: [],
      logs: [],
      members: [],
      exercise: {
        status: "waiting",
        startedAt: null,
        pausedAt: null,
        pausedTotalMs: 0,
        endedAt: null
      }
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.name = payload.name || "教官";
    socket.data.role = "instructor";
    socket.data.roles = ["instructor"];
    room.members.push({ socketId: socket.id, name: socket.data.name, role: "instructor", roles: ["instructor"] });

    addLog(room, `${socket.data.name} 建立演練房間`);
    callback({ ok: true, state: publicState(room) });
    broadcast(room);
  });

  socket.on("joinRoom", (payload, callback) => {
    const room = rooms.get(String(payload.roomCode || ""));
    if (!room) return callback({ ok: false, message: "找不到此房間碼" });

    socket.join(room.roomCode);
    socket.data.roomCode = room.roomCode;
    socket.data.name = payload.name || "未具名";
    socket.data.roles = Array.isArray(payload.roles) && payload.roles.length
      ? [...new Set(payload.roles)]
      : [payload.role || "primary"];
    socket.data.role = socket.data.roles[0];
    room.members.push({
      socketId: socket.id,
      name: socket.data.name,
      role: socket.data.role,
      roles: socket.data.roles
    });

    addLog(room, `${socket.data.name} 以「${socket.data.roles.join("／")}」加入演練`);
    callback({ ok: true, state: publicState(room) });
    broadcast(room);
  });


  socket.on("startExercise", (_payload, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback && callback({ ok:false, message:"房間不存在" });
    room.exercise = {
      status:"running",
      startedAt:Date.now(),
      pausedAt:null,
      pausedTotalMs:0,
      endedAt:null
    };
    addLog(room, "教官開始演練");
    callback && callback({ ok:true });
    broadcast(room);
  });

  socket.on("pauseExercise", (_payload, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback && callback({ ok:false, message:"房間不存在" });
    if (!room.exercise || room.exercise.status !== "running") {
      return callback && callback({ ok:false, message:"演練目前不是進行中" });
    }
    room.exercise.status = "paused";
    room.exercise.pausedAt = Date.now();
    addLog(room, "教官暫停演練");
    callback && callback({ ok:true });
    broadcast(room);
  });

  socket.on("resumeExercise", (_payload, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback && callback({ ok:false, message:"房間不存在" });
    if (!room.exercise || room.exercise.status !== "paused") {
      return callback && callback({ ok:false, message:"演練目前不是暫停狀態" });
    }
    room.exercise.pausedTotalMs += Date.now() - room.exercise.pausedAt;
    room.exercise.pausedAt = null;
    room.exercise.status = "running";
    addLog(room, "教官繼續演練");
    callback && callback({ ok:true });
    broadcast(room);
  });

  socket.on("endExercise", (_payload, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback && callback({ ok:false, message:"房間不存在" });
    if (!room.exercise) return callback && callback({ ok:false, message:"演練尚未開始" });
    if (room.exercise.status === "paused" && room.exercise.pausedAt) {
      room.exercise.pausedTotalMs += Date.now() - room.exercise.pausedAt;
    }
    room.exercise.status = "ended";
    room.exercise.endedAt = Date.now();
    room.exercise.pausedAt = null;
    addLog(room, "教官結束演練");
    callback && callback({ ok:true });
    broadcast(room);
  });



  socket.on("updateRoles", ({ roles }, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback && callback({ ok:false, message:"房間不存在" });

    const allowed = ["commander", "primary", "secondary", "transport", "dashboard"];
    const cleaned = Array.isArray(roles)
      ? [...new Set(roles.filter((role) => allowed.includes(role)))]
      : [];

    if (!cleaned.length) {
      return callback && callback({ ok:false, message:"請至少保留一個角色" });
    }

    socket.data.roles = cleaned;
    if (!cleaned.includes(socket.data.role)) socket.data.role = cleaned[0];

    const member = room.members.find((item) => item.socketId === socket.id);
    if (member) {
      member.roles = cleaned;
      member.role = socket.data.role;
    }

    addLog(room, `${socket.data.name} 更新兼任角色：${cleaned.join("／")}`);
    callback && callback({ ok:true, roles:cleaned, role:socket.data.role });
    broadcast(room);
  });

  socket.on("switchRole", ({ role }, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback && callback({ ok:false, message:"房間不存在" });
    if (!socket.data.roles || !socket.data.roles.includes(role)) {
      return callback && callback({ ok:false, message:"你沒有此角色權限" });
    }
    socket.data.role = role;
    const member = room.members.find((item) => item.socketId === socket.id);
    if (member) member.role = role;
    addLog(room, `${socket.data.name} 切換為「${role}」`);
    callback && callback({ ok:true, role });
    broadcast(room);
  });

  socket.on("establishCommand", (payload) => {
    const room = currentRoom(socket);
    if (!room) return;
    addLog(room, `${socket.data.name} 建立現場指揮｜安全狀態：${payload.safety}`);
    if (payload.report) addLog(room, `初報：${payload.report}`);
    broadcast(room);
  });

  socket.on("dispatchAmbulances", (payload, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback({ ok: false });

    const stations = ["平鎮", "中壢", "龍岡", "大溪", "八德", "楊梅", "埔心", "幼獅"];
    let added = 0;
    let attempts = 0;

    while (added < Number(payload.count || 1) && attempts < 300) {
      attempts += 1;
      const name = stations[Math.floor(Math.random() * stations.length)] + (Math.random() < 0.5 ? "91" : "92");
      if (!room.resources.some((resource) => resource.name === name)) {
        room.resources.push({ type: "ambulance", name, status: "到達現場" });
        added += 1;
      }
    }

    addLog(room, `加派 ${added} 台救護車並立即到場`);
    callback({ ok: true, added });
    broadcast(room);
  });

  socket.on("dispatchFire", (payload, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback({ ok: false });

    const stations = ["平鎮", "中壢", "龍岡", "大溪", "八德", "楊梅", "埔心", "幼獅"];
    const specs = [
      ["11", "攻擊車", payload.fire11],
      ["16", "攻擊車", payload.fire16],
      ["61", "水庫車", payload.fire61],
      ["75", "救助器材車", payload.fire75],
      ["213", "雲梯車", payload.fire213],
      ["51", "化學車", payload.fire51]
    ];

    const summary = [];
    for (const [code, vehicleType, rawCount] of specs) {
      const count = Math.max(0, Number(rawCount) || 0);
      for (let index = 0; index < count; index += 1) {
        const baseName = stations[Math.floor(Math.random() * stations.length)] + code;
        let name = baseName;
        let suffix = 2;
        while (room.resources.some((resource) => resource.name === name)) {
          name = `${baseName}-${suffix}`;
          suffix += 1;
        }
        room.resources.push({
          type: "fire",
          name,
          status: "到達現場",
          vehicleCode: code,
          vehicleType
        });
      }
      if (count > 0) summary.push(`${code} ${vehicleType}×${count}`);
    }

    if (!summary.length) return callback({ ok: false, message: "請至少輸入一種消防車數量" });

    addLog(room, `派遣消防車：${summary.join("、")}，全部立即到場`);
    callback({ ok: true });
    broadcast(room);
  });

  socket.on("addUtility", (payload) => {
    const room = currentRoom(socket);
    if (!room) return;
    if (!room.resources.some((resource) => resource.name === payload.name)) {
      room.resources.push({ type: "utility", name: payload.name, status: "到達現場" });
    }
    addLog(room, `${payload.name} 到達現場`);
    broadcast(room);
  });

  socket.on("lockPatient", ({ patientId }, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback({ ok: false, message: "房間不存在" });

    const patient = room.patients.find((item) => item.id === patientId);
    if (!patient) return callback({ ok: false, message: "找不到傷患" });
    if (patient.lockedBy && patient.lockedBy !== socket.id) {
      return callback({ ok: false, message: "此傷患正由其他人操作" });
    }

    patient.lockedBy = socket.id;
    patient.lockedByName = socket.data.name || "其他檢傷官";
    if (socket.data.role === "primary") patient.primaryStartedAt = Date.now();
    if (socket.data.role === "secondary") patient.secondaryStartedAt = Date.now();
    callback({ ok: true });
    setImmediate(() => broadcast(room));
  });

  socket.on("submitPrimary", ({ patientId, result }, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback({ ok: false, message: "房間不存在" });

    const patient = room.patients.find((item) => item.id === patientId);
    if (!patient) return callback({ ok: false, message: "找不到傷患" });
    if (patient.primaryResult) return callback({ ok: false, message: "此傷患已完成一次檢傷" });

    patient.primaryResult = result;
    patient.primaryBy = socket.data.name;
    patient.primaryDurationSec = patient.primaryStartedAt
      ? Math.max(1, Math.round((Date.now() - patient.primaryStartedAt) / 1000))
      : 0;
    patient.lockedBy = null;
    patient.lockedByName = "";
    addLog(room, `${patient.id} 一次檢傷：${result}｜${patient.primaryDurationSec}秒`);
    callback({ ok: true });
    broadcast(room);
  });

  socket.on("submitSecondary", ({ patientId, result }, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback({ ok: false, message: "房間不存在" });

    const patient = room.patients.find((item) => item.id === patientId);
    if (!patient || !patient.primaryResult) {
      return callback({ ok: false, message: "此傷患尚未完成一次檢傷" });
    }

    patient.secondaryResult = result;
    patient.secondaryBy = socket.data.name;
    patient.secondaryDurationSec = patient.secondaryStartedAt
      ? Math.max(1, Math.round((Date.now() - patient.secondaryStartedAt) / 1000))
      : 0;
    patient.lockedBy = null;
    patient.lockedByName = "";
    addLog(room, `${patient.id} 二次檢傷：${result}｜${patient.secondaryDurationSec}秒`);
    callback({ ok: true });
    broadcast(room);
  });

  socket.on("requestMoreAmbulances", () => {
    const room = currentRoom(socket);
    if (!room) return;
    addLog(room, `${socket.data.name} 回報：現場救護車不足，請指揮官加派`);
    io.to(room.roomCode).emit("alert", {
      targetRole: "commander",
      message: "後送官回報：現場救護車不足，請加派支援。"
    });
    broadcast(room);
  });

  socket.on("transport", (payload, callback) => {
    const room = currentRoom(socket);
    if (!room) return callback({ ok: false, message: "房間不存在" });

    const patients = (payload.patientIds || [])
      .map((id) => room.patients.find((patient) => patient.id === id))
      .filter(Boolean);

    if (!patients.length || patients.length > 3) {
      return callback({ ok: false, message: "每台救護車需載送1至3人" });
    }

    const colors = patients.map((patient) => patient.secondaryResult || patient.primaryResult);
    if (colors.some((color) => !color || color === "black")) {
      return callback({ ok: false, message: "傷患尚未完成檢傷或不可後送" });
    }

    const redCount = colors.filter((color) => color === "red").length;
    const yellowCount = colors.filter((color) => color === "yellow").length;
    if (redCount > 1 || yellowCount > 1 || (redCount > 0 && yellowCount > 0)) {
      return callback({
        ok: false,
        message: "不符合載送規則：紅黃不可同車，紅票或黃票每車最多1人"
      });
    }

    const ambulance = room.resources.find(
      (resource) => resource.type === "ambulance" && resource.name === payload.ambulance
    );
    if (!ambulance || ambulance.status !== "到達現場") {
      return callback({ ok: false, message: "救護車目前不可使用" });
    }

    const hospital = room.hospitals.find((item) => item.name === payload.hospital);
    if (!hospital) return callback({ ok: false, message: "找不到醫院" });

    for (const patient of patients) {
      const color = patient.secondaryResult || patient.primaryResult;
      if ((hospital.capacity[color] || 0) <= 0) {
        return callback({ ok: false, message: `${hospital.name} 的${color}收治容量不足` });
      }
    }

    patients.forEach((patient) => {
      const color = patient.secondaryResult || patient.primaryResult;
      hospital.capacity[color] -= 1;
      patient.transported = true;
      patient.transportAmbulance = ambulance.name;
      patient.transportHospital = hospital.name;
    });

    ambulance.status = "送醫中";
    ambulance.destination = hospital.name;

    room.transportLogs.unshift({
      time: new Date().toLocaleTimeString("zh-TW", { hour12: false }),
      patientIds: patients.map((patient) => patient.id),
      ambulance: ambulance.name,
      hospital: hospital.name,
      status: "送醫中"
    });

    addLog(room, `${ambulance.name} 後送 ${patients.map((patient) => patient.id).join("、")} 至 ${hospital.name}`);
    callback({ ok: true });
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const room = currentRoom(socket);
    if (!room) return;

    room.members = room.members.filter((member) => member.socketId !== socket.id);
    room.patients.forEach((patient) => {
      if (patient.lockedBy === socket.id) { patient.lockedBy = null; patient.lockedByName = ""; }
    });

    broadcast(room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`MCI Trainer TW v2 running on port ${PORT}`);
});
