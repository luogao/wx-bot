const { FileBox } = require('file-box')
const express = require('express')
const app = express()
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const myBot = require('./wechat')
const multer = require('multer')

// 全局微信机器人对象
const wechatBot = {}

// 全局Socket 对象
const socketObj = {}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.resolve(__dirname, path.join('.', 'uploads', '/')))
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage })

const corsOptions = {
  origin: '*'
}

app.use(cors(corsOptions))
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: false
  })
)

app.get('/', function(req, res) {
  res.send('你好')
})

app.get('/groupList', function(req, res) {
  res.send('你好')
})

app.get('/logout', function(req, res) {
  res.send('再见')
})

app.get('/massMessage', function(req, res) {
  res.send('你好')
})

app.get('/upload', function(req, res) {
  res.send('')
})

app.get('/updateSocket', function(req, res) {
  res.send('')
})

app.post('/groupList', async function(req, res) {
  const { user } = req.body
  const bot = wechatBot[user]
  if (!bot) {
    res.send('请先登录!')
    return
  }
  const groups = await bot.findAllGroup()
  const _groups = groups.map(group => {
    const { payload } = group
    return {
      id: payload.id,
      name: payload.topic
    }
  })
  const data = {
    status: 200,
    data: _groups
  }
  console.log('获取群列表成功')
  res.send(data)
})

app.post('/logout', async function(req, res) {
  const { user } = req.body
  const bot = wechatBot[user]
  if (bot) {
    await bot.quit()
    delete wechatBot[user]
    res.send({
      status: 200,
      data: '退出登录成功'
    })
  } else {
    res.send({
      status: 200,
      data: '退出登录成功'
    })
  }
})

app.post('/upload', upload.any(), function(req, res) {
  const file = req.files[0].path
  console.log('upload file')
  res.send(file)
})

app.post('/massMessage', async function(req, res) {
  const { groups, content, type, user } = req.body
  const bot = wechatBot[user]
  if (!bot) {
    res.send('请先登录!')
    return
  }
  let _message = content
  try {
    if (type === 2) {
      _message = FileBox.fromFile(content)
    }
    await bot.massMessage(groups, _message)
    console.log('message sended')
    res.send({
      msg: '发送成功'
    })
  } catch (e) {
    console.log(e)
    res.send({
      msg: '发送失败'
    })
  }
})

app.post('/updateSocket', function(req, res) {
  const { socketId, user } = req.body
  const bot = wechatBot[user]
  const currentSocket = socketObj[socketId]
  if (bot && currentSocket) {
    console.log("update bot's socket object")
    bot.updateSocket(currentSocket)
    res.send('更新成功')
    return
  }
  res.send('无此用户')
  return
})

const server = app.listen(3000, () => {
  console.log('http://localhost:3000')
})

const io = require('socket.io')(server)

io.on('connection', function(socket) {
  if (!socketObj[socket.id]) {
    socketObj[socket.id] = socket
  }
  console.log('user connected')

  socket.emit('connected')

  socket.on('disconnect', function() {
    if (socketObj[socket.id]) {
      delete socketObj[socket.id]
    }
    console.log('user disconnected')
    socket.emit('disconnected')
  })

  socket.on('login', function() {
    handleLogin(socket)
  })
})

const handleLogin = socket => {
  const bot = new myBot({
    socket,
    handleMessage: message => {},
    handleLogin: user => {
      const userName = user.payload.name
      if (!wechatBot[userName]) {
        wechatBot[userName] = bot
      }
    },
    handleLogout: () => {
      console.log('user logout')
    },
    handleScan: qrcode => {
      console.log('on scan')
    }
  })
  bot.start()
}

const saveGroup = groups => {
  const groupNameFilePath = path.resolve(
    process.cwd(),
    path.join('.', 'groups-name.json')
  )
  const data = groups.map(group => {
    const { payload } = group
    return {
      id: payload.id,
      name: payload.topic
    }
  })
  fs.writeFile(groupNameFilePath, JSON.stringify(data, null, 2), err => {
    if (err) {
      console.log(err)
    } else {
      console.log('saved')
    }
  })
}
