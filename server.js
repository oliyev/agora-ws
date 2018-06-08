const app = require('express')();
const server = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(server);
const Debate = require('./Debate');

const PORT = process.env.PORT || 4000;

let q = 'r-409089';
let debates = [];


app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

///////////////////// HTTP REQUEST HANDLERS
app.post('/msg', function (req, res, next) {
  let msg = req.body.msg;
  let debateId = req.body.debateId;
  let stance = req.body.user.stance;
  let userId = req.body.user.id;

  let arg = {
    id: debateId + '-' + userId + Date.now(),
    stance: stance,
    content: msg,
    clappers: [],
    claps: 0
  }
  let debate = debates.find((x) => { return x.id === debateId });

  if (debate){
    // change state of debate
    debate._args.push(arg);
    debate._currentDebatingStance = !debate._currentDebatingStance;
    debate._round += 1;

    if (!debate._hasStarted){
      debate._hasStarted = true;
      io.to(debateId).emit('debateStarted', debate);
      debate.toggleTimer(io); // // TODO: A:SLFKJAL:SFKJ IF TIMER HITS 0, STOP TIMER, SEND NUDES TO CLIENT AND BINGO
    }

    if (!debate._debaterFor && stance)
      debate._debaterFor = userId;

    if (!debate._debaterAgainst && !stance)
      debate._debaterAgainst = userId;

    io.to(debateId).emit('message', debate);
  }
  else {
    console.log('no debate.');
  }

  res.json(req.body);
});

///////////////////// WEBSOCKET METHODS

io.on('connection', (socket) => {
  console.log('client connected!');

  socket.on('gotDebateId', (data) => gotDebateIdHandler(socket, data)); // is it initiated? is the user a debater? for what stance?
  socket.on('startTimer', (data) => {
    console.log('start a timer');
  });

  socket.on('clapped', (data) => onMsgClappedHandler(data)); // userId, msgId, debateId, value: true || false


})

server.listen(PORT, () => console.log('Listening on port ' + PORT));

///////////////////// DEBATE METHODS
debateTimerHandler = (debate) => {

  if (debate._roundTime > 0 && debate._debateTime > 0){
    debate._roundTime -= 1;
    debate._debateTime -= 1;
    try { io.to(debateId).emit('timerChange', debate); }
    catch (e) { console.log('TIMER CHANGE \n' +e); }
  }
  else if (debate._roundTime === 0 && debate._debateTime > 0) {
    debate._roundTime = 60;
    debate._currentDebatingStance = !debate._currentDebatingStance;
    try { io.to(debateId).emit('endOfRound', debate); }
    catch (e) { console.log('END OF ROUND \n' +e); }
  }
  else if (debate._debateTime === 0) {
    console.log('end of debate');
    debate._hasEnded = true;
    debate._roundTime = 0;
    debate.toggleTimer(null);
    debate.calcStats();
    try { io.to(debateId).emit('endOfDebate', debate); }
    catch (e) { console.log('END OF DEBATE \n' +e); }
  }
  else {
    console.log('still going');
  }
}

gotDebateIdHandler = (socket, data) => {
  let id = data.debateId;
  console.log('debate id: ' + id);

  if (id === null || id === '')
    return;

  socket.join(id);

  let debate = debates.find((x) => { return x.id === id; });
  if (debate) {
    console.log('debate found, id: ' + debate.id);
    debate._topic = data.topic
    let userStanceToSpectate = debate.setUserStance(data.user);
    io.to(id).emit('chatroomReady', {debate: debate, userStanceToSpectate: userStanceToSpectate});
  }
  else
    createDebateRoom(id, data.user);
}

createDebateRoom = (debateId, user) => {
  let debate = new Debate(debateId, user);
  debates.push(debate);
  console.log('debate created, id: ' + debateId);
  io.in(debateId).emit('debateCreated', debate);
}

onMsgClappedHandler = (data) => { // userId, msgId, debateId, value: true || false
  let debate = debates.find((x) => { return x.id === data.debateId }) || {};
  let arg = debate._args.find((x) => { return x.id === data.msgId }) || {};
  let clapperIndex = arg.clappers.indexOf(data.userId);

  if (clapperIndex !== -1){
    arg.clappers.splice(clapperIndex);
    arg.claps -= 1;
    console.log(data.userId + ' unclapped ' + data.msgId);
  }
  else{
    arg.clappers.push(data.userId);
    arg.claps += 1;
    console.log(data.msgId + ' clapped by user ' +  data.userId);
  }

  io.to(data.debateId).emit('clapped', debate);
}

///////////////////// WORKER METHODS
timerWorkerHandler = (msg) => {
  let workerId = workersId[msg.roomId];
  let worker = cluster.workers[workerId];

  switch (msg.cmd) {
    case 'startTimer':
      console.log('in START TIMER');
      break;

    case 'stopTimer':
      console.log('in STOP TIMER');
      break;

    case 'killWorker':
      console.log('in KILL WORKER');
      worker.kill();
      break;

    default:
      worker.kill();

  }
}

// --------- RIP AMQP 2018-2018 (QQ) ------- //
/*  // Consumer
  amqplib.then(function(conn) {
    let ok = conn.createChannel();
    ok = ok.then(function(ch) {
      ch.assertQueue(id);
      ch.consume(id, function(msg) {
        if (msg !== null && msg.content.toString() !== '') {
          console.log('consume msg ' + msg.content.toString());
          io.to(id).emit('message', {msg: msg.content.toString(), debate: debate});
          // io.to(id).emit('message', msg.content.toString()); // amqp kinda useless now...
          ch.ack(msg);
        }
      });
    });
    return ok;
  }).then(null, console.warn);*/


  /*  // Publisher
    amqplib.then(function(conn) {
      var ok = conn.createChannel();
      ok = ok.then(function(ch) {
        ch.assertExchange('test','fanout', {durable: false}, (err, ok) => { console.log(err);});
        ch.assertQueue(debateId);
        ch.sendToQueue(debateId, new Buffer(msg));
      });
      return ok;
    }).then(null, console.warn);*/
