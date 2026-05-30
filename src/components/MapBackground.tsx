import { useEffect, useRef } from 'react'
import { MAP_ASSETS } from '../config/nodeAssets'

interface MapBackgroundProps {
  playRoadVideo: boolean
  playbackRate?: number
  minHeight: number
}

export function MapBackground({
  playRoadVideo,
  playbackRate = MAP_ASSETS.defaultPlaybackRate,
  minHeight,
}: MapBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !playRoadVideo) return

    video.playbackRate = playbackRate
    video.currentTime = 0
    void video.play().catch(() => {})
  }, [playRoadVideo, playbackRate])

  return (
    <div className={`map-bg-layer ${playRoadVideo ? 'map-bg-layer--road-active' : ''}`} style={{ minHeight }}>
      <img
        className="map-bg-image"
        src={MAP_ASSETS.background}
        alt=""
        draggable={false}
      />
      <video
        ref={videoRef}
        className={`map-road-video ${playRoadVideo ? 'is-playing' : ''}`}
        src={MAP_ASSETS.roadGrowthVideo}
        muted
        playsInline
        preload="auto"
        poster={MAP_ASSETS.background}
      />
    </div>
  )
}
