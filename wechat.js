const { Wechaty } = require('wechaty')

class myBot {
  constructor(options) {
    this.socket = options.socket || null
    this.handleMessage = options.handleMessage || null
    this.handleLogin = options.handleLogin || null
    this.handleLogout = options.handleLogout || null
    this.handleScan = options.handleScan || null

    this.isSendQrcode = false
    this.qrcode = ''
    this.bot = new Wechaty() //{ profile: options.profile }
    this.bot
      .on('scan', this.onScan.bind(this))
      .on('login', this.onLogin.bind(this))
      .on('logout', this.onLogout.bind(this))
      .on('message', this.onMessage.bind(this))
      .on('error', this.onError.bind(this))
  }

  start() {
    this.bot.start().catch(e => console.error(e))
  }

  stop() {
    console.log('stop')
    return this.bot.stop()
  }

  onScan(qrcode, status) {
    const code = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      qrcode
    )}`
    this.qrcode = code
    this.socket && this.socket.emit('scan', code)
    this.handleScan(code)
  }

  onLogin(user) {
    console.log('login!')
    this.socket && this.socket.emit('loginSucceed', user)
    this.handleLogin && this.handleLogin(user)
  }

  async onLogout(res) {
    await this.stop()
    this.socket && this.socket.emit('logout')
    this.handleLogout && this.handleLogout(res)
  }

  onMessage(message) {
    const messageTo = message.to()
    if(messageTo && messageTo.payload.name === '七磅'){
      this.forwardMessage(message)
    }
    this.handleMessage && this.handleMessage(message)
  }

  onError(err) {
    console.log(err)
    this.socket && this.socket.emit('serverError', err)
    this.stop()
  }

  findAllGroup() {
    return this.bot.Room.findAll()
  }

  quit() {
    return this.bot.logout()
  }

  async findGroupSelected(groups) {
    const groupsFound = groups.map(group => this.findGroup(group))
    return Promise.all(groupsFound)
  }

  findContact(name) {
    return this.bot.Contact.find({ name })
  }

  findGroup(topic) {
    return this.bot.Room.find({ topic })
  }

  sendToContact(contact, message) {
    return contact.say(message)
  }

  sendToGroup(group, message) {
    return group.say(message)
  }

  updateSocket(socket) {
    if (this.socket) {
      this.socket = socket
    }
  }

  async forwardMessage(msg) {
    const room = await this.bot.Room.find({ topic: 'test' })
    if (room) {
      await msg.forward(room)
      console.log('forward this message to wechaty room!')
    }
  }

  async massMessage(groups, message) {
    const foundGrounps = await this.findGroupSelected(groups)
    const allMessageRequest = foundGrounps.map(group =>
      this.sendToGroup(group, message)
    )
    return Promise.all(allMessageRequest)
  }
}

module.exports = myBot
