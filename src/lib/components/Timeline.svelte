<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext } from 'svelte-clerk/client'
  import type { Id } from '../../../convex/_generated/dataModel'

  type TimelineMode = 'leaving' | 'coming'

  interface Props {
    mode: TimelineMode
    onClose: () => void
    onGameClick?: (gameId: Id<"games">) => void
  }

  let { mode, onClose, onGameClick }: Props = $props()

  const clerk = useClerkContext()

  const leavingSoon = useQuery(
    api.catalog.getLeavingSoon,
    () => mode === 'leaving' ? { user_id: clerk.user?.id, limit: 50 } : 'skip'
  )

  const comingSoon = useQuery(
    api.catalog.getComingSoon,
    () => mode === 'coming' ? { user_id: clerk.user?.id, limit: 50 } : 'skip'
  )

  let entries = $derived(mode === 'leaving' ? leavingSoon.data : comingSoon.data)

  type TimelineEntry = NonNullable<typeof entries>[number]
  type ClusterOrSingle =
    | { type: 'single'; entry: TimelineEntry; position: number }
    | { type: 'cluster'; entries: TimelineEntry[]; position: number; dateRange: string }

  // Group entries into clusters only when >3 games within 3 days
  let clusteredItems = $derived.by((): ClusterOrSingle[] => {
    if (!entries || entries.length === 0) return []

    // Sort by date first
    const sorted = [...entries].sort((a, b) => {
      const dateA = mode === 'leaving' ? a.leaving_date : a.available_date
      const dateB = mode === 'leaving' ? b.leaving_date : b.available_date
      return (dateA ?? 0) - (dateB ?? 0)
    })

    const result: ClusterOrSingle[] = []
    const clusterThresholdDays = 4 // 4-day window for clustering
    const clusterThresholdMs = clusterThresholdDays * 24 * 60 * 60 * 1000
    const minClusterSize = 4 // Only cluster when >3 games (4+)

    let currentCluster: TimelineEntry[] = []

    function flushCluster() {
      if (currentCluster.length === 0) return

      // Calculate density (games per day)
      const firstDate = mode === 'leaving' ? currentCluster[0].leaving_date : currentCluster[0].available_date
      const lastDate = mode === 'leaving'
        ? currentCluster[currentCluster.length - 1].leaving_date
        : currentCluster[currentCluster.length - 1].available_date
      const spanDays = firstDate && lastDate ? Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24)) : 1
      const density = currentCluster.length / spanDays
      const minDensity = 1.5 // At least 1.5 games per day to cluster

      if (currentCluster.length < minClusterSize || density < minDensity) {
        // Not enough games or not dense enough - add as individual singles
        for (const entry of currentCluster) {
          result.push({
            type: 'single',
            entry,
            position: getTimelinePositionFromDate(mode === 'leaving' ? entry.leaving_date : entry.available_date)
          })
        }
      } else {
        // Cluster these games
        const firstDate = mode === 'leaving' ? currentCluster[0].leaving_date : currentCluster[0].available_date
        const lastClusterDate = mode === 'leaving' ? currentCluster[currentCluster.length - 1].leaving_date : currentCluster[currentCluster.length - 1].available_date
        const avgDate = firstDate && lastClusterDate ? (firstDate + lastClusterDate) / 2 : firstDate
        result.push({
          type: 'cluster',
          entries: [...currentCluster],
          position: getTimelinePositionFromDate(avgDate),
          dateRange: formatDateRange(firstDate, lastClusterDate)
        })
      }
      currentCluster = []
    }

    for (const entry of sorted) {
      const entryDate = mode === 'leaving' ? entry.leaving_date : entry.available_date

      if (currentCluster.length === 0) {
        currentCluster.push(entry)
      } else {
        // Check against the FIRST entry in the cluster
        // This ensures the total cluster span stays within threshold
        const firstDate = mode === 'leaving'
          ? currentCluster[0].leaving_date
          : currentCluster[0].available_date

        const withinThreshold = entryDate && firstDate && Math.abs(entryDate - firstDate) <= clusterThresholdMs

        if (withinThreshold) {
          currentCluster.push(entry)
        } else {
          flushCluster()
          currentCluster = [entry]
        }
      }
    }

    // Flush remaining
    flushCluster()

    return result
  })

  // Assign rows to avoid horizontal overlap (simpler now with clusters)
  let itemRows = $derived.by(() => {
    const items = clusteredItems
    const rows: Map<number, number> = new Map() // index -> row
    const rowLastPosition: number[] = [-Infinity, -Infinity] // 2 rows is enough now
    const minGap = 12

    items.forEach((item, index) => {
      let assignedRow = 0
      for (let r = 0; r < 2; r++) {
        if (item.position - rowLastPosition[r] >= minGap) {
          assignedRow = r
          break
        }
        if (r === 1) {
          assignedRow = rowLastPosition[0] <= rowLastPosition[1] ? 0 : 1
        }
      }
      rows.set(index, assignedRow)
      rowLastPosition[assignedRow] = item.position
    })
    return rows
  })

  // Desktop minimum 1800px, scale up with item count
  // Each item needs ~250px of breathing room to avoid overlap
  let trackWidth = $derived(Math.max(1800, clusteredItems.length * 250))

  // Calculate position on timeline from date (0-100%)
  function getTimelinePositionFromDate(date: number | undefined): number {
    if (!date) return 50
    const now = Date.now()
    const diff = date - now
    const days = diff / (1000 * 60 * 60 * 24)
    return Math.max(5, Math.min(95, (days / 30) * 100))
  }

  // Calculate position on timeline (0-100%)
  function getTimelinePosition(entry: typeof entries extends (infer T)[] | undefined ? T : never): number {
    const date = mode === 'leaving' ? entry.leaving_date : entry.available_date
    return getTimelinePositionFromDate(date)
  }

  function formatDateRange(start: number | undefined, end: number | undefined): string {
    if (!start || !end) return '???'
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (startStr === endStr) return startStr
    return `${startStr} - ${endStr}`
  }

  function formatDate(timestamp: number | undefined): string {
    if (!timestamp) return '???'
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function getDaysText(timestamp: number | undefined): string {
    if (!timestamp) return '???'
    const days = Math.ceil((timestamp - Date.now()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'NOW!'
    if (days === 1) return '1 DAY'
    if (days <= 7) return `${days} DAYS`
    return `${Math.ceil(days / 7)} WEEKS`
  }

  function getHealthPercent(timestamp: number | undefined): number {
    if (!timestamp) return 50
    const days = (timestamp - Date.now()) / (1000 * 60 * 60 * 24)
    if (mode === 'leaving') {
      // Health drains as deadline approaches
      return Math.max(0, Math.min(100, (days / 30) * 100))
    } else {
      // Progress fills as release approaches
      return Math.max(0, Math.min(100, 100 - (days / 30) * 100))
    }
  }

  function isUrgent(timestamp: number | undefined): boolean {
    if (!timestamp || mode !== 'leaving') return false
    const days = (timestamp - Date.now()) / (1000 * 60 * 60 * 24)
    return days <= 3
  }

  // Handle keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll container ref
  let scrollContainer: HTMLElement | undefined = $state()

  // Drag-to-scroll state
  let isDragging = $state(false)
  let startX = $state(0)
  let scrollLeft = $state(0)

  function handleMouseDown(e: MouseEvent) {
    if (!scrollContainer) return
    isDragging = true
    startX = e.pageX - scrollContainer.offsetLeft
    scrollLeft = scrollContainer.scrollLeft
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !scrollContainer) return
    e.preventDefault()
    const x = e.pageX - scrollContainer.offsetLeft
    const walk = (x - startX) * 1.5 // Scroll speed multiplier
    scrollContainer.scrollLeft = scrollLeft - walk
  }

  function handleMouseUp() {
    isDragging = false
  }

  function handleWheel(e: WheelEvent) {
    if (!scrollContainer) return
    // Convert vertical scroll to horizontal
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      scrollContainer.scrollLeft += e.deltaY
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="timeline-overlay" onclick={onClose} role="button" tabindex="-1">
  <div class="timeline-modal" onclick={(e) => e.stopPropagation()} role="dialog">
    <header class="timeline-header">
      <h1>
        {#if mode === 'leaving'}
          GAME OVER APPROACHING...
        {:else}
          LOADING NEXT LEVEL...
        {/if}
      </h1>
      <button class="close-btn" onclick={onClose}>ESC</button>
    </header>

    <div class="timeline-hint">
      <span class="arrow">&#x25C0;</span>
      DRAG OR SCROLL
      <span class="arrow">&#x25B6;</span>
    </div>

    <div
      class="timeline-container"
      class:dragging={isDragging}
      bind:this={scrollContainer}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      onwheel={handleWheel}
    >
      <div class="timeline-track" style="width: {trackWidth}px">
        <!-- The timeline line -->
        <div class="timeline-line">
          {#if mode === 'leaving'}
            <span class="timeline-label left">GAME OVER</span>
            <span class="timeline-label right">SAFE... FOR NOW</span>
          {:else}
            <span class="timeline-label left">SOON</span>
            <span class="timeline-label right">LATER</span>
          {/if}
        </div>

        <!-- Date markers -->
        <div class="timeline-markers">
          {#if mode === 'leaving'}
            <span class="marker" style="left: 5%">TODAY</span>
            <span class="marker" style="left: 28%">1 WEEK</span>
            <span class="marker" style="left: 50%">2 WEEKS</span>
            <span class="marker" style="left: 73%">3 WEEKS</span>
            <span class="marker" style="left: 95%">1 MONTH</span>
          {:else}
            <span class="marker" style="left: 5%">NOW</span>
            <span class="marker" style="left: 28%">1 WEEK</span>
            <span class="marker" style="left: 50%">2 WEEKS</span>
            <span class="marker" style="left: 73%">3 WEEKS</span>
            <span class="marker" style="left: 95%">1 MONTH</span>
          {/if}
        </div>

        <!-- Game cards positioned along timeline -->
        {#if clusteredItems.length > 0}
          <div class="timeline-cards">
            {#each clusteredItems as item, i (i)}
              {@const row = itemRows.get(i) ?? 0}
              {@const connectorHeight = row === 0 ? 40 : 200}

              {#if item.type === 'single'}
                {@const entry = item.entry}
                {@const urgent = isUrgent(mode === 'leaving' ? entry.leaving_date : entry.available_date)}
                <div
                  class="timeline-card {urgent ? 'urgent' : ''} row-{row}"
                  style="left: {item.position}%; --stagger: {i}; --connector-height: {connectorHeight}px"
                  onclick={() => entry.game_id && onGameClick?.(entry.game_id)}
                  role="button"
                  tabindex="0"
                >
                  <div class="card-connector"></div>
                  <div class="card-content">
                    {#if entry.game?.cover_url}
                      <img src={entry.game.cover_url} alt={entry.game?.title ?? 'Game'} class="card-cover" />
                    {:else}
                      <div class="card-cover no-cover">?</div>
                    {/if}
                    <div class="card-info">
                      <h3 class="card-title">{entry.game?.title ?? 'Unknown'}</h3>
                      <div class="card-date">
                        {#if mode === 'leaving'}
                          {getDaysText(entry.leaving_date)}
                        {:else}
                          {formatDate(entry.available_date)}
                        {/if}
                      </div>
                      <div class="card-health">
                        <div
                          class="health-fill {mode}"
                          style="width: {getHealthPercent(mode === 'leaving' ? entry.leaving_date : entry.available_date)}%"
                        ></div>
                      </div>
                      <div
                        class="card-service"
                        style="background: {entry.subscription?.color ?? 'var(--secondary)'}"
                      >
                        {entry.subscription?.name ?? ''}
                      </div>
                    </div>
                  </div>
                </div>
              {:else}
                <!-- Cluster - compact list always visible -->
                <div
                  class="timeline-cluster row-{row}"
                  style="left: {item.position}%; --stagger: {i}; --connector-height: {connectorHeight}px"
                >
                  <div class="card-connector"></div>
                  <div class="cluster-card">
                    <div class="cluster-header">
                      <span class="cluster-count">{item.entries.length}</span>
                      <span class="cluster-label">GAMES</span>
                      <span class="cluster-date">{item.dateRange}</span>
                    </div>
                    <div class="cluster-list">
                      {#each item.entries as entry (entry._id)}
                        <div
                          class="cluster-item"
                          onclick={() => entry.game_id && onGameClick?.(entry.game_id)}
                          role="button"
                          tabindex="0"
                        >
                          {#if entry.game?.cover_url}
                            <img src={entry.game.cover_url} alt={entry.game?.title ?? 'Game'} class="cluster-cover" />
                          {:else}
                            <div class="cluster-cover no-cover">?</div>
                          {/if}
                          <div class="cluster-item-info">
                            <div class="cluster-item-title">{entry.game?.title ?? 'Unknown'}</div>
                            <div class="cluster-item-meta">
                              <span
                                class="cluster-item-service"
                                style="background: {entry.subscription?.color ?? 'var(--secondary)'}"
                              >
                                {entry.subscription?.name ?? ''}
                              </span>
                              <span class="cluster-item-date">
                                {#if mode === 'leaving'}
                                  {getDaysText(entry.leaving_date)}
                                {:else}
                                  {formatDate(entry.available_date)}
                                {/if}
                              </span>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="no-entries">
            {#if mode === 'leaving'}
              NO GAMES LEAVING - YOU'RE SAFE!
            {:else}
              NO NEW GAMES INCOMING...
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <footer class="timeline-footer">
      <span class="stat">
        {entries?.length ?? 0} {mode === 'leaving' ? 'GAMES AT RISK' : 'GAMES INCOMING'}
      </span>
    </footer>
  </div>
</div>

<style>
  .timeline-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .timeline-modal {
    width: 95vw;
    height: 85vh;
    background: var(--bg-dark);
    border: 3px solid var(--secondary);
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    border-bottom: 2px solid var(--secondary);
    background: var(--bg);
  }

  .timeline-header h1 {
    font-size: 14px;
    margin: 0;
    color: var(--primary);
    text-shadow: 0 0 10px var(--primary);
    animation: flicker 3s infinite;
  }

  @keyframes flicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.8; }
    94% { opacity: 1; }
    96% { opacity: 0.9; }
    97% { opacity: 1; }
  }

  .close-btn {
    font-size: 10px;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--text-dim);
    color: var(--text-dim);
  }

  .close-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .timeline-hint {
    text-align: center;
    padding: 0.5rem;
    font-size: 8px;
    color: var(--text-dim);
    background: var(--bg);
    border-bottom: 1px solid var(--secondary);
  }

  .timeline-hint .arrow {
    color: var(--secondary);
    animation: bounce 1s infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(3px); }
  }

  .timeline-hint .arrow:first-child {
    animation-direction: reverse;
  }

  .timeline-container {
    flex: 1;
    overflow-x: auto;
    overflow-y: auto;
    padding: 2rem 1rem;
    cursor: grab;
    /* Firefox scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--secondary) var(--bg-dark);
  }

  .timeline-container.dragging {
    cursor: grabbing;
    user-select: none;
  }

  /* Custom scrollbar - WebKit (Chrome, Safari, Edge) */
  .timeline-container::-webkit-scrollbar {
    height: 14px;
    background: var(--bg-dark);
  }

  .timeline-container::-webkit-scrollbar-track {
    background: var(--bg-dark);
    border: 1px solid var(--secondary);
  }

  .timeline-container::-webkit-scrollbar-thumb {
    background: var(--secondary);
    border: 2px solid var(--bg-dark);
    box-shadow: 0 0 8px var(--secondary);
  }

  .timeline-container::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
    box-shadow: 0 0 12px var(--primary);
  }

  .timeline-track {
    min-height: 450px;
    position: relative;
    padding: 60px 40px 20px 40px;
  }

  .timeline-line {
    position: absolute;
    top: 40px;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
    box-shadow: 0 0 10px var(--primary), 0 0 20px var(--secondary);
  }

  .timeline-label {
    position: absolute;
    top: -25px;
    font-size: 10px;
    color: var(--text-dim);
  }

  .timeline-label.left {
    left: 0;
    color: var(--primary);
  }

  .timeline-label.right {
    right: 0;
    color: var(--secondary);
  }

  .timeline-markers {
    position: absolute;
    top: 50px;
    left: 0;
    right: 0;
    height: 20px;
  }

  .marker {
    position: absolute;
    transform: translateX(-50%);
    font-size: 7px;
    color: var(--text-dim);
  }

  .marker::before {
    content: '|';
    display: block;
    text-align: center;
    margin-bottom: 2px;
    color: var(--secondary);
  }

  .timeline-cards {
    position: absolute;
    top: 80px;
    left: 0;
    right: 0;
    min-height: 350px;
  }

  .timeline-card,
  .timeline-cluster {
    position: absolute;
    transform: translateX(-50%);
    animation: dropIn 0.4s ease-out backwards;
    animation-delay: calc(var(--stagger) * 0.05s);
    z-index: 1;
    transition: z-index 0s;
  }

  .timeline-card:hover,
  .timeline-cluster:hover,
  .timeline-cluster.expanded {
    z-index: 100;
  }

  .timeline-card.row-0,
  .timeline-cluster.row-0 {
    top: 0;
  }

  .timeline-card.row-1,
  .timeline-cluster.row-1 {
    top: 160px;
  }

  @keyframes dropIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .card-connector {
    position: absolute;
    width: 2px;
    height: var(--connector-height, 60px);
    background: var(--secondary);
    left: 50%;
    transform: translateX(-50%);
    bottom: 100%;
    opacity: 0.6;
  }

  .timeline-card:hover .card-connector {
    opacity: 1;
    background: var(--primary);
  }

  .card-content {
    width: 120px;
    background: var(--bg);
    border: 2px solid var(--secondary);
    padding: 0.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .timeline-card:hover .card-content {
    border-color: var(--primary);
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(255, 56, 100, 0.3);
  }

  .timeline-card.urgent .card-content {
    border-color: var(--primary);
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 5px var(--primary); }
    50% { box-shadow: 0 0 20px var(--primary), 0 0 30px var(--primary); }
  }

  .card-cover {
    width: 100%;
    height: 80px;
    object-fit: cover;
    display: block;
  }

  .card-cover.no-cover {
    background: var(--bg-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 20px;
  }

  .card-info {
    padding-top: 0.5rem;
  }

  .card-title {
    font-size: 7px;
    margin: 0;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-date {
    font-size: 8px;
    color: var(--primary);
    margin: 4px 0;
  }

  .card-health {
    height: 6px;
    background: var(--bg-dark);
    margin: 4px 0;
    overflow: hidden;
  }

  .health-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .health-fill.leaving {
    background: linear-gradient(90deg, var(--primary) 0%, orange 50%, lime 100%);
  }

  .health-fill.coming {
    background: linear-gradient(90deg, var(--secondary) 0%, lime 100%);
  }

  .card-service {
    font-size: 6px;
    padding: 2px 4px;
    color: white;
    text-align: center;
    margin-top: 4px;
  }

  .no-entries {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
    color: var(--text-dim);
    text-align: center;
  }

  .timeline-footer {
    padding: 1rem 2rem;
    border-top: 2px solid var(--secondary);
    background: var(--bg);
    text-align: center;
  }

  .stat {
    font-size: 10px;
    color: var(--secondary);
  }

  /* Cluster styles - always visible compact list */
  .cluster-card {
    width: 180px;
    background: var(--bg);
    border: 2px solid var(--accent);
    transition: all 0.2s ease;
  }

  .timeline-cluster:hover .cluster-card {
    border-color: var(--primary);
    box-shadow: 0 0 15px var(--primary);
  }

  .cluster-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: var(--bg-dark);
    border-bottom: 1px solid var(--accent);
  }

  .cluster-count {
    font-size: 12px;
    color: var(--accent);
    text-shadow: 0 0 8px var(--accent);
  }

  .cluster-label {
    font-size: 6px;
    color: var(--text-dim);
  }

  .cluster-date {
    font-size: 6px;
    color: var(--secondary);
    margin-left: auto;
  }

  .cluster-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .cluster-item {
    display: flex;
    gap: 6px;
    padding: 6px;
    border-bottom: 1px solid var(--bg-dark);
    transition: all 0.15s ease;
    cursor: pointer;
  }

  .cluster-item:last-child {
    border-bottom: none;
  }

  .cluster-item:hover {
    background: var(--bg-dark);
  }

  .cluster-cover {
    width: 28px;
    height: 36px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .cluster-cover.no-cover {
    background: var(--bg-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 10px;
  }

  .cluster-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .cluster-item-title {
    font-size: 6px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .cluster-item-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
  }

  .cluster-item-date {
    font-size: 5px;
    color: var(--primary);
  }

  .cluster-item-service {
    font-size: 4px;
    padding: 1px 3px;
    color: white;
  }

  /* Scrollbar for cluster list */
  .cluster-list::-webkit-scrollbar {
    width: 6px;
  }

  .cluster-list::-webkit-scrollbar-track {
    background: var(--bg-dark);
  }

  .cluster-list::-webkit-scrollbar-thumb {
    background: var(--secondary);
  }
</style>
