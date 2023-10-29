import { useEffect, useState } from 'react'
import './App.css'
import { io } from 'socket.io-client'


const socket = io("http://localhost:5000")
socket.on("connect", () => {
    //console.log("connected to the server with socket id ", socket.id)
})

const colors = [
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "cyan",
  "magenta",
  "teal",
];
const initialBoardSize = 30
const initialSpeed = 90
const maxLives = 3 
const foodColor = "yellow"

function App() {
  const [boardSize, setBoardSize] = useState(initialBoardSize)
  const [cellStyles, setCellStyles] = useState({})
  const [snakeSpeed, setSnakeSpeed] = useState(initialSpeed)
  const [joined, setJoined] = useState(false)
  const [room, setRoom] = useState('')
  const [playersData, setPlayersData] = useState([])
  const [messages, setMessages] = useState([])
  const board = []
  let dynamicBoardSize = boardSize
  let snakeCells = []
  let snakeDirection = "RIGHT"
  let AISnakeDirection = "RIGHT"
  let foodGenerated = false
  let foodCell = {type: "undefined", data: "undefined"}
  let snake 
  let socketColors = []


  const snakeStartPos = [boardSize/2-1, 1]

  
  function buildBoard() {
    
    for(let row=0; row<boardSize; row++){
      for(let col=0; col<boardSize; col++){
        let cellClassName = "cell"
        let cellKey = `${row}-${col}`
        let cellStyle = cellStyles[cellKey] || { backgroundColor: 'black' }
        const cellEl = <div className={cellClassName} key={cellKey} style={cellStyle}></div>
        board.push(cellEl)
      }
    }
    
    return board
  }


  function requestFood(){
    if(!foodGenerated){
      socket.emit("generate-food", boardSize)
      socket.on("get-food-pos", receivedCellKey => {
        generateFood(receivedCellKey)
      })
      foodGenerated = true
    }
  }

  useEffect(()=>{
      requestFood()
      
      socket.on("get-initial-food-pos", receivedCellKey => {
        foodCell = receivedCellKey
        cellStyles[foodCell] = {backgroundColor: foodColor}
      })
    
      socket.on("get-updated-food-pos", receivedCellKey => {
        foodCell = receivedCellKey
        cellStyles[foodCell] = {backgroundColor: foodColor}
      })
       
  }, [])


  function generateFood(foodCellKey){
    
    //Remove previous food
    let cellStyle = { backgroundColor: 'black' }
    Object.keys(cellStyles).forEach((cellKey) => {
      if (cellStyles[cellKey].backgroundColor === foodColor) {
        cellStyles[cellKey] = cellStyle;
      }
    })

    //generate new food
    cellStyle = { backgroundColor: foodColor }
    foodCell =  foodCellKey
    cellStyles[foodCellKey] = cellStyle
  }



   class Snake {

    constructor(startposition, color) {
      this.startposition = startposition
      this.color = color
      this.snakeCells = snakeCells
      Snake.instanceCounter++
      this.type = Snake.instanceCounter
      this.isCollisionFlag = true
      this.scoreCounter = 0
      this.livesCounter = 0
      this.generateSnake(startposition, snakeCells, color)
    }

    static instanceCounter = 0
   

    //ex: startPosition = [boardSize-1, 1]
    generateSnake(startposition, snakeCells, color) {

      const cellStyle = { backgroundColor: color }
      const [row, col] = startposition
      const snakePositionShifter = this.type === 1? +1 : -1
      let startPos = `${row}-${col}`
      let startPos2 = `${row}-${col+snakePositionShifter}`
     
      setCellStyles((prevStyles) => ({
        ...prevStyles,
        [startPos] : cellStyle, 
        [startPos2] : cellStyle,
      }))
      snakeCells.push({color: socket.color, data: startPos})
      snakeCells.push({color:  socket.color, data: startPos2})
    }


    moveSnake(firstSnakeCells, secondSnakeCells = [], snakeDirection,  isAI){

      let newSnakeCells
      if(this.type === 1)
         newSnakeCells = [...firstSnakeCells, ...secondSnakeCells]
      else 
          newSnakeCells = [...secondSnakeCells, ...firstSnakeCells]

      let [headRow, headCol] = []
      if(newSnakeCells[0] )
          [headRow, headCol] = newSnakeCells[0].data.split('-').map(Number)

      if(isAI){ //handle AI
        const [foodRow, foodCol] = foodCell.split('-').map(Number)

        if (headRow > foodRow) {
          if(AISnakeDirection !== "DOWN"){
            headRow -= 1
            AISnakeDirection = "UP"
          }
          else AISnakeDirection = "RIGHT"
            
          
        } else if (headRow < foodRow) {
          if(AISnakeDirection !== "UP"){
            headRow += 1
            AISnakeDirection = "DOWN"
          }
          else AISnakeDirection = "RIGHT"
          
        } else if (headCol > foodCol) {
          if(AISnakeDirection !== "RIGHT"){
            headCol -= 1
            AISnakeDirection = "LEFT"
          }
          else AISnakeDirection = "UP"

        } else if (headCol < foodCol) {
          if(AISnakeDirection !== "LEFT"){
            headCol += 1
            AISnakeDirection = "RIGHT"
          } 
          else AISnakeDirection = "UP"
        }
      }

      else {
        if (snakeDirection === 'UP') {
          headRow -= 1;
        } else if (snakeDirection === 'DOWN') {
          headRow += 1;
        } else if (snakeDirection === 'LEFT') {
          headCol -= 1;
        } else if (snakeDirection === 'RIGHT') {
          headCol += 1;
        }
      }
     
      
      if(headRow > dynamicBoardSize-1){
        headRow = 0
      }
        
      if(headRow < 0){
        headRow = dynamicBoardSize-1
      }

      if(headCol > dynamicBoardSize-1){
        headCol = 0
      }
    
      if(headCol < 0){ 
        headCol = dynamicBoardSize-1
      }
      
      const newHead = `${headRow}-${headCol}`

      this.snakeCells = [{color : socket.color, data: newHead}, ...this.snakeCells]
      this.snakeCells.pop()
      
      const updatedStyles = { ...cellStyles }
      newSnakeCells.map((cell) => {
        if(cell.color === socket.color)
          updatedStyles[cell.data] = { backgroundColor: socket.color }
        else {             
          socketColors.map((socketColor)=> {
            if(cell.color === socketColor)
              updatedStyles[cell.data] = { backgroundColor: socketColor }
          })
        }
    })
      setCellStyles(updatedStyles)

      //if(this.isCollisionFlag)
        //isCollision()

      this.eatFood()
    }

    
    eatFood(){

      const snakeHead = this.snakeCells[0].data

      if(snakeHead === foodCell){
        console.log("eat food")
        
        //increase snake's length
        this.snakeCells = [{type: this.type, data: snakeHead}, ...this.snakeCells]

        //increase snake's speed 
        //doesnt work
        setSnakeSpeed((prevSpeed) => {
          let newSpeed = prevSpeed - 50
          if (newSpeed < 0)
            newSpeed = 50
          return newSpeed
        })
      
        //increment score
        this.scoreCounter++
        

        //widen the board
        if( this.scoreCounter % 5 === 0 ){
          setBoardSize((prevSize) => {
            dynamicBoardSize = prevSize + 1
            return dynamicBoardSize
          })
       }

        //regenerate food
        foodGenerated = false
        socket.emit("update-food", boardSize)
        socket.on("get-updated-food-pos", receivedCellKey => {
           generateFood(receivedCellKey)
        })
        foodGenerated = true

        updateGameData()
       
      }   
    }


      handleSnakeCollision(){
        this.livesCounter--
        if( this.livesCounter <= 0 )
          showGameOverMenu("Player" + this.type)
        
        else {
          if(this.type === 1)
            setFirstLives(this.livesCounter)
          else 
            setSecondLives(this.livesCounter)
        }
        
        this.isCollisionFlag = true
      }

}


function updateGameData(){
  socket.emit("get-game-data", snake.scoreCounter)    
  socket.on("recieve-game-data", receivedPlayersData => {
    setPlayersData(receivedPlayersData) 
 })
}

  function isCollision(){
    const firstSnakeHead = firstSnake.snakeCells[0].data
    const secondSnakeHead = secondSnake.snakeCells[0].data
    let newFirstSnakeCells = firstSnake.snakeCells.slice(2)
    let newSecondSnakeCells = secondSnake.snakeCells.slice(2)

    newFirstSnakeCells.forEach((cell) => {
      if(cell.data === firstSnakeHead){
        console.log("collision1")
        firstSnake.isCollisionFlag = false
        firstSnake.handleSnakeCollision()
      }

    })

    /*
    newFirstSnakeCells.forEach((cell) => {

      if(cell.data === secondSnakeHead){
        console.log("collision2")
        secondSnake.isCollisionFlag = false
        secondSnake.handleSnakeCollision()
      }
    })
*/

    newSecondSnakeCells.forEach((cell) => {
      if(cell.data === secondSnakeHead){
        console.log("collision3")
        secondSnake.isCollisionFlag = false
        secondSnake.handleSnakeCollision()
      }
    })
/*
    newSecondSnakeCells.forEach((cell) => {
      
      if(cell.data === firstSnakeHead){
        console.log("collision4")
        firstSnake.isCollisionFlag = false
        firstSnake.handleSnakeCollision()
      }
    })
*/
    /*
    if(firstSnakeHead === secondSnakeHead){
      console.log("boom5")
      firstSnake.isCollisionFlag = false
      secondSnake.isCollisionFlag = false

      if(snakeCells.length > anotherSnakeCells.length){
        //secondSnake.handleSnakeCollision()
      }
        
    
      else if(snakeCells.length < anotherSnakeCells.length){
        //firstSnake.handleSnakeCollision()
      }

      setTimeout(()=> {
        firstSnake.isCollisionFlag = true
        secondSnake.isCollisionFlag = true
      }, 1000 )
    }*/
  }


const handleKeyDown = (event) => {
  switch (event.key) {
    case 'z':
      if (snakeDirection !== 'DOWN' && snakeDirection !== 'UP') {
        snakeDirection = 'UP'
        snake.moveSnake(snake.snakeCells, [], snakeDirection,  false)
      }
      break;
    case 's':
      if (snakeDirection !== 'UP' && snakeDirection !== 'DOWN') {
        snakeDirection = 'DOWN'
        snake.moveSnake(snake.snakeCells, [], snakeDirection,  false)
      }
      break
    case 'q':
      if (snakeDirection !== 'RIGHT' && snakeDirection !== 'LEFT') {
        snakeDirection = 'LEFT'
        snake.moveSnake(snake.snakeCells, [], snakeDirection,  false)
      }
      break
    case 'd':
      if (snakeDirection !== 'LEFT' && snakeDirection !== 'RIGHT') {
        snakeDirection = 'RIGHT'
        snake.moveSnake(snake.snakeCells, [], snakeDirection,  false)
      }
      break
    default:
      // Handle other key presses if needed
      break;
  }
};


useEffect(() => {
  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [])



function showGameOverMenu(winner){
  setGameOverText(winner + " Won!")
  setGameOver(true)
}

function startGame() {
  window.location.reload()
}

let username = ""
let myRoom = ""

function handleJoin(e){
  e.preventDefault()
  username = e.target.username.value
  myRoom = e.target.room.value

  if(username === "" || myRoom === "") return
  else {
    socket.emit("join", username, myRoom, (message)=>{
      createSnake(message)
  })
    setJoined(true)
  }
  setRoom(myRoom)

  socket.emit("get-user-data", username)
}

let myMessages = []
function sendMessage(e){
  e.preventDefault()
  const message = e.target.message.value
  e.target.message.value = ""
  console.log(message)
  socket.emit("send-message", message, room)
  //setMessages(myMessages)
}

useEffect(()=> {
  socket.on("recieve-message", messages => {
    myMessages = messages
    setMessages(myMessages)
})
})
 


function createSnake(message) {

    const randomColor = getRandomColor()
    snake = new Snake(snakeStartPos, randomColor)
    console.log("snake:", snake)
    socket.color = randomColor
    socketColors.push({socket: socket.id, color: randomColor})
    socket.emit("update-colors", randomColor)
    updateGameData()
}


function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}


let otherSnakeCells = []
useEffect(()=>{
  if(snake)
     socket.emit("get-game-data", snake.scoreCounter)

  let interval = setInterval(()=>{
  if(snake){
    snake.moveSnake(snake.snakeCells, otherSnakeCells, snakeDirection, false)
    
  }
  }, snakeSpeed)

  let updateInterval = setInterval(()=>{
      if(snake){
        socket.emit("update-game", snake.snakeCells, cellStyles, room)
        socket.on("get-colors", Colors => {
          socketColors = Colors
        })
        socket.on("receive-game-update", (receivedSnakeCells, newCellStyles) => {

        otherSnakeCells = receivedSnakeCells
        const newSnakeCells = [...snake.snakeCells, ...receivedSnakeCells]
        const updatedStyles = {...cellStyles }
        newSnakeCells.map((cell) => {
            if(cell.color === socket.color)
              updatedStyles[cell.data] = { backgroundColor: socket.color }
            else {             
              socketColors.map((socketColor)=> {
                if(cell.color === socketColor)
                  updatedStyles[cell.data] = { backgroundColor: socketColor }
              })
            }
        })
         setCellStyles(updatedStyles)
      })
        
         
      }
    
  }, 70)
  return () => {
    clearInterval(interval)
    clearInterval(updateInterval)
  }
}, [snakeDirection])



  return (
     <>
      {!joined ? (
        <div className='join-room-menu'>
          <form className="join-room-form" onSubmit={handleJoin}>
            <div className='join-room-text'>Snake Adventure</div>
            <input className='input-box' placeholder='Enter a username' name='username'/>
            <input className='input-box' placeholder='Enter a room ID' name='room'/>
            <button className='btn' type='submit' >Join</button>
          </form>
        </div>
        
      ) : 
      (
        <div className="container" id="container">
           <div className="chat">
              <form onSubmit={(e) => sendMessage(e, myRoom)}> 
                  <input className='chat-box' name="message" placeholder='Say something'/>
              </form>


                <div className='message-container'>
                  {messages
                    .filter(message => {
                      const player = playersData.find(player => player.socketId === message.sender);
                      return player !== undefined 
                    })
                    .map((message, index) => {
                      const player = playersData.find(player => player.socketId === message.sender);
                     

                      return (
                        <div key={`${message.sender}-${index}`}>
                          {player.name}: {message.message}
                        </div>
                      )
                    })}
                </div>
           </div>
         

          <div className="board" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)`, gridTemplateRows: `repeat(${boardSize}, 1fr)`}}>
            {buildBoard()}
          </div>

          <div className='score-board'>
              {playersData.map((player) => (
                <div key={player.socketId} className='data'>
                  {player.name}: score: <span id="score">{player.score}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  )
}


export default App
