import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import VideoCall from './pages/VideoCall'

function App() {

  return (
    <Routes>
      <Route path='/video-call' element={<VideoCall/>}/>
    </Routes>
  )
}

export default App
