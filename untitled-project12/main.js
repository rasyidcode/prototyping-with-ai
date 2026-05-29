import Matter from 'matter-js'
import { BOBA_ITEMS } from './fruits.js'

const { Engine, World, Composite, Bodies, Body, Events } = Matter

const CW = 400
const CH = 700
const WT = 20
const WO = 20
const GO_Y = 70
const DROP_Y = 50
const GAME_LEFT = WO
const GAME_RIGHT = CW - WO
const GAME_BOTTOM = CH - WT
const GAME_W = GAME_RIGHT - GAME_LEFT

const canvas = document.getElementById('game-canvas')
const ctx = canvas.getContext('2d')
const scoreSpan = document.getElementById('score')
const nextSpan = document.getElementById('next-item')
const gameOverOverlay = document.getElementById('game-over-overlay')
const finalScoreSpan = document.getElementById('final-score')
const restartBtn = document.getElementById('restart-btn')

canvas.width = CW
canvas.height = CH

let engine
let world
let score = 0
let currentIndex = 0
let nextIndex = 0
let ghostBody = null
let canDrop = true
let isGameOver = false
let mergeQueue = []

function randSmall() {
  return Math.floor(Math.random() * 5)
}

function isBodyInWorld(body) {
  return Composite.allBodies(world).includes(body)
}

function initGame() {
  if (engine) {
    Events.off(engine)
  }

  engine = Engine.create({ gravity: { x: 0, y: 1.5 } })
  world = engine.world
  score = 0
  isGameOver = false
  mergeQueue = []
  canDrop = true
  ghostBody = null
  updateScore()
  gameOverOverlay.classList.add('hidden')

  const wallOpts = { isStatic: true, restitution: 0.1, friction: 0.5, label: 'wall' }

  World.add(world, [
    Bodies.rectangle(GAME_LEFT - WT / 2, CH / 2, WT, CH, wallOpts),
    Bodies.rectangle(GAME_RIGHT + WT / 2, CH / 2, WT, CH, wallOpts),
    Bodies.rectangle(CW / 2, GAME_BOTTOM + WT / 2, CW, WT, wallOpts),
  ])

  currentIndex = randSmall()
  nextIndex = randSmall()
  updateNextDisplay()
  createGhost(currentIndex)

  Events.on(engine, 'collisionStart', handleCollision)

  requestAnimationFrame(gameLoop)
}

function createGhost(index) {
  if (ghostBody) {
    try { World.remove(world, ghostBody) } catch (e) { /* ignore */ }
  }
  const item = BOBA_ITEMS[index]
  ghostBody = Bodies.circle(CW / 2, DROP_Y, item.radius, {
    isStatic: true, isSensor: true, label: 'ghost', index,
  })
  World.add(world, ghostBody)
}

function createItem(x, y, index) {
  const item = BOBA_ITEMS[index]
  const body = Bodies.circle(x, y, item.radius, {
    restitution: 0.2, friction: 0.5, frictionAir: 0.01, density: 0.001,
    label: 'item', index, birth: performance.now(),
  })
  World.add(world, body)
  return body
}

function getCanvasX(clientX) {
  const rect = canvas.getBoundingClientRect()
  return (clientX - rect.left) * (canvas.width / rect.width)
}

function clampX(x, index) {
  const r = BOBA_ITEMS[index].radius + 2
  return Math.max(GAME_LEFT + r, Math.min(GAME_RIGHT - r, x))
}

function moveGhost(x) {
  if (isGameOver || !canDrop || !ghostBody) return
  Body.setPosition(ghostBody, { x: clampX(x, currentIndex), y: DROP_Y })
}

function onMouseMove(e) {
  moveGhost(getCanvasX(e.clientX))
}

function onTouchMove(e) {
  e.preventDefault()
  if (e.touches.length) moveGhost(getCanvasX(e.touches[0].clientX))
}

function onDrop() {
  if (isGameOver || !canDrop || !ghostBody) return
  canDrop = false
  const x = ghostBody.position.x
  const y = ghostBody.position.y
  const idx = currentIndex
  try { World.remove(world, ghostBody) } catch (e) { /* ignore */ }
  ghostBody = null
  createItem(x, y, idx)
  currentIndex = nextIndex
  nextIndex = randSmall()
  updateNextDisplay()
  setTimeout(() => {
    if (!isGameOver) {
      createGhost(currentIndex)
      canDrop = true
    }
  }, 400)
}

