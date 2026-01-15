<script lang="ts">
  import { onMount } from 'svelte'

  let canvas: HTMLCanvasElement

  // Game state
  let ballX = 150
  let ballY = 75
  let ballVX = 2
  let ballVY = 1.5
  let paddle1Y = 50
  let paddle2Y = 50
  let score1 = 0
  let score2 = 0

  const WIDTH = 300
  const HEIGHT = 150
  const PADDLE_HEIGHT = 30
  const PADDLE_WIDTH = 6
  const BALL_SIZE = 6

  onMount(() => {
    const ctx = canvas.getContext('2d')!

    function update() {
      // Move ball
      ballX += ballVX
      ballY += ballVY

      // Ball collision with top/bottom
      if (ballY <= 0 || ballY >= HEIGHT - BALL_SIZE) {
        ballVY = -ballVY
      }

      // AI paddle movement (simple tracking with some lag)
      const paddle1Target = ballY - PADDLE_HEIGHT / 2
      const paddle2Target = ballY - PADDLE_HEIGHT / 2
      paddle1Y += (paddle1Target - paddle1Y) * 0.08
      paddle2Y += (paddle2Target - paddle2Y) * 0.06

      // Clamp paddles
      paddle1Y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, paddle1Y))
      paddle2Y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, paddle2Y))

      // Ball collision with paddles
      if (ballX <= PADDLE_WIDTH + 10 &&
          ballY + BALL_SIZE >= paddle1Y &&
          ballY <= paddle1Y + PADDLE_HEIGHT) {
        ballVX = Math.abs(ballVX) * 1.05
        ballVY += (Math.random() - 0.5) * 2
      }

      if (ballX >= WIDTH - PADDLE_WIDTH - 10 - BALL_SIZE &&
          ballY + BALL_SIZE >= paddle2Y &&
          ballY <= paddle2Y + PADDLE_HEIGHT) {
        ballVX = -Math.abs(ballVX) * 1.05
        ballVY += (Math.random() - 0.5) * 2
      }

      // Limit ball speed
      ballVX = Math.max(-6, Math.min(6, ballVX))
      ballVY = Math.max(-4, Math.min(4, ballVY))

      // Score
      if (ballX < 0) {
        score2++
        resetBall(-1)
      }
      if (ballX > WIDTH) {
        score1++
        resetBall(1)
      }
    }

    function resetBall(direction: number) {
      ballX = WIDTH / 2
      ballY = HEIGHT / 2
      ballVX = 2 * direction
      ballVY = (Math.random() - 0.5) * 3
    }

    function draw() {
      // Clear with dark bg
      ctx.fillStyle = '#0a0a12'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // Draw center line (dashed)
      ctx.strokeStyle = '#4a5568'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 8])
      ctx.beginPath()
      ctx.moveTo(WIDTH / 2, 0)
      ctx.lineTo(WIDTH / 2, HEIGHT)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw paddles with glow
      ctx.shadowColor = '#05d9e8'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#05d9e8'
      ctx.fillRect(10, paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT)

      ctx.shadowColor = '#ff2a6d'
      ctx.fillStyle = '#ff2a6d'
      ctx.fillRect(WIDTH - 10 - PADDLE_WIDTH, paddle2Y, PADDLE_WIDTH, PADDLE_HEIGHT)

      // Draw ball with glow
      ctx.shadowColor = '#f0e68c'
      ctx.shadowBlur = 15
      ctx.fillStyle = '#f0e68c'
      ctx.fillRect(ballX, ballY, BALL_SIZE, BALL_SIZE)

      ctx.shadowBlur = 0

      // Draw scores
      ctx.font = '16px "Press Start 2P"'
      ctx.fillStyle = '#05d9e8'
      ctx.fillText(score1.toString(), WIDTH / 2 - 40, 25)
      ctx.fillStyle = '#ff2a6d'
      ctx.fillText(score2.toString(), WIDTH / 2 + 30, 25)
    }

    function gameLoop() {
      update()
      draw()
      requestAnimationFrame(gameLoop)
    }

    gameLoop()
  })
</script>

<div class="pong-container">
  <canvas bind:this={canvas} width={300} height={150}></canvas>
</div>

<style>
  .pong-container {
    border: 2px solid var(--secondary);
    box-shadow:
      0 0 10px var(--secondary),
      inset 0 0 20px rgba(5, 217, 232, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  canvas {
    display: block;
    image-rendering: pixelated;
  }
</style>
