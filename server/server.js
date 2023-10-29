
const io = require("socket.io")(5000, {
    cors: {
        origin: ["http://localhost:5173"]
    }
})
let boardSize = null
let foodCellKey = null
let foodServed = false
let foodCell = null
let snakeColors = []
let snakeArrays = []
let playersData = []
let messages = []
generateFood(boardSize)

io.on("connection", socket => {
    socket.on("join", (username, room, cb) =>{
        socket.join(room)
        cb("create snake")
    })
  
    socket.on("send-message", (message, room)=> {
        messages.push({sender: socket.id, message: message})
        if(messages.length > 15)
             messages.splice(0, messages.length - 10)
        io.emit("recieve-message", messages)
    })
    

    socket.on("update-game", (snakeCells, cellStyles, room) => {
        socket.broadcast.emit("receive-game-update", snakeCells, cellStyles)
    })

    socket.on("generate-food", (boardSize) => {
        if(!foodServed){
            generateFood(boardSize)
            io.emit("get-food-pos", foodCellKey)
            foodServed = true
        }
    })
    
    io.emit("get-initial-food-pos", foodCellKey)


    socket.on("update-food", (boardSize) => {
        generateFood(boardSize)
        io.emit("get-updated-food-pos", foodCellKey)
    })

    socket.on("update-colors", color => {
        snakeColors.push(color) 
        io.emit("get-colors", snakeColors)
    })
    
    socket.on("get-user-data", (username)=>{
        playersData.push({socketId: socket.id, name: username, score: 0})
       
    })

    
    socket.on("get-game-data", (receivedScore)=>{
        const userIndex = playersData.findIndex((user)=> user.socketId === socket.id)
        if(userIndex !== -1 )
            playersData[userIndex].score = receivedScore

        io.emit("recieve-game-data", playersData)
    })

    socket.on('disconnect', () => {

        playersData = playersData.filter(player => player.socketId !== socket.id)
        

        if(playersData.length === 0)
            foodServed = false
        else 
            io.emit('update-players', playersData)

      })

    
})


function generateFood(boardSize) {
    let row = Math.floor(Math.random() * (boardSize))
    let col = Math.floor(Math.random() * (boardSize))
    foodCellKey = `${row}-${col}`
}