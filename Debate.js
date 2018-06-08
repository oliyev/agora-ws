module.exports = class Debate {

  constructor(id, user) {
    this.id = id;
    this.startStance = Math.random() >= 0.49;
    this.currentDebatingStance = this.startStance;
    this.timer = null;
    this.args = []; // id, stance, content, clappers, claps
    this.spectators = []; // userId
    this.setUserStance(user);
    this.debaterFor = null;
    this.debaterAgainst = null;
    this.roundTime = 60;
    this.debateTime = 65// (60 * 10);
    this.hasStarted = false;
    this.hasEnded = false;
    this.topic = '',
    this.stats = {
      totalClapsFor: 0,
      mostClapsFor: 0,
      mostClappedFor: '',
      totalClapsAgainst: 0,
      mostClapsAgainst: 0,
      mostClappedAgainst: '',
      winner: null
    };
  }

  get id() { return this._id; }
  set id(id) { this._id = id; }

  get startStance() { return this._startStance; }
  set startStance(startStance) { this._startStance = startStance; }

  get spectators() { return this._spectators; }
  set spectators(spectators) { this._spectators = spectators; }

  get debaterFor() { return this._debaterFor; }
  set debaterFor(debaterFor) { this._debaterFor = debaterFor; }

  get debaterAgainst() { return this._debaterAgainst; }
  set debaterAgainst(debaterAgainst) { this._debaterAgainst = debaterAgainst; }

  get currentDebatingStance() { return this._currentDebatingStance; }
  set currentDebatingStance(currentDebatingStance) { this._currentDebatingStance = currentDebatingStance; }

  get timer() { return this._timer; }
  set timer(timer) { this._timer = timer; }

  get topic() { return this._topic; }
  set topic(topic) { this._topic = topic; }

  get args() { return this._args; }
  set args(args) { this._args = args; }

  get debaterFor() { return this._debaterFor; }
  set debaterFor(debaterFor) { this._debaterFor = debaterFor; }

  get debaterAgainst() { return this._debaterAgainst; }
  set debaterAgainst(debaterAgainst) { this._debaterAgainst = debaterAgainst; }

  get roundTime() { return this._roundTime; }
  set roundTime(roundTime) { this._roundTime = roundTime; }

  get debateTime() { return this._debateTime; }
  set debateTime(debateTime) { this._debateTime = debateTime; }

  get hasStarted() { return this._hasStarted; }
  set hasStarted(hasStarted) { this._hasStarted = hasStarted; }

  get hasEnded() { return this._hasEnded; }
  set hasEnded(hasEnded) { this._hasEnded = hasEnded; }

  get winner() { return this._winner; }
  set winner(winner) { this._winner = winner; }

  get stats() { return this._stats; }
  set stats(stats) { this._stats = stats; }

  setUserStance(user) {
    if (this._debaterFor && this._debaterAgainst){
      this._spectators.push(user);
      return true;
    }
    else{
      if (user.stance !== null){
        if (user.stance)
          this._debaterFor = user
        else
          this._debaterAgainst = user
      }
      return false;
    }
  }

  calcStats() {
    this._args.forEach((arg) => {
      if (arg.stance){
        if (arg.claps > this._stats.mostClapsFor){
          this._stats.mostClapsFor = arg.claps;
          this._stats.mostClappedFor = arg.content;
        }
        this._stats.totalClapsFor += arg.claps;
      }
      else {
        if (arg.claps > this._stats.mostClapsAgainst){
          this._stats.mostClapsAgainst = arg.claps;
          this._stats.mostClappedAgainst = arg.content;
        }
        this._stats.totalClapsAgainst += arg.claps;
      }
    });

    this._stats.winner = this._stats.totalClapsFor > this._stats.totalClapsAgainst
    this._args.push({id:this._id + 'stats', stance: 'stats', content: '', stats: this._stats}) // id, stance, content, clappers, claps
  }

  toggleTimer(io) {
    if (io){
      let self = this;
      try { let timer = setInterval((io) => {

        if (self._roundTime > 0 && self._debateTime > 0){
          self._roundTime -= 1;
          self._debateTime -= 1;
          try { io.to(self._id).emit('timerChange', self); }
          catch (e) { console.log('TIMER CHANGE \n' +e); }
        }
        else if (self._roundTime === 0 && self._debateTime > 0) {
          self._roundTime = 60;
          self._currentDebatingStance = !self._currentDebatingStance;
          try { io.to(self._id).emit('endOfRound', self); }
          catch (e) { console.log('END OF ROUND \n' +e); }
        }
        else if (self._debateTime === 0) {
          console.log('end of debate');
          self._hasEnded = true;
          self._roundTime = 0;
          clearInterval(timer);
          self.calcStats();
          try { io.to(self._id).emit('endOfDebate', self); }
          catch (e) { console.log('END OF DEBATE \n' +e); }
        }
        else {
          console.log('still going');
        }
      }, 1000, io); }
      catch (e) { console.log('TOGGLE TIMER SHIT \n' + e);}

    }
  }

  stop() {
    clearInterval(this._timer);
  }

  swap() {
    this._currentDebatingStance = !this._currentDebatingStance;
    return this.currentDebatingStance;
  }
}