function handleCollision(event) {
  if (isGameOver) return
  for (const pair of event.pairs) {
    const a = pair.bodyA, b = pair.bodyB
    if (a.label !== 'item' || b.label !== 'item') continue
    if (a.index !== b.index) continue
    if (a.index >= BOBA_ITEMS.length - 1) continue
    if (mergeQueue.some(m => m.a.id === a.id || m.a.id === b.id || m.b.id === a.id || m.b.id === b.id)) continue

    const sup = pair.collision.supports
    const cp = sup && sup[0]
      ? { x: sup[0].x, y: sup[0].y }
      : { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 }

    mergeQueue.push({ a, b, ni: a.index + 1, cp })
  }
}

function processMerges() {
  for (const m of mergeQueue) {
    if (!isBodyInWorld(m.a) || !isBodyInWorld(m.b)) continue
    try {
      World.remove(world, m.a)
      World.remove(world, m.b)
    } catch (e) {
      continue
    }
    createItem(m.cp.x, m.cp.y, m.ni)
    score += BOBA_ITEMS[m.ni].score
    updateScore()
  }
  mergeQueue = []
}

function checkGameOver() {
  if (isGameOver) return
  const now = performance.now()
  for (const body of Composite.allBodies(world)) {
    if (body.label === 'item' && now - (body.birth || 0) > 800) {
      const top = body.position.y - BOBA_ITEMS[body.index].radius
      if (top < GO_Y) { endGame(); return }
    }
  }
}

function endGame() {
  isGameOver = true
  canDrop = false
  if (ghostBody) {
    try { World.remove(world, ghostBody) } catch (e) { /* ignore */ }
    ghostBody = null
  }
  finalScoreSpan.textContent = score
  gameOverOverlay.classList.remove('hidden')
}

function restartGame() {
  if (ghostBody) {
    try { World.remove(world, ghostBody) } catch (e) { /* ignore */ }
    ghostBody = null
  }
  World.clear(world, false)
  Engine.clear(engine)
  mergeQueue = []
  initGame()
}

function updateScore() {
  scoreSpan.textContent = score
}

function updateNextDisplay() {
  nextSpan.textContent = `${BOBA_ITEMS[nextIndex].emoji} ${BOBA_ITEMS[nextIndex].name}`
}

function draw() {
  ctx.clearRect(0, 0, CW, CH)

  ctx.fillStyle = '#2d1b4e'
  ctx.fillRect(0, 0, CW, CH)

  ctx.fillStyle = '#1a0a2e'
  ctx.fillRect(GAME_LEFT, 0, GAME_W, GAME_BOTTOM)

  ctx.strokeStyle = 'rgba(255,80,80,0.5)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(GAME_LEFT, GO_Y)
  ctx.lineTo(GAME_RIGHT, GO_Y)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#5a3d7a'
  ctx.fillRect(0, 0, GAME_LEFT, CH)
  ctx.fillRect(GAME_RIGHT, 0, WO, CH)
  ctx.fillRect(0, GAME_BOTTOM, CW, WT)

  for (const body of Composite.allBodies(world)) {
    if (body.label === 'item') drawItem(body.position.x, body.position.y, body.index)
  }

  if (ghostBody && canDrop) {
    const gx = ghostBody.position.x
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(gx, ghostBody.position.y + BOBA_ITEMS[currentIndex].radius)
    ctx.lineTo(gx, GAME_BOTTOM)
    ctx.stroke()
    ctx.restore()

    ctx.globalAlpha = 0.55
    drawItem(gx, ghostBody.position.y, currentIndex)
    ctx.globalAlpha = 1.0
  }
}

function drawItem(x, y, index) {
  const item = BOBA_ITEMS[index]
  const r = item.radius

  ctx.beginPath()
  ctx.arc(x, y + 2, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = item.color
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fill()

  ctx.font = `${r * 1.1}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(item.emoji, x, y + 1)
}

function gameLoop() {
  if (!isGameOver) {
    processMerges()
    Engine.update(engine, 1000 / 60)
    checkGameOver()
  }
  draw()
  requestAnimationFrame(gameLoop)
}

canvas.addEventListener('mousemove', onMouseMove)
canvas.addEventListener('click', onDrop)
canvas.addEventListener('touchmove', onTouchMove, { passive: false })
canvas.addEventListener('touchend', onDrop)
restartBtn.addEventListener('click', restartGame)

initGame()
